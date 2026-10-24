-- Reconcile the three installed migrations with CLI repair BEFORE applying this new migration.
-- No old migration is rerun. Test provider events never enter the real league ledger.
begin;
alter table public.league_ledger_entries add column provenance text not null default 'manual_external'
  check(provenance in ('manual_external','stripe_verified'));
create table league_private.stripe_orders (
 id uuid primary key default gen_random_uuid(),
 player_id bigint not null references public.players(id), user_id uuid not null references auth.users(id),
 amount_cents bigint not null check(amount_cents between 50 and 99999999), currency text not null default 'usd' check(currency='usd'),
 livemode boolean not null, account_id text not null check(account_id ~ '^acct_'),
 status text not null default 'creating' check(status in ('creating','open','pending','paid','failed','expired','partially_refunded','refunded','disputed')),
 session_id text unique, payment_intent_id text unique, receipt_url text,
 dispute_status text check(dispute_status in ('warning_needs_response','warning_under_review','warning_closed','needs_response','under_review','won','lost')), 
 refunded_cents bigint not null default 0 check(refunded_cents>=0 and refunded_cents<=amount_cents),
 balance_fingerprint text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_checkout_at timestamptz, expires_at timestamptz not null default now()+interval '1 hour'
);
create unique index stripe_one_open_order on league_private.stripe_orders(player_id,livemode)
 where status in ('creating','open','pending');
create table league_private.stripe_events (
 id text primary key, event_type text not null, object_id text not null, order_id uuid not null references league_private.stripe_orders(id),
 processed_at timestamptz not null default now()
);
create table league_private.stripe_refunds (
 id text primary key, order_id uuid not null references league_private.stripe_orders(id), amount_cents bigint not null check(amount_cents>0),
 status text not null check(status in ('pending','requires_action','succeeded','failed','canceled')), updated_at timestamptz not null default now()
);
alter table league_private.stripe_orders enable row level security;
alter table league_private.stripe_events enable row level security;
alter table league_private.stripe_refunds enable row level security;
revoke all on league_private.stripe_orders,league_private.stripe_events,league_private.stripe_refunds from public,anon,authenticated,service_role;

-- Server RPCs accept ONLY an identity verified via Auth.getUser() by the trusted server.
-- No browser role can execute them. Fresh database verification provides defense in depth.
create function league_private.payment_actor(p_user uuid,p_player bigint default null) returns bigint
language plpgsql security definer set search_path='' as $$
declare own bigint; admin boolean;
begin
 select coalesce(raw_app_meta_data->>'league_role','')='admin' into admin from auth.users where id=p_user and email_confirmed_at is not null;
 if admin is null then raise exception 'Verified account required.' using errcode='42501'; end if;
 select player_id into own from league_private.player_accounts where user_id=p_user;
 if p_player is not null and p_player is distinct from own and not admin then raise exception 'Not your account.' using errcode='42501'; end if;
 if coalesce(p_player,own) is null then raise exception 'Linked player required.' using errcode='42501'; end if;
 return coalesce(p_player,own);
end $$;
create function league_private.payment_due(p_player bigint) returns bigint language sql stable security definer set search_path='' as $$
 select greatest(0,coalesce(sum(case when type in ('charge','refund') then amount_cents when type='payment' then -amount_cents else 0 end),0))::bigint
 from public.league_ledger_entries where player_id=p_player and status='posted';
$$;

create function public.league_payment_history(p_user uuid,p_player bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint; result jsonb;
begin
 player:=league_private.payment_actor(p_user,p_player);
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'player_id',o.player_id,'amount_cents',o.amount_cents,'currency',o.currency,'status',o.status,
 'livemode',o.livemode,'dispute_status',o.dispute_status,'receipt_url',o.receipt_url,'created_at',o.created_at,'refunded_cents',o.refunded_cents,
 'refunds',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'amount_cents',r.amount_cents,'status',r.status)),'[]'::jsonb) from league_private.stripe_refunds r where r.order_id=o.id)) order by o.created_at desc),'[]'::jsonb)
 into result from league_private.stripe_orders o where o.player_id=player;
 return jsonb_build_object('orders',result,'due_cents',league_private.payment_due(player));
