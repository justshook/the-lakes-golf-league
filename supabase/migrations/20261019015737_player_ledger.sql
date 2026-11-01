-- Requires player_accounts_attendance_permissions. Staging verification required.
-- Records confirmed external money movements. No transfer is initiated here.
begin;
create table public.league_ledger_entries (
  id text primary key check (length(trim(id)) between 1 and 200),
  idempotency_key text unique not null check (length(trim(idempotency_key)) between 1 and 200),
  player_id bigint not null references public.players(id) on delete restrict,
  type text not null check (type in ('charge','payment','award','payout','refund')),
  status text not null check (status in ('pending','posted','failed','void')),
  amount_cents bigint not null check (amount_cents between 1 and 9007199254740991),
  currency text not null default 'USD' check (currency='USD'),
  reference text check (reference is null or length(trim(reference)) between 1 and 200),
  related_entry_id text references public.league_ledger_entries(id) on delete restrict,
  description text not null default '' check (length(description)<=500),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  check (type not in ('payment','payout','refund') or status<>'posted' or reference is not null),
  check ((type='refund') = (related_entry_id is not null))
);
create unique index league_ledger_transfer_reference on public.league_ledger_entries(type,reference)
  where type in ('payment','payout','refund') and status='posted';
create index league_ledger_player_date on public.league_ledger_entries(player_id,occurred_at desc);
alter table public.league_ledger_entries enable row level security;
revoke all on public.league_ledger_entries from public,anon,authenticated;
grant select on public.league_ledger_entries to authenticated;
create policy ledger_self_or_admin on public.league_ledger_entries for select to authenticated using (
  player_id=(select league_private.current_player_id()) or (select league_private.is_admin())
);

create function league_private.record_ledger_entry(p_entry jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_id text; v_key text; v_player bigint; v_type text; v_amount bigint;
  v_reference text; v_related text; v_description text; v_occurred timestamptz;
  existing public.league_ledger_entries; original public.league_ledger_entries;
  saved public.league_ledger_entries; total numeric;
begin
  if auth.uid() is null or not league_private.is_admin() then
    raise exception 'Commissioner access required.' using errcode='42501';
  end if;
  if jsonb_typeof(p_entry) is distinct from 'object' then raise exception 'Invalid ledger entry.'; end if;
  if p_entry->>'status' is distinct from 'posted' then raise exception 'Only confirmed entries can be recorded.'; end if;
  if p_entry->>'currency' is distinct from 'USD' then raise exception 'Only USD entries are supported.'; end if;
  if jsonb_typeof(p_entry->'amountCents') is distinct from 'number' or (p_entry->>'amountCents') !~ '^[0-9]+$' then
    raise exception 'Use positive integer cents.';
  end if;
  v_id:=trim(p_entry->>'id'); v_key:=trim(p_entry->>'idempotencyKey');
  v_player:=(p_entry->>'playerId')::bigint; v_type:=p_entry->>'type';
  v_amount:=(p_entry->>'amountCents')::bigint;
  v_reference:=nullif(trim(p_entry->>'reference'),''); v_related:=nullif(trim(p_entry->>'relatedEntryId'),'');
  v_description:=coalesce(p_entry->>'description',''); v_occurred:=(p_entry->>'occurredAt')::timestamptz;
  if v_id is null or v_key is null or length(v_id) not between 1 and 200 or length(v_key) not between 1 and 200 then
    raise exception 'Stable entry and idempotency identifiers are required.';
  end if;
  if v_player is null or not exists(select 1 from public.players where id=v_player) then raise exception 'Unknown player.'; end if;
  if v_type is null or v_type not in ('charge','payment','award','payout','refund') then raise exception 'Unsupported ledger entry.'; end if;
  if v_amount is null or v_amount not between 1 and 9007199254740991 then raise exception 'Invalid amount.'; end if;
  if v_occurred is null or not isfinite(v_occurred) then raise exception 'A valid entry date is required.'; end if;
  if v_occurred>clock_timestamp()+interval '5 minutes' then raise exception 'Confirmed entries cannot be dated in the future.'; end if;
  if length(v_description)>500 then raise exception 'Description is too long.'; end if;
  if v_type in ('payment','payout','refund') and v_reference is null then raise exception 'A receipt or payment reference is required.'; end if;
  if v_reference is not null and length(v_reference)>200 then raise exception 'Reference is too long.'; end if;
  if (v_type='refund')<>(v_related is not null) then raise exception 'Only refunds must reference an original payment.'; end if;

  -- One financial change per player at a time: protects refund and payout totals
  -- from concurrent requests passing a balance check before either inserts.
  perform pg_advisory_xact_lock(hashtextextended('league-ledger:'||v_player::text,0));
  select * into existing from public.league_ledger_entries where id=v_id or idempotency_key=v_key limit 1;
  if existing.id is not null then
    if existing.id<>v_id or existing.idempotency_key<>v_key or existing.player_id<>v_player or
       existing.type<>v_type or existing.amount_cents<>v_amount or existing.status<>'posted' or
       existing.reference is distinct from v_reference or existing.related_entry_id is distinct from v_related or
       existing.description<>v_description or existing.occurred_at<>v_occurred then
      raise exception 'This request identifier was already used for a different entry.';
    end if;
    return to_jsonb(existing);
  end if;
  if v_type in ('payment','payout','refund') and exists (
    select 1 from public.league_ledger_entries where type=v_type and reference=v_reference and status='posted'
  ) then raise exception 'This money movement has already been recorded.'; end if;
  if v_type='refund' then
    select * into original from public.league_ledger_entries where id=v_related;
    if original.id is null or original.type<>'payment' or original.status<>'posted' or original.player_id<>v_player then
      raise exception 'Refund must reference this player''s confirmed payment.';
    end if;
    select coalesce(sum(amount_cents),0) into total from public.league_ledger_entries
      where related_entry_id=v_related and type='refund' and status in ('posted','pending');
    if total+v_amount>original.amount_cents then raise exception 'Refund exceeds the original payment.'; end if;
  end if;
  if v_type='payout' then
    select coalesce(sum(case when type='award' and status='posted' then amount_cents
      when type='payout' and status in ('posted','pending') then -amount_cents else 0 end),0)
      into total from public.league_ledger_entries where player_id=v_player;
    if v_amount>total then raise exception 'Payout exceeds recorded prize awards. Reconcile historical awards first.'; end if;
  end if;
  select coalesce(sum(amount_cents),0) into total from public.league_ledger_entries where player_id=v_player and type=v_type and status='posted';
  if total+v_amount>9007199254740991 then raise exception 'Total exceeds supported precision.'; end if;

  insert into public.league_ledger_entries(id,idempotency_key,player_id,type,status,amount_cents,currency,reference,related_entry_id,description,occurred_at,recorded_by)
    values(v_id,v_key,v_player,v_type,'posted',v_amount,'USD',v_reference,v_related,v_description,v_occurred,auth.uid()) returning * into saved;
  return to_jsonb(saved);
end $$;
revoke all on function league_private.record_ledger_entry(jsonb) from public,anon,authenticated;
grant execute on function league_private.record_ledger_entry(jsonb) to authenticated;
create function public.record_league_ledger_entry(p_entry jsonb) returns jsonb language sql security invoker set search_path='' as $$
  select league_private.record_ledger_entry(p_entry);
$$;
revoke all on function public.record_league_ledger_entry(jsonb) from public,anon,authenticated;
grant execute on function public.record_league_ledger_entry(jsonb) to authenticated;

comment on table public.league_ledger_entries is 'Immutable league accounting. Not a wallet; no funds are moved. Legacy player_money awards are not payment receipts.';
commit;
