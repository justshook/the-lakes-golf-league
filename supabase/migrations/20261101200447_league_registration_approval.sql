-- Additive registration workflow. Existing player IDs and historical records are untouched.
begin;
create table league_private.registrations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id),
 email text not null unique check(email=lower(btrim(email))),
 first_name text not null check(length(first_name) between 1 and 80),
 last_name text not null check(length(last_name) between 1 and 80),
 phone text not null, handicap_id text not null check(length(handicap_id) between 1 and 40),
 handicap_index numeric not null check(handicap_index between -10 and 54),
 availability jsonb not null, membership_type text not null check(membership_type in ('full_time','substitute')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 fee_cents integer not null check(fee_cents in (0,18000)), player_id bigint unique references public.players(id),
 created_at timestamptz not null default now(), decided_at timestamptz, decided_by uuid references auth.users(id),
 check(fee_cents=case when membership_type='full_time' then 18000 else 0 end),
 check((status='pending' and player_id is null and decided_at is null and decided_by is null) or
       (status='approved' and player_id is not null and decided_at is not null and decided_by is not null) or
       (status='rejected' and player_id is null and decided_at is not null and decided_by is not null))
);
create table league_private.registration_notifications (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references league_private.registrations(id),
 kind text not null check(kind in ('new_application','application_approved','application_rejected')),
 recipient_user_id uuid not null references auth.users(id),
 status text not null default 'queued' check(status in ('queued','sending','sent','failed','unknown','cancelled')),
 attempts integer not null default 0, lease uuid, started_at timestamptz, sent_at timestamptz,
 next_attempt_at timestamptz not null default now(),
 unique(application_id,kind,recipient_user_id)
);
alter table league_private.registrations enable row level security;
alter table league_private.registration_notifications enable row level security;
revoke all on league_private.registrations,league_private.registration_notifications from public,anon,authenticated,service_role;
-- The legacy primary key has no default or identity. Allocate only new records.
lock table public.players in share row exclusive mode;
create sequence league_private.registration_player_ids as integer;
select setval('league_private.registration_player_ids',greatest(coalesce((select max(id) from public.players),0)+1,1),false);
revoke all on sequence league_private.registration_player_ids from public,anon,authenticated,service_role;

