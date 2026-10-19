-- Apply to a reviewed Lakes League staging clone first. No remote database has
-- been changed by preparing this migration. See docs/auth-setup.md.
begin;

-- A wrong project or incompatible legacy schema must fail before any DDL.
do $$
declare t text; c text;
begin
  foreach t in array array['players','tee_sheets','player_money','giant_skins','player_scores','weekly_games','league_settings','payout_templates'] loop
    if to_regclass('public.' || t) is null then raise exception 'Lakes League preflight: missing public.%', t; end if;
  end loop;
  foreach c in array array['id','name','email','phone','handicap','availability','type'] loop
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='players' and column_name=c) then
      raise exception 'Lakes League preflight: missing players.%', c;
    end if;
  end loop;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='players' and column_name='id' and data_type in ('smallint','integer','bigint')) then
    raise exception 'Lakes League preflight: numeric legacy player IDs required';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_scores' and column_name='week_id' and data_type in ('integer','bigint')) then
    raise exception 'Lakes League preflight: integer player_scores.week_id required';
  end if;
  foreach c in array array['birdie_holes','eagle_holes'] loop
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_scores' and column_name=c and udt_name in ('_int4','_int8')) then raise exception 'Lakes League preflight: player_scores.% must be an integer array', c; end if;
  end loop;
  foreach c in array array['player_id','week_id','gross_score','net_score','handicap_used','birdie_holes','eagle_holes','is_team_score'] loop
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='player_scores' and column_name=c) then
      raise exception 'Lakes League preflight: missing player_scores.%', c;
    end if;
  end loop;
end $$;

create schema if not exists league_private;
revoke all on schema league_private from public, anon, authenticated;
grant usage on schema league_private to anon, authenticated;

create table league_private.player_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_id bigint unique not null references public.players(id) on delete cascade,
  linked_at timestamptz not null default now()
);
alter table league_private.player_accounts enable row level security;
revoke all on league_private.player_accounts from public, anon, authenticated;

-- Read fresh server-owned app metadata, never editable user_metadata or stale JWT
-- claims. The private definer is necessary for the protected auth.users lookup.
create function league_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null
    and coalesce(u.raw_app_meta_data->>'league_role','')='admin'
  );
$$;
revoke all on function league_private.is_admin() from public, anon, authenticated;
grant execute on function league_private.is_admin() to authenticated;

create function league_private.current_player_id() returns bigint
language sql stable security definer set search_path = '' as $$
  select p.player_id from league_private.player_accounts p
  join auth.users u on u.id=p.user_id
  where p.user_id=auth.uid() and u.email_confirmed_at is not null;
$$;
revoke all on function league_private.current_player_id() from public, anon, authenticated;
grant execute on function league_private.current_player_id() to authenticated;

-- The client may only claim by a fresh, confirmed email held in auth.users.
-- Neither names, phone digits, user_metadata nor client-supplied player IDs count.
create function league_private.claim_player() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); verified_email text; matched bigint; matches integer; linked bigint; result jsonb;
begin
  if actor is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
  select lower(trim(email)) into verified_email from auth.users where id=actor and email_confirmed_at is not null;
  if verified_email is null then raise exception 'Verify your email to continue.' using errcode='42501'; end if;
  -- Serialize concurrent claims and email reassignment checks.
  perform pg_advisory_xact_lock(hashtextextended('league-account:' || actor::text, 0));
  select player_id into linked from league_private.player_accounts where user_id=actor;
  if linked is null then
    select count(*), min(id) into matches, matched from public.players where lower(trim(email))=verified_email;
    if matches <> 1 then
      return jsonb_build_object('player_id',null,'email',verified_email,'is_admin',league_private.is_admin(),
        'link_error','Ask the commissioner to confirm the email on your player record.');
    end if;
    insert into league_private.player_accounts(user_id,player_id) values(actor,matched)
      on conflict do nothing;
    select player_id into linked from league_private.player_accounts where user_id=actor;
    if linked is null then raise exception 'This player is already linked. Contact the commissioner.' using errcode='42501'; end if;
  end if;
  select jsonb_build_object('player_id',p.id,'name',p.name,'email',verified_email,'availability',p.availability,
    'is_admin',league_private.is_admin()) into result from public.players p where p.id=linked;
  return result;
end $$;
revoke all on function league_private.claim_player() from public, anon, authenticated;
grant execute on function league_private.claim_player() to authenticated;
create function public.claim_league_player() returns jsonb language sql security invoker set search_path='' as $$ select league_private.claim_player(); $$;
revoke all on function public.claim_league_player() from public, anon;
grant execute on function public.claim_league_player() to authenticated;