end $$;

create function public.league_prepare_checkout(p_user uuid,p_account text,p_live boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint; due bigint; saved league_private.stripe_orders; fingerprint text;
begin
 player:=league_private.payment_actor(p_user);
 perform pg_advisory_xact_lock(hashtextextended('league-ledger:'||player::text,0));
 select * into saved from league_private.stripe_orders where player_id=player and livemode=p_live and status in ('creating','open','pending') for update;
 if saved.id is not null then
  if saved.account_id<>p_account then raise exception 'Payment account changed; reconcile pending order.'; end if;
  -- Never create a new session on an ambiguous network failure. Same order and Stripe
  -- idempotency key are reused; after 23h require operator reconciliation (Stripe keys expire).
  if saved.status='creating' and saved.created_at<now()-interval '23 hours' then raise exception 'Checkout requires reconciliation.'; end if;
  if saved.last_checkout_at>now()-interval '3 seconds' then raise exception 'Please wait before retrying.' using errcode='P0001'; end if;
  update league_private.stripe_orders set last_checkout_at=now() where id=saved.id;
  return to_jsonb(saved);
 end if;
 due:=league_private.payment_due(player);
 if due<50 then raise exception 'No payable balance (minimum 50 cents).'; end if;
 if due>99999999 then raise exception 'Balance exceeds payment limit.'; end if;
 select md5(coalesce(string_agg(id,',' order by id),'')) into fingerprint from public.league_ledger_entries where player_id=player and status='posted' and type in ('charge','payment','refund');
 -- Test payments must not reduce real dues, nor generate endless identical paid test orders.
 if not p_live then
  select * into saved from league_private.stripe_orders where player_id=player and not livemode and balance_fingerprint=fingerprint and status in ('paid','partially_refunded','refunded','disputed') order by created_at desc limit 1;
  if saved.id is not null then return to_jsonb(saved); end if;
 end if;
 if (select count(*) from league_private.stripe_orders where player_id=player and created_at>now()-interval '1 hour')>=10 then raise exception 'Checkout rate limit reached.'; end if;
 insert into league_private.stripe_orders(player_id,user_id,amount_cents,livemode,account_id,balance_fingerprint,last_checkout_at)
 values(player,p_user,due,p_live,p_account,fingerprint,now()) returning * into saved;
 return to_jsonb(saved);
end $$;

create function public.league_attach_checkout(p_order uuid,p_session text) returns void
language plpgsql security definer set search_path='' as $$
declare saved league_private.stripe_orders;
begin
 select * into strict saved from league_private.stripe_orders where id=p_order for update;
 if p_session !~ '^cs_' then raise exception 'Invalid session.'; end if;
 if saved.session_id is not null and saved.session_id<>p_session then raise exception 'Session mismatch.'; end if;
 update league_private.stripe_orders set session_id=p_session,status=case when status='creating' then 'open' else status end,updated_at=now() where id=p_order;
end $$;

-- Returns only server-owned order identifiers for signature-verified object reconciliation.
create function public.league_find_payment_order(p_order uuid default null,p_intent text default null) returns jsonb
language sql security definer set search_path='' as $$
 select to_jsonb(o) from league_private.stripe_orders o where (p_order is not null and id=p_order) or (p_intent is not null and payment_intent_id=p_intent) limit 1;
$$;

create function public.league_apply_stripe_event(p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o league_private.stripe_orders; v_player bigint; state text:=p_data->>'status'; event_id text:=p_data->>'event_id';
 refund jsonb; old_ref league_private.stripe_refunds; total bigint; payment_id text; refund_id text; receipt text:=p_data->>'receipt_url';
begin
 select player_id into strict v_player from league_private.stripe_orders where id=(p_data->>'order_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('league-ledger:'||v_player::text,0));
 select * into strict o from league_private.stripe_orders where id=(p_data->>'order_id')::uuid for update;
 if exists(select 1 from league_private.stripe_events where id=event_id) then return jsonb_build_object('duplicate',true); end if;
 if event_id !~ '^evt_' or length(event_id)>200 then raise exception 'Invalid event.'; end if;
 if o.account_id is distinct from p_data->>'account_id' or o.livemode is distinct from (p_data->>'livemode')::boolean or
 o.amount_cents is distinct from (p_data->>'amount_cents')::bigint or o.currency is distinct from p_data->>'currency' or
 (o.session_id is not null and o.session_id is distinct from p_data->>'session_id') then raise exception 'Payment context mismatch.'; end if;
 if o.payment_intent_id is not null and o.payment_intent_id is distinct from p_data->>'payment_intent_id' then raise exception 'Payment identity mismatch.'; end if;
 if state not in ('open','pending','paid','failed','expired','disputed') then raise exception 'Unknown payment state.'; end if;
 if state in ('paid','disputed') and coalesce(p_data->>'payment_intent_id','') !~ '^pi_' then raise exception 'Missing settled payment.'; end if;
 if receipt is not null and receipt !~ '^https://pay\.stripe\.com/' then raise exception 'Invalid receipt URL.'; end if;
 payment_id:='stripe:payment:'||o.id;
 if state in ('paid','disputed') then
  if o.livemode then
   insert into public.league_ledger_entries(id,idempotency_key,player_id,type,status,amount_cents,currency,reference,description,occurred_at,recorded_by,provenance)
   values(payment_id,payment_id,o.player_id,'payment','posted',o.amount_cents,'USD',p_data->>'payment_intent_id','Stripe-confirmed league payment',now(),o.user_id,'stripe_verified') on conflict(id) do nothing;
  if not exists(select 1 from public.league_ledger_entries where id=payment_id and provenance='stripe_verified' and player_id=o.player_id and type='payment' and status='posted' and amount_cents=o.amount_cents and currency='USD' and reference=p_data->>'payment_intent_id') then raise exception 'Settlement ledger identity conflict.'; end if;
  end if;
  update league_private.stripe_orders set status=case when state='disputed' then 'disputed' when refunded_cents=amount_cents then 'refunded' when refunded_cents>0 then 'partially_refunded' else 'paid' end,
   payment_intent_id=p_data->>'payment_intent_id',session_id=p_data->>'session_id',receipt_url=coalesce(receipt,receipt_url),dispute_status=p_data->>'dispute_status',updated_at=now() where id=o.id;
 elsif o.status not in ('paid','partially_refunded','refunded','disputed','failed','expired') then
  update league_private.stripe_orders set status=state,session_id=p_data->>'session_id',payment_intent_id=coalesce(p_data->>'payment_intent_id',payment_intent_id),updated_at=now() where id=o.id;
 end if;
 if jsonb_array_length(coalesce(p_data->'refunds','[]'::jsonb))>0 and state not in ('paid','disputed') then raise exception 'Refund before settlement.'; end if;
 for refund in select value from jsonb_array_elements(coalesce(p_data->'refunds','[]'::jsonb)) loop
  if refund->>'id' !~ '^re_' or (refund->>'amount_cents')::bigint<=0 or (refund->>'amount_cents')::bigint>o.amount_cents then raise exception 'Invalid refund.'; end if;
  select * into old_ref from league_private.stripe_refunds where id=refund->>'id';
  if old_ref.id is not null and (old_ref.order_id<>o.id or old_ref.amount_cents<>(refund->>'amount_cents')::bigint) then raise exception 'Refund identity mismatch.'; end if;
  if old_ref.status in ('succeeded','failed','canceled') and refund->>'status' in ('succeeded','failed','canceled') and old_ref.status<>refund->>'status' then raise exception 'Conflicting terminal refund state requires reconciliation.'; end if;
  -- Refund terminal states cannot be overwritten by older concurrent pending snapshots.
  insert into league_private.stripe_refunds(id,order_id,amount_cents,status) values(refund->>'id',o.id,(refund->>'amount_cents')::bigint,refund->>'status')
   on conflict(id) do update set status=case when league_private.stripe_refunds.status in ('succeeded','failed','canceled') then league_private.stripe_refunds.status else excluded.status end,updated_at=now();
  if refund->>'status'='succeeded' and o.livemode then
   refund_id:='stripe:refund:'||(refund->>'id');
   insert into public.league_ledger_entries(id,idempotency_key,player_id,type,status,amount_cents,currency,reference,related_entry_id,description,occurred_at,recorded_by,provenance)
   values(refund_id,refund_id,o.player_id,'refund','posted',(refund->>'amount_cents')::bigint,'USD',refund->>'id',payment_id,'Stripe-confirmed refund',now(),o.user_id,'stripe_verified') on conflict(id) do nothing;
   if not exists(select 1 from public.league_ledger_entries where id=refund_id and provenance='stripe_verified' and player_id=o.player_id and type='refund' and status='posted' and amount_cents=(refund->>'amount_cents')::bigint and reference=refund->>'id' and related_entry_id=payment_id) then raise exception 'Refund ledger identity conflict.'; end if;
  end if;
 end loop;
 select coalesce(sum(amount_cents),0) into total from league_private.stripe_refunds where order_id=o.id and status='succeeded';
 if total>o.amount_cents then raise exception 'Refund exceeds payment.'; end if;
 update league_private.stripe_orders set refunded_cents=total,status=case when status='disputed' then status when total=amount_cents then 'refunded' when total>0 then 'partially_refunded' else status end where id=o.id;
 insert into league_private.stripe_events(id,event_type,object_id,order_id) values(event_id,p_data->>'event_type',p_data->>'object_id',o.id);
 return jsonb_build_object('processed',true);
end $$;

-- Serialize manual receipts with Checkout. Manual claims cannot forge provider evidence,
-- double-pay an in-flight balance, or manually refund a Stripe-confirmed payment.
create function league_private.guard_payment_ledger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' then raise exception 'Ledger entries are immutable.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('league-ledger:'||new.player_id::text,0));
 if new.provenance='manual_external' then
  if new.id like 'stripe:%' or new.idempotency_key like 'stripe:%' then raise exception 'Stripe identifiers are reserved for verified processing.'; end if;
  if new.type='refund' and exists(select 1 from public.league_ledger_entries where id=new.related_entry_id and provenance='stripe_verified') then raise exception 'Stripe refunds must be confirmed by Stripe.'; end if;
  if new.type in ('payment','refund') and exists(select 1 from league_private.stripe_orders where player_id=new.player_id and livemode and status in ('creating','open','pending')) then raise exception 'Reconcile the active Stripe checkout before recording manual money.'; end if;
 end if;
 return new;
end $$;
create trigger guard_payment_ledger before insert or update or delete on public.league_ledger_entries for each row execute function league_private.guard_payment_ledger();

revoke all on function league_private.payment_actor(uuid,bigint),league_private.payment_due(bigint),league_private.guard_payment_ledger() from public,anon,authenticated,service_role;
revoke all on function public.league_payment_history(uuid,bigint),public.league_prepare_checkout(uuid,text,boolean),public.league_attach_checkout(uuid,text),public.league_find_payment_order(uuid,text),public.league_apply_stripe_event(jsonb) from public,anon,authenticated;
grant execute on function public.league_payment_history(uuid,bigint),public.league_prepare_checkout(uuid,text,boolean),public.league_attach_checkout(uuid,text),public.league_find_payment_order(uuid,text),public.league_apply_stripe_event(jsonb) to service_role;
comment on table league_private.stripe_orders is 'Server-only hosted Checkout orders. Test orders never settle real league ledger entries.';
commit;
