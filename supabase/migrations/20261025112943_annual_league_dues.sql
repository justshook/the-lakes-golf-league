-- New migration after stripe_checkout. Do not replay the three installed migrations.
-- Annual dues are a purchase, not a recurring subscription or generic balance payment.
begin;
create table league_private.dues_products (
 id text primary key, name text not null, season integer unique not null,
 amount_cents bigint not null check(amount_cents between 50 and 99999999),
 currency text not null check(currency='usd'), active boolean not null default true
);
alter table league_private.dues_products enable row level security;
revoke all on league_private.dues_products from public,anon,authenticated,service_role;
insert into league_private.dues_products(id,name,season,amount_cents,currency)
 values('lakes-dues-2027','2027 Lakes League Dues',2027,18000,'usd');
alter table league_private.stripe_orders add column product_id text references league_private.dues_products(id), add column season integer;
alter table league_private.stripe_orders add constraint stripe_order_season_pair check((product_id is null)=(season is null));
alter table public.league_ledger_entries add column product_id text references league_private.dues_products(id), add column season integer;
alter table public.league_ledger_entries add constraint ledger_season_pair check((product_id is null)=(season is null));
drop index league_private.stripe_one_open_order;
create unique index stripe_one_open_balance_order on league_private.stripe_orders(player_id,livemode)
 where product_id is null and status in ('creating','open','pending');
-- One paid OR outstanding purchase per season, even after refund/dispute. Only an
-- authoritative failure/expiry releases the slot; refunds require commissioner review.
create unique index stripe_one_annual_purchase on league_private.stripe_orders(player_id,livemode,season)
 where product_id is not null and status not in ('failed','expired');