create table public.league_rounds (
  week_id text primary key check (week_id ~ '^[0-9]+$'),
  date date not null,
  attendance_deadline timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','cancelled','finalized')),
  published_at timestamptz,
  score_submission_enabled boolean not null default true,
  tee_sheet jsonb not null default '[]'::jsonb check (jsonb_typeof(tee_sheet)='array'),
  rule_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(rule_snapshot)='object'),
  check (attendance_deadline <= ((date + 1)::timestamp at time zone 'America/Chicago'))
);
create table public.league_attendance (
  week_id text not null references public.league_rounds(week_id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('in','out')),
  updated_at timestamptz not null default now(),
  primary key(week_id,player_id)
);
create table public.league_player_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_id bigint unique not null references public.players(id) on delete cascade,
  availability text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table public.league_round_participants (
  week_id text not null references public.league_rounds(week_id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  team_id text,
  handicap_used numeric not null check (handicap_used between -20 and 60),
  tee_time text not null,
  primary key(week_id,player_id)
);
create index league_attendance_user on public.league_attendance(user_id);
create index league_participants_team on public.league_round_participants(week_id,team_id);

-- Replace permissive legacy policies, so legacy browser code cannot bypass new
-- ownership checks. Public league results remain readable; contacts do not.
do $$
declare t text; pol record;
begin
  foreach t in array array['players','tee_sheets','player_money','giant_skins','player_scores','weekly_games','league_settings','payout_templates','league_rounds','league_attendance','league_player_preferences','league_round_participants'] loop
    execute format('alter table public.%I enable row level security',t);
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',pol.policyname,t);
    end loop;
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy league_admin_all on public.%I for all to authenticated using ((select league_private.is_admin())) with check ((select league_private.is_admin()))',t);
    if t not in ('players','league_attendance','league_player_preferences') then
      execute format('grant select on public.%I to anon',t);
      execute format('create policy league_public_read on public.%I for select to anon, authenticated using (true)',t);
    end if;
  end loop;
end $$;
create policy league_player_own_contact on public.players for select to authenticated using (id=(select league_private.current_player_id()));
create policy league_own_attendance on public.league_attendance for select to authenticated using (user_id=(select auth.uid()));
create policy league_own_preferences on public.league_player_preferences for select to authenticated using (user_id=(select auth.uid()));
-- No player INSERT/UPDATE/DELETE policies: only validated RPCs may change them.

-- Narrow public projection is the only anonymous roster path. Its private
-- definer is deliberate: underlying contact rows remain inaccessible. The
-- security-invoker view grants no additional privilege over that safe function.
create function league_private.public_roster() returns table(id bigint,name text,handicap numeric,availability jsonb,type text,cdga_id text)
language sql stable security definer set search_path='' as $$
  select p.id::bigint,p.name::text,p.handicap::numeric,
    coalesce(to_jsonb(pref.availability),to_jsonb(p.availability),'[]'::jsonb),p.type::text,''::text
  from public.players p left join public.league_player_preferences pref on pref.player_id=p.id;
$$;
revoke all on function league_private.public_roster() from public, anon, authenticated;
grant execute on function league_private.public_roster() to anon, authenticated;
create view public.league_public_players with (security_invoker=true) as select * from league_private.public_roster();
revoke all on public.league_public_players from public, anon, authenticated;
grant select on public.league_public_players to anon, authenticated;

create function league_private.set_attendance(p_week_id text,p_status text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint := league_private.current_player_id(); round public.league_rounds; saved public.league_attendance;
begin
  if auth.uid() is null or player is null then raise exception 'Link your league account first.' using errcode='42501'; end if;
  if p_status not in ('in','out') or p_status is null then raise exception 'Invalid attendance status.'; end if;
  select * into round from public.league_rounds where week_id=p_week_id for update;
  if round.week_id is null then raise exception 'This round is awaiting commissioner setup.'; end if;
  if round.status not in ('draft','published') or clock_timestamp() >= round.attendance_deadline or exists(select 1 from public.player_scores where week_id::text=p_week_id) then
    raise exception 'Attendance is locked. Contact the commissioner.' using errcode='42501';
  end if;
  insert into public.league_attendance(week_id,player_id,user_id,status) values(p_week_id,player,auth.uid(),p_status)
    on conflict(week_id,player_id) do update set status=excluded.status,user_id=excluded.user_id,updated_at=clock_timestamp()
    returning * into saved;
  return to_jsonb(saved);
end $$;
revoke all on function league_private.set_attendance(text,text) from public, anon, authenticated;
grant execute on function league_private.set_attendance(text,text) to authenticated;
create function public.set_league_attendance(p_week_id text,p_status text) returns jsonb language sql security invoker set search_path='' as $$ select league_private.set_attendance(p_week_id,p_status); $$;
revoke all on function public.set_league_attendance(text,text) from public, anon;
grant execute on function public.set_league_attendance(text,text) to authenticated;

create function league_private.set_availability(p_availability text[]) returns text[]
language plpgsql security definer set search_path='' as $$
declare player bigint := league_private.current_player_id();
begin
  if auth.uid() is null or player is null then raise exception 'Link your league account first.' using errcode='42501'; end if;
  if p_availability is null or cardinality(p_availability)>12 or exists (
    select 1 from unnest(p_availability) t where t is null or t not in ('3:30 PM','3:40 PM','3:50 PM','4:00 PM','4:10 PM','4:20 PM','4:30 PM','4:40 PM','4:50 PM','5:00 PM','5:10 PM','5:20 PM')
  ) then raise exception 'Choose valid league tee times.'; end if;
  insert into public.league_player_preferences(user_id,player_id,availability) values(auth.uid(),player,p_availability)
    on conflict(user_id) do update set availability=excluded.availability,updated_at=clock_timestamp();
  return p_availability;
end $$;
revoke all on function league_private.set_availability(text[]) from public, anon, authenticated;
grant execute on function league_private.set_availability(text[]) to authenticated;
create function public.set_league_availability(p_availability text[]) returns text[] language sql security invoker set search_path='' as $$ select league_private.set_availability(p_availability); $$;
revoke all on function public.set_league_availability(text[]) from public, anon;
grant execute on function public.set_league_availability(text[]) to authenticated;

create function league_private.publish_round(p_week_id text,p_tee_sheet jsonb,p_participants jsonb,p_rule_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare round public.league_rounds; entry jsonb; slot jsonb; pid bigint; member jsonb; roster_count integer; participant_count integer; expected_size integer; seen bigint[] := array[]::bigint[]; team jsonb; displayed_members bigint[]; scored_members bigint[]; seen_teams text[] := array[]::text[];
begin
  if auth.uid() is null or not league_private.is_admin() then raise exception 'Commissioner access required.' using errcode='42501'; end if;
  select * into round from public.league_rounds where week_id=p_week_id for update;
  if round.week_id is null then raise exception 'Configure this round and attendance cutoff before publishing.'; end if;
  if round.status in ('finalized','cancelled') then raise exception 'This round cannot be published.'; end if;
  if exists(select 1 from public.player_scores where week_id::text=p_week_id) then raise exception 'Scores already exist. Correct this round through a reviewed admin change.'; end if;
  if jsonb_typeof(p_tee_sheet) is distinct from 'array' or jsonb_typeof(p_participants) is distinct from 'array' or jsonb_typeof(p_rule_snapshot) is distinct from 'object' then raise exception 'Invalid round snapshot.'; end if;
  if p_rule_snapshot->>'scoringMode' not in ('individual','scramble') or p_rule_snapshot->>'scoringMode' is null or p_rule_snapshot->>'nineHoles' is distinct from 'front' then raise exception 'This scoring format is not supported for publication yet.'; end if;
  if p_rule_snapshot->>'scoringMode'='scramble' and (p_rule_snapshot->>'teamType' is null or p_rule_snapshot->>'teamType' not in ('2-person','4-person')) then raise exception 'Choose a supported scramble team size.'; end if;
  if p_rule_snapshot->>'scoringMode'='individual' and nullif(p_rule_snapshot->>'teamType','') is not null then raise exception 'Individual rounds cannot have team scoring.'; end if;
  if jsonb_array_length(p_participants)=0 then raise exception 'Cannot publish an empty field.'; end if;
  if exists (select 1 from jsonb_array_elements(p_participants) p group by p->>'player_id' having count(*)>1) then raise exception 'A player is assigned more than once.'; end if;
  if exists (select 1 from jsonb_array_elements(p_tee_sheet) s group by s->>'time' having count(*)>1) then raise exception 'A tee time is duplicated.'; end if;
  expected_size:=case p_rule_snapshot->>'teamType' when '2-person' then 2 when '4-person' then 4 else null end;
  roster_count:=0;
  for slot in select * from jsonb_array_elements(p_tee_sheet) loop
    if jsonb_typeof(slot->'players') is distinct from 'array' or jsonb_array_length(slot->'players')>4 then raise exception 'A foursome must contain at most four players.'; end if;
    if expected_size is not null then
      if jsonb_typeof(slot->'teams') is distinct from 'array' then raise exception 'Published scramble groups require explicit teams.'; end if;
      if jsonb_array_length(slot->'teams')*expected_size<>jsonb_array_length(slot->'players') then raise exception 'Displayed teams do not cover this foursome.'; end if;
      for team in select * from jsonb_array_elements(slot->'teams') loop
        if nullif(team->>'teamId','') is null or (team->>'teamId')=any(seen_teams) then raise exception 'Every displayed team requires a unique team ID.'; end if;
        seen_teams:=array_append(seen_teams,team->>'teamId');
        if team->>'teamType' is distinct from p_rule_snapshot->>'teamType' or jsonb_typeof(team->'memberIds') is distinct from 'array' then raise exception 'Displayed team format does not match the round.'; end if;
        select array_agg((m#>>'{}')::bigint order by (m#>>'{}')::bigint) into displayed_members from jsonb_array_elements(team->'memberIds') m;
        select array_agg((p->>'player_id')::bigint order by (p->>'player_id')::bigint) into scored_members from jsonb_array_elements(p_participants) p where p->>'team_id'=team->>'teamId' and p->>'tee_time'=slot->>'time';
        if cardinality(displayed_members) is distinct from expected_size or displayed_members is distinct from scored_members then raise exception 'Displayed team members do not match the frozen scoring team.'; end if;
      end loop;
    elsif coalesce(jsonb_array_length(slot->'teams'),0)>0 then
      raise exception 'Individual groups cannot include displayed scoring teams.';
    end if;
    for member in select * from jsonb_array_elements(slot->'players') loop
      pid := case when jsonb_typeof(member)='object' then (member->>'id')::bigint else (member#>>'{}')::bigint end;
      if pid is null or not exists(select 1 from jsonb_array_elements(p_participants) p where (p->>'player_id')::bigint=pid and p->>'tee_time'=slot->>'time') then raise exception 'Tee sheet and participant snapshot do not match.'; end if;
      if pid=any(seen) then raise exception 'A player appears more than once on the tee sheet.'; end if;
      seen:=array_append(seen,pid);
      roster_count:=roster_count+1;
    end loop;
  end loop;
  participant_count:=jsonb_array_length(p_participants);
  if roster_count<>participant_count then raise exception 'Every participant must have one tee time.'; end if;
  expected_size:=case p_rule_snapshot->>'teamType' when 'two' then 2 when 'two-person' then 2 when '2-person' then 2 when 'four' then 4 when 'four-person' then 4 when '4-person' then 4 else null end;
  for entry in select * from jsonb_array_elements(p_participants) loop
    pid:=(entry->>'player_id')::bigint;
    if not exists(select 1 from public.players where id=pid) then raise exception 'Unknown player in schedule.'; end if;
    if exists(select 1 from public.league_attendance where week_id=p_week_id and player_id=pid and status='out') then raise exception 'An unavailable player is scheduled.'; end if;
    if not exists(select 1 from league_private.public_roster() p where p.id=pid and p.availability ? (entry->>'tee_time')) then raise exception 'A tee time falls outside player availability.'; end if;
    if entry->>'handicap_used' is null then raise exception 'Freeze the handicap for every participant.'; end if;
    if expected_size is null and nullif(entry->>'team_id','') is not null then raise exception 'Individual players cannot belong to a scoring team.'; end if;
    if expected_size is not null and (nullif(entry->>'team_id','') is null or (select count(*) from jsonb_array_elements(p_participants) p where p->>'team_id'=entry->>'team_id')<>expected_size) then raise exception 'Team size does not match this game.'; end if;
    if nullif(entry->>'team_id','') is not null and exists(select 1 from jsonb_array_elements(p_participants) p where p->>'team_id'=entry->>'team_id' and (p->>'tee_time'<>entry->>'tee_time' or (p->>'handicap_used')::numeric<>(entry->>'handicap_used')::numeric)) then raise exception 'Team members must share a tee time and team handicap.'; end if;
  end loop;
  delete from public.league_round_participants where week_id=p_week_id;
  insert into public.league_round_participants(week_id,player_id,team_id,handicap_used,tee_time)
    select p_week_id,(p->>'player_id')::bigint,nullif(p->>'team_id',''),(p->>'handicap_used')::numeric,p->>'tee_time' from jsonb_array_elements(p_participants) p;
  update public.league_rounds set tee_sheet=p_tee_sheet,rule_snapshot=p_rule_snapshot,status='published',published_at=clock_timestamp() where week_id=p_week_id returning * into round;
  return to_jsonb(round);
end $$;
revoke all on function league_private.publish_round(text,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function league_private.publish_round(text,jsonb,jsonb,jsonb) to authenticated;
create function public.publish_league_round(p_week_id text,p_tee_sheet jsonb,p_participants jsonb,p_rule_snapshot jsonb) returns jsonb language sql security invoker set search_path='' as $$ select league_private.publish_round(p_week_id,p_tee_sheet,p_participants,p_rule_snapshot); $$;
revoke all on function public.publish_league_round(text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.publish_league_round(text,jsonb,jsonb,jsonb) to authenticated;

create function league_private.submit_score(p_week_id text,p_gross_score integer,p_birdie_holes integer[],p_eagle_holes integer[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare player bigint:=league_private.current_player_id(); round public.league_rounds; participant public.league_round_participants; team_member public.league_round_participants; output jsonb;
begin
  if auth.uid() is null or player is null then raise exception 'Link your league account first.' using errcode='42501'; end if;
  select * into round from public.league_rounds where week_id=p_week_id for update;
  if round.status is distinct from 'published' or not round.score_submission_enabled or round.date>(now() at time zone 'America/Chicago')::date then raise exception 'Score entry is closed for this round.' using errcode='42501'; end if;
  if round.rule_snapshot->>'scoringMode' not in ('individual','scramble') or round.rule_snapshot->>'scoringMode' is null or round.rule_snapshot->>'nineHoles' is distinct from 'front' then raise exception 'Score entry requires a supported frozen rule snapshot.'; end if;
  select * into participant from public.league_round_participants where week_id=p_week_id and player_id=player;
  if participant.player_id is null then raise exception 'You are not assigned to this round.' using errcode='42501'; end if;
  if exists(select 1 from public.league_round_participants p join public.league_attendance a on a.week_id=p.week_id and a.player_id=p.player_id where p.week_id=p_week_id and a.status='out' and (p.player_id=player or (participant.team_id is not null and p.team_id=participant.team_id))) then raise exception 'A team member withdrew. Ask the commissioner to update this round before scoring.'; end if;
  if p_gross_score is null or p_gross_score<9 or p_gross_score>180 then raise exception 'Invalid gross score.'; end if;
  if p_birdie_holes is null or p_eagle_holes is null or cardinality(p_birdie_holes)>9 or cardinality(p_eagle_holes)>9 or p_birdie_holes && p_eagle_holes or exists(select 1 from unnest(p_birdie_holes || p_eagle_holes) h where h is null or h<1 or h>9) then raise exception 'Invalid hole selections.'; end if;
  if (round.rule_snapshot->>'scoringMode'='scramble') <> (participant.team_id is not null) then raise exception 'Team assignment does not match the frozen rules.'; end if;
  if cardinality(p_birdie_holes || p_eagle_holes)<>(select count(distinct h) from unnest(p_birdie_holes || p_eagle_holes) h) then raise exception 'Each scoring hole may be selected once.'; end if;
  -- A scramble/team total must not create individual birdie/giant-skin records.
  if participant.team_id is not null and cardinality(p_birdie_holes || p_eagle_holes)>0 then raise exception 'Team scores cannot record individual birdies or eagles.'; end if;
  if exists(select 1 from public.player_scores s join public.league_round_participants p on p.player_id=s.player_id and p.week_id=s.week_id::text where p.week_id=p_week_id and (p.player_id=player or (participant.team_id is not null and p.team_id=participant.team_id))) then raise exception 'A score already exists. Ask the commissioner to correct it.'; end if;
  for team_member in select * from public.league_round_participants where week_id=p_week_id and (player_id=player or (participant.team_id is not null and team_id=participant.team_id)) loop
    insert into public.player_scores(player_id,week_id,gross_score,net_score,handicap_used,birdie_holes,eagle_holes,is_team_score)
      values(team_member.player_id,p_week_id::integer,p_gross_score,p_gross_score-team_member.handicap_used,team_member.handicap_used,p_birdie_holes,p_eagle_holes,participant.team_id is not null);
  end loop;
  select jsonb_agg(to_jsonb(s)) into output from public.player_scores s join public.league_round_participants p on p.player_id=s.player_id and p.week_id=s.week_id::text where p.week_id=p_week_id and (p.player_id=player or (participant.team_id is not null and p.team_id=participant.team_id));
  return output;
end $$;
revoke all on function league_private.submit_score(text,integer,integer[],integer[]) from public, anon, authenticated;
grant execute on function league_private.submit_score(text,integer,integer[],integer[]) to authenticated;
create function public.submit_league_score(p_week_id text,p_gross_score integer,p_birdie_holes integer[] default '{}',p_eagle_holes integer[] default '{}') returns jsonb language sql security invoker set search_path='' as $$ select league_private.submit_score(p_week_id,p_gross_score,p_birdie_holes,p_eagle_holes); $$;
revoke all on function public.submit_league_score(text,integer,integer[],integer[]) from public, anon;
grant execute on function public.submit_league_score(text,integer,integer[],integer[]) to authenticated;

-- Even commissioners use the transactional publish/create/cancel API for round
-- snapshots. Legacy administration cannot change an already frozen assignment.
revoke insert,update,delete on public.league_rounds,public.league_round_participants from authenticated;
create function league_private.create_round(p_date date,p_attendance_deadline timestamptz,p_rule_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare created public.league_rounds;
begin
  if auth.uid() is null or not league_private.is_admin() then raise exception 'Commissioner access required.' using errcode='42501'; end if;
  if p_date is null or p_date<(now() at time zone 'America/Chicago')::date or p_attendance_deadline is null or p_attendance_deadline<=now() or p_attendance_deadline>((p_date+1)::timestamp at time zone 'America/Chicago') then raise exception 'Choose a future round and attendance cutoff before play.'; end if;
  if p_rule_snapshot->>'scoringMode' not in ('individual','scramble') or p_rule_snapshot->>'scoringMode' is null or p_rule_snapshot->>'nineHoles' is distinct from 'front' then raise exception 'Choose a supported front-nine scoring format.'; end if;
  if p_rule_snapshot->>'scoringMode'='scramble' and (p_rule_snapshot->>'teamType' is null or p_rule_snapshot->>'teamType' not in ('2-person','4-person')) then raise exception 'Choose a supported scramble team size.'; end if;
  if p_rule_snapshot->>'scoringMode'='individual' and nullif(p_rule_snapshot->>'teamType','') is not null then raise exception 'Individual rounds cannot have teams.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('league-date:' || p_date::text,0));
  if exists(select 1 from public.league_rounds where date=p_date) then raise exception 'A round already exists on this date.'; end if;
  insert into public.league_rounds(week_id,date,attendance_deadline,rule_snapshot)
    values(to_char(p_date,'YYYYMMDD'),p_date,p_attendance_deadline,p_rule_snapshot) returning * into created;
  return to_jsonb(created);
end $$;
revoke all on function league_private.create_round(date,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function league_private.create_round(date,timestamptz,jsonb) to authenticated;
create function public.create_league_round(p_date date,p_attendance_deadline timestamptz,p_rule_snapshot jsonb) returns jsonb language sql security invoker set search_path='' as $$ select league_private.create_round(p_date,p_attendance_deadline,p_rule_snapshot); $$;
revoke all on function public.create_league_round(date,timestamptz,jsonb) from public,anon;
grant execute on function public.create_league_round(date,timestamptz,jsonb) to authenticated;
create function league_private.cancel_round(p_week_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target public.league_rounds;
begin
  if auth.uid() is null or not league_private.is_admin() then raise exception 'Commissioner access required.' using errcode='42501'; end if;
  select * into target from public.league_rounds where week_id=p_week_id for update;
  if target.week_id is null or target.status='finalized' or exists(select 1 from public.player_scores where week_id::text=p_week_id) then raise exception 'A missing, finalized or scored round cannot be cancelled here.'; end if;
  update public.league_rounds set status='cancelled',score_submission_enabled=false where week_id=p_week_id returning * into target;
  return to_jsonb(target);
end $$;
revoke all on function league_private.cancel_round(text) from public,anon,authenticated;
grant execute on function league_private.cancel_round(text) to authenticated;
create function public.cancel_league_round(p_week_id text) returns jsonb language sql security invoker set search_path='' as $$ select league_private.cancel_round(p_week_id); $$;
revoke all on function public.cancel_league_round(text) from public,anon;
grant execute on function public.cancel_league_round(text) to authenticated;
commit;