create function league_private.registration_actor(p_user uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare email_address text;
begin
 select lower(btrim(email)) into email_address from auth.users where id=p_user and email_confirmed_at is not null;
 if email_address is null then raise exception 'Verified account required.' using errcode='42501'; end if;
 return email_address;
end $$;
create function league_private.registration_admin(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and raw_app_meta_data->>'league_role'='admin');
$$;
create function league_private.registration_delivery(p_application uuid) returns text
language sql stable security definer set search_path='' as $$
 select case min(case status when 'unknown' then 0 when 'failed' then 1 when 'queued' then 2 when 'sending' then 2 when 'sent' then 3 else 4 end)
 when 0 then 'unknown' when 1 then 'failed' when 2 then 'queued' when 3 then 'sent' else 'none' end
 from league_private.registration_notifications where application_id=p_application;
$$;
revoke all on function league_private.registration_delivery(uuid) from public,anon,authenticated;
create function league_private.registration_state(p_user uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare own league_private.registrations; linked bigint; member text; admin boolean;
begin
 perform league_private.registration_actor(p_user);
 admin:=league_private.registration_admin(p_user);
 select * into own from league_private.registrations where user_id=p_user;
 select a.player_id,p.type into linked,member from league_private.player_accounts a join public.players p on p.id=a.player_id where a.user_id=p_user;
 return jsonb_build_object('application',case when own.id is null then null else (to_jsonb(own)-'user_id'-'decided_by')||jsonb_build_object('notification_status',league_private.registration_delivery(own.id)) end,
 'registration_paid',exists(select 1 from league_private.stripe_orders o where o.player_id=own.player_id and o.livemode and o.season=2027 and o.status='paid' and o.refunded_cents=0),'is_admin',admin,'player_id',linked,'membership_type',case when member='full-time' then 'full_time' else member end,
 'applications',case when admin then coalesce((select jsonb_agg((to_jsonb(r)-'user_id'-'decided_by')||jsonb_build_object('notification_status',league_private.registration_delivery(r.id)) order by created_at) from league_private.registrations r),'[]'::jsonb) else '[]'::jsonb end,
 'notifications',(select jsonb_build_object('queued',count(*)filter(where n.status in ('queued','sending')),
 'failed',count(*)filter(where n.status='failed'),'unknown',count(*)filter(where n.status='unknown'),
 'sent',count(*)filter(where n.status='sent')) from league_private.registration_notifications n
 join league_private.registrations r on r.id=n.application_id where admin or r.user_id=p_user));
end $$;
create function league_private.submit_registration(p_user uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare email_address text; linked bigint; matches integer; matched bigint; saved league_private.registrations;
 first_text text:=btrim(p_data->>'first_name'); last_text text:=btrim(p_data->>'last_name');
 phone_text text:=btrim(p_data->>'phone'); id_text text:=btrim(p_data->>'handicap_id');
 index_number numeric; member text:=p_data->>'membership_type'; times jsonb:=p_data->'availability';
begin
 email_address:=league_private.registration_actor(p_user);
 perform pg_advisory_xact_lock(hashtextextended('league-account:'||p_user::text,0));
 perform pg_advisory_xact_lock(hashtextextended('league-registration-email:'||email_address,0));
 select player_id into linked from league_private.player_accounts where user_id=p_user;
 if linked is null then
  select count(*),min(id) into matches,matched from public.players where lower(btrim(email))=email_address;
  if matches>1 then raise exception 'Roster email requires commissioner review.' using errcode='22023'; end if;
  if matches=1 then
   insert into league_private.player_accounts(user_id,player_id) values(p_user,matched) on conflict do nothing;
   select player_id into linked from league_private.player_accounts where user_id=p_user;
   if linked is null then raise exception 'Player link requires commissioner review.' using errcode='42501'; end if;
  end if;
 end if;
 if linked is not null then return jsonb_build_object('existing_player',true,'player_id',linked); end if;
 select * into saved from league_private.registrations where user_id=p_user;
 if saved.id is not null then
  if saved.email<>email_address then raise exception 'Application email requires commissioner review.' using errcode='22023'; end if;
  return jsonb_build_object('application',to_jsonb(saved)-'user_id'-'decided_by');
 end if;
 if jsonb_typeof(p_data)<>'object' or exists(select 1 from jsonb_object_keys(p_data) k where k not in
 ('first_name','last_name','phone','handicap_id','handicap_index','availability','membership_type')) then raise exception 'Invalid registration fields.' using errcode='22023'; end if;
 if first_text is null or length(first_text) not between 1 and 80 or last_text is null or length(last_text) not between 1 and 80
 or phone_text is null or phone_text !~ '^\+?[0-9 ().-]+$' or length(phone_text)>40 or length(regexp_replace(phone_text,'[^0-9]','','g')) not between 7 and 15
 or id_text is null or length(id_text) not between 1 and 40 or id_text ~ '[[:cntrl:]]'
 or (first_text||last_text||phone_text) ~ '[[:cntrl:]]' then raise exception 'Check your name, phone and handicap ID.' using errcode='22023'; end if;
 if jsonb_typeof(p_data->'handicap_index')<>'number' then raise exception 'Enter a valid handicap index.' using errcode='22023'; end if;
 index_number:=(p_data->>'handicap_index')::numeric;
 if index_number not between -10 and 54 or member is null or member not in ('full_time','substitute') then raise exception 'Check handicap and membership.' using errcode='22023'; end if;
 if times is null or jsonb_typeof(times)<>'array' then raise exception 'Choose available tee times.' using errcode='22023'; end if;
 if jsonb_array_length(times) not between 1 and 12 or exists(select 1 from jsonb_array_elements_text(times) t where t is null or t not in
 ('3:30 PM','3:40 PM','3:50 PM','4:00 PM','4:10 PM','4:20 PM','4:30 PM','4:40 PM','4:50 PM','5:00 PM','5:10 PM','5:20 PM'))
 or (select count(distinct t) from jsonb_array_elements_text(times)t)<>jsonb_array_length(times) then raise exception 'Choose valid tee times.' using errcode='22023'; end if;
 insert into league_private.registrations(user_id,email,first_name,last_name,phone,handicap_id,handicap_index,availability,membership_type,fee_cents)
 values(p_user,email_address,first_text,last_text,phone_text,id_text,index_number,times,member,case when member='full_time' then 18000 else 0 end)
 returning * into saved;
 insert into league_private.registration_notifications(application_id,kind,recipient_user_id)
 select saved.id,'new_application',id from auth.users where email_confirmed_at is not null and raw_app_meta_data->>'league_role'='admin'
 on conflict do nothing;
 return jsonb_build_object('application',to_jsonb(saved)-'user_id'-'decided_by');
end $$;
create function league_private.decide_registration(p_user uuid,p_application uuid,p_decision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved league_private.registrations; applicant_email text; linked bigint; matches integer; new_player integer;
begin
 perform league_private.registration_actor(p_user);
 if not league_private.registration_admin(p_user) then raise exception 'Commissioner access required.' using errcode='42501'; end if;
 if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'Invalid decision.' using errcode='22023'; end if;
 select * into saved from league_private.registrations where id=p_application for update;
 if saved.id is null then raise exception 'Application not found.' using errcode='22023'; end if;
 if saved.status=p_decision then return jsonb_build_object('application',to_jsonb(saved)-'user_id'-'decided_by'); end if;
 if saved.status<>'pending' then raise exception 'This application already has a decision.' using errcode='22023'; end if;
 applicant_email:=league_private.registration_actor(saved.user_id);
 if applicant_email<>saved.email then raise exception 'Application email changed; commissioner review required.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('league-account:'||saved.user_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended('league-registration-email:'||saved.email,0));
 if p_decision='approved' then
  if exists(select 1 from league_private.player_accounts where user_id=saved.user_id) or exists(select 1 from public.players where lower(btrim(email))=saved.email) then
   raise exception 'A roster record now exists; reconcile this application before approval.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('league-registration-player-id',0));
  loop
   new_player:=nextval('league_private.registration_player_ids');
   exit when not exists(select 1 from public.players where id=new_player);
  end loop;
  insert into public.players(id,name,email,phone,cdga_id,handicap,availability,type)
  values(new_player,saved.first_name||' '||saved.last_name,saved.email,saved.phone,saved.handicap_id,saved.handicap_index,saved.availability,
   case when saved.membership_type='full_time' then 'full-time' else 'substitute' end);
  insert into league_private.player_accounts(user_id,player_id) values(saved.user_id,new_player);
 end if;
 update league_private.registrations set status=p_decision,player_id=new_player,decided_at=now(),decided_by=p_user where id=saved.id returning * into saved;
 insert into league_private.registration_notifications(application_id,kind,recipient_user_id)
 values(saved.id,'application_'||p_decision,saved.user_id) on conflict do nothing;
 return jsonb_build_object('application',to_jsonb(saved)-'user_id'-'decided_by');
end $$;
create function league_private.claim_registration_notifications(p_user uuid,p_application uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved league_private.registrations; result jsonb; lease_id uuid:=gen_random_uuid();
begin
 perform league_private.registration_actor(p_user);
 select * into saved from league_private.registrations where id=p_application;
 if saved.id is null or (saved.user_id<>p_user and not league_private.registration_admin(p_user)) then raise exception 'Application access denied.' using errcode='42501'; end if;
 -- SMTP acceptance and a DB acknowledgement cannot share a transaction. A stale
 -- sending lease is uncertain, not automatically safe to resend.
 update league_private.registration_notifications set status='unknown',lease=null where application_id=p_application and status='sending' and started_at<now()-interval '5 minutes';
 update league_private.registration_notifications n set status='cancelled' where application_id=p_application and status in ('queued','failed') and
 (not exists(select 1 from auth.users u where u.id=n.recipient_user_id and u.email_confirmed_at is not null) or
 (kind='new_application' and not league_private.registration_admin(n.recipient_user_id)) or
 (kind<>'new_application' and not exists(select 1 from auth.users u where u.id=n.recipient_user_id and u.email_confirmed_at is not null and lower(btrim(u.email))=saved.email)));
 with picked as (select id from league_private.registration_notifications where application_id=p_application and status in ('queued','failed') and attempts<5 and next_attempt_at<=now() for update skip locked),
 claimed as (update league_private.registration_notifications n set status='sending',attempts=attempts+1,lease=lease_id,started_at=now() from picked p where n.id=p.id returning n.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'lease',n.lease,'kind',n.kind,'recipient',u.email,
 'first_name',saved.first_name,'last_name',saved.last_name,'membership_type',saved.membership_type,'fee_cents',saved.fee_cents)),'[]'::jsonb)
 into result from claimed n join auth.users u on u.id=n.recipient_user_id;
 return result;
end $$;
create function league_private.finish_registration_notification(p_id uuid,p_lease uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('sent','failed','unknown') or p_status is null then raise exception 'Invalid delivery status.'; end if;
 update league_private.registration_notifications set status=p_status,lease=null,sent_at=case when p_status='sent' then now() else null end,
 next_attempt_at=now()+interval '1 minute' where id=p_id and lease=p_lease and status='sending';
end $$;

-- No browser can call these server-only entry points or impersonate p_user.
create function public.league_registration_state(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$ select league_private.registration_state(p_user); $$;
create function public.league_submit_registration(p_user uuid,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$ select league_private.submit_registration(p_user,p_data); $$;
create function public.league_decide_registration(p_user uuid,p_application uuid,p_decision text) returns jsonb language sql security invoker set search_path='' as $$ select league_private.decide_registration(p_user,p_application,p_decision); $$;
create function public.league_claim_registration_notifications(p_user uuid,p_application uuid) returns jsonb language sql security invoker set search_path='' as $$ select league_private.claim_registration_notifications(p_user,p_application); $$;
create function public.league_finish_registration_notification(p_id uuid,p_lease uuid,p_status text) returns void language sql security invoker set search_path='' as $$ select league_private.finish_registration_notification(p_id,p_lease,p_status); $$;
revoke all on function league_private.registration_actor(uuid),league_private.registration_admin(uuid),league_private.registration_state(uuid),league_private.submit_registration(uuid,jsonb),league_private.decide_registration(uuid,uuid,text),league_private.claim_registration_notifications(uuid,uuid),league_private.finish_registration_notification(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.league_registration_state(uuid),public.league_submit_registration(uuid,jsonb),public.league_decide_registration(uuid,uuid,text),public.league_claim_registration_notifications(uuid,uuid),public.league_finish_registration_notification(uuid,uuid,text) from public,anon,authenticated;
grant usage on schema league_private to service_role;
grant execute on function league_private.registration_state(uuid),league_private.submit_registration(uuid,jsonb),league_private.decide_registration(uuid,uuid,text),league_private.claim_registration_notifications(uuid,uuid),league_private.finish_registration_notification(uuid,uuid,text) to service_role;
grant execute on function public.league_registration_state(uuid),public.league_submit_registration(uuid,jsonb),public.league_decide_registration(uuid,uuid,text),public.league_claim_registration_notifications(uuid,uuid),public.league_finish_registration_notification(uuid,uuid,text) to service_role;


-- Membership fee enforcement also protects existing substitutes.
create or replace function public.league_prepare_annual_checkout(p_user uuid,p_account text,p_live boolean,p_product text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint; product league_private.dues_products; saved league_private.stripe_orders;
begin
 player:=league_private.payment_actor(p_user);
 if not exists(select 1 from public.players where id=player and type='full-time') then raise exception 'Substitutes do not owe a registration fee.' using errcode='42501'; end if;
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

create or replace function public.league_annual_payment_history(p_user uuid,p_live boolean,p_player bigint default null) returns jsonb
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
 return jsonb_build_object('orders',history,'due_cents',league_private.payment_due(player),'dues_status',case when exists(select 1 from public.players where id=player and type='substitute') then 'not_required' else coalesce(state,'unpaid') end,'required_amount_cents',case when exists(select 1 from public.players where id=player and type='substitute') then 0 else product.amount_cents end,
 'product',jsonb_build_object('id',product.id,'name',product.name,'season',product.season,'amount_cents',product.amount_cents,'currency',product.currency));
end $$;


commit;