create or replace function public.league_prepare_checkout(p_user uuid,p_account text,p_live boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint; due bigint; saved league_private.stripe_orders; fingerprint text;
begin
 player:=league_private.payment_actor(p_user);
 perform pg_advisory_xact_lock(hashtextextended('league-ledger:'||player::text,0));
 select * into saved from league_private.stripe_orders where player_id=player and product_id is null and livemode=p_live and status in ('creating','open','pending') for update;
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
  select * into saved from league_private.stripe_orders where player_id=player and product_id is null and not livemode and balance_fingerprint=fingerprint and status in ('paid','partially_refunded','refunded','disputed') order by created_at desc limit 1;
  if saved.id is not null then return to_jsonb(saved); end if;
 end if;
 if (select count(*) from league_private.stripe_orders where player_id=player and created_at>now()-interval '1 hour')>=10 then raise exception 'Checkout rate limit reached.'; end if;
 insert into league_private.stripe_orders(player_id,user_id,amount_cents,livemode,account_id,balance_fingerprint,last_checkout_at)
 values(player,p_user,due,p_live,p_account,fingerprint,now()) returning * into saved;
 return to_jsonb(saved);
end $$;


create function public.league_prepare_annual_checkout(p_user uuid,p_account text,p_live boolean,p_product text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint; product league_private.dues_products; saved league_private.stripe_orders;
begin
 player:=league_private.payment_actor(p_user);
 select * into product from league_private.dues_products where id=p_product and active;
 if product.id is null then raise exception 'Annual dues product is unavailable.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('league-ledger:'||player::text,0));
 select * into saved from league_private.stripe_orders where player_id=player and livemode=p_live and season=product.season and status not in ('failed','expired') for update;
 if saved.id is not null then
  if saved.account_id<>p_account then raise exception 'Payment account changed; reconcile annual purchase.'; end if;
  if saved.status='creating' and saved.created_at<now()-interval '23 hours' then raise exception 'Checkout requires reconciliation.'; end if;
  if saved.status in ('creating','open') then
   if saved.last_checkout_at>now()-interval '3 seconds' then raise exception 'Please wait before retrying.'; end if;
   update league_private.stripe_orders set last_checkout_at=now() where id=saved.id;
  end if;
  return to_jsonb(saved)||jsonb_build_object('product_name',product.name);
 end if;
 if exists(select 1 from public.league_ledger_entries where player_id=player and provenance='manual_external' and product_id is null and type in ('charge','payment','refund') and status='posted') then raise exception 'Manual dues records require season reconciliation.'; end if;
 if (select count(*) from league_private.stripe_orders where player_id=player and created_at>now()-interval '1 hour')>=10 then raise exception 'Checkout rate limit reached.'; end if;
 insert into league_private.stripe_orders(player_id,user_id,amount_cents,currency,livemode,account_id,balance_fingerprint,last_checkout_at,product_id,season)
 values(player,p_user,product.amount_cents,product.currency,p_live,p_account,product.id,now(),product.id,product.season) returning * into saved;
 return to_jsonb(saved)||jsonb_build_object('product_name',product.name);
end $$;

create function public.league_annual_payment_history(p_user uuid,p_live boolean,p_player bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint; history jsonb; state text; product league_private.dues_products;
begin
 player:=league_private.payment_actor(p_user,p_player);
 select * into strict product from league_private.dues_products where id='lakes-dues-2027';
 history:=public.league_payment_history(p_user,p_player);
 select coalesce(jsonb_agg(item||jsonb_build_object('product_id',o.product_id,'season',o.season,'product_name',d.name) order by o.created_at desc),'[]'::jsonb)
 into history from jsonb_array_elements(history->'orders') item join league_private.stripe_orders o on o.id=(item->>'id')::uuid
 left join league_private.dues_products d on d.id=o.product_id;
 select status into state from league_private.stripe_orders where player_id=player and livemode=p_live and season=product.season order by created_at desc limit 1;
 if (state is null or state in ('failed','expired')) and exists(select 1 from public.league_ledger_entries where player_id=player and provenance='manual_external' and product_id is null and type in ('charge','payment','refund') and status='posted') then state:='review_required'; end if;
 return jsonb_build_object('orders',history,'due_cents',league_private.payment_due(player),'dues_status',coalesce(state,'unpaid'),
 'product',jsonb_build_object('id',product.id,'name',product.name,'season',product.season,'amount_cents',product.amount_cents,'currency',product.currency));
end $$;

-- Annotate only trusted provider inserts. On live settlement, atomically post the
-- season's charge AND its payment. Test checkout and abandoned sessions add no dues.
create function league_private.annotate_annual_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare o league_private.stripe_orders; payment_id text; charge_id text;
begin
 perform pg_advisory_xact_lock(hashtextextended('league-ledger:'||new.player_id::text,0));
 if new.provenance<>'stripe_verified' then
  if new.type in ('charge','payment','refund') and exists(select 1 from league_private.stripe_orders where player_id=new.player_id and livemode and product_id is not null and status in ('creating','open','pending')) then raise exception 'Reconcile the active annual Checkout before recording manual dues.'; end if;
  if new.product_id is not null or new.season is not null then raise exception 'Annual purchase fields are server controlled.'; end if;
  return new;
 end if;
 payment_id:=case when new.type='payment' then new.id when new.type='refund' then new.related_entry_id else null end;
 if payment_id is null or payment_id not like 'stripe:payment:%' then return new; end if;
 select * into o from league_private.stripe_orders where id=substring(payment_id from 16)::uuid;
 if o.product_id is null then return new; end if;
 if not o.livemode or o.player_id<>new.player_id then raise exception 'Annual purchase context mismatch.'; end if;
 new.product_id:=o.product_id; new.season:=o.season;
 if new.type='payment' then
  if new.amount_cents<>o.amount_cents then raise exception 'Annual amount mismatch.'; end if;
  charge_id:='stripe:dues:'||o.player_id::text||':'||o.season::text;
  insert into public.league_ledger_entries(id,idempotency_key,player_id,type,status,amount_cents,currency,description,occurred_at,recorded_by,provenance,product_id,season)
  values(charge_id,charge_id,o.player_id,'charge','posted',o.amount_cents,'USD',o.season::text||' annual league dues',new.occurred_at,o.user_id,'stripe_verified',o.product_id,o.season)
  on conflict(id) do nothing;
  if not exists(select 1 from public.league_ledger_entries where id=charge_id and provenance='stripe_verified' and player_id=o.player_id and type='charge' and status='posted' and amount_cents=o.amount_cents and product_id=o.product_id and season=o.season) then raise exception 'Annual ledger identity conflict.'; end if;
 end if;
 return new;
end $$;
create trigger annotate_annual_payment before insert on public.league_ledger_entries for each row execute function league_private.annotate_annual_payment();
revoke all on function league_private.annotate_annual_payment() from public,anon,authenticated,service_role;
revoke all on function public.league_prepare_annual_checkout(uuid,text,boolean,text),public.league_annual_payment_history(uuid,boolean,bigint) from public,anon,authenticated;
grant execute on function public.league_prepare_annual_checkout(uuid,text,boolean,text),public.league_annual_payment_history(uuid,boolean,bigint) to service_role;
commit;
