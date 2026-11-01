-- Hole-level drafts are separate from official player_scores until submission.
begin;
create table public.league_scorecards (
  week_id text not null references public.league_rounds(week_id),
  entry_key text not null,
  team_id text,
  member_ids bigint[] not null,
  handicap_used integer not null,
  holes jsonb not null,
  gross_scores integer[] not null default array[null,null,null,null,null,null,null,null,null]::integer[],
  revision integer not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  primary key(week_id,entry_key),
  check (cardinality(gross_scores)=9 and array_ndims(gross_scores)=1 and array_lower(gross_scores,1)=1),
  check (jsonb_typeof(holes)='array' and jsonb_array_length(holes)=9),
  check (cardinality(member_ids)>0)
);
alter table public.league_scorecards enable row level security;
revoke all on public.league_scorecards from public,anon,authenticated;
grant select on public.league_scorecards to authenticated;
grant all on public.league_scorecards to service_role;
create policy league_scorecards_read on public.league_scorecards for select to authenticated
  using ((select league_private.current_player_id()) is not null or (select league_private.is_admin()));

-- Publication may replace participant rows. Once anyone starts, freeze both
-- the tee sheet and participant snapshot, even before an official total exists.
create function league_private.protect_started_round() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.league_scorecards where week_id=old.week_id) then
    if tg_table_name='league_round_participants' then
      raise exception 'A round has started. Its participants and handicaps are locked.';
    elsif tg_op='DELETE' then
      raise exception 'A round has started and cannot be deleted.';
    elsif new.tee_sheet is distinct from old.tee_sheet or new.rule_snapshot is distinct from old.rule_snapshot
      or new.date is distinct from old.date or new.week_id is distinct from old.week_id
      or new.status in ('draft','cancelled') then
      raise exception 'A round has started. Its course, schedule and rules are locked.';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function league_private.protect_started_round() from public,anon,authenticated;
create trigger protect_started_round before update or delete on public.league_rounds
  for each row execute function league_private.protect_started_round();
create trigger protect_started_participants before update or delete on public.league_round_participants
  for each row execute function league_private.protect_started_round();

-- All mutations use this checked private function; the public wrapper is invoker.
-- The round row serializes starts, team edits, publication and final submission.
create function league_private.manage_scorecard(p_week_id text,p_action text,p_hole integer,p_gross integer,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  player bigint:=league_private.current_player_id();
  round public.league_rounds;
  participant public.league_round_participants;
  card public.league_scorecards;
  card_key text;
  members bigint[];
  total integer;
  birdies integer[]:='{}';
  eagles integer[]:='{}';
  front_holes jsonb:='[{"number":1,"par":4,"handicapIndex":7,"yards":325},{"number":2,"par":5,"handicapIndex":1,"yards":480},{"number":3,"par":3,"handicapIndex":17,"yards":140},{"number":4,"par":4,"handicapIndex":5,"yards":389},{"number":5,"par":3,"handicapIndex":13,"yards":172},{"number":6,"par":4,"handicapIndex":3,"yards":393},{"number":7,"par":4,"handicapIndex":9,"yards":314},{"number":8,"par":3,"handicapIndex":15,"yards":122},{"number":9,"par":4,"handicapIndex":11,"yards":320}]';
begin
  if auth.uid() is null or player is null then raise exception 'Link your league account first.' using errcode='42501'; end if;
  if p_action is null or p_action not in ('start','save','submit') then raise exception 'Unknown scorecard action.'; end if;
  select * into round from public.league_rounds where week_id=p_week_id for update;
  select * into participant from public.league_round_participants where week_id=p_week_id and player_id=player;
  if participant.player_id is null then raise exception 'You are not assigned to this round.' using errcode='42501'; end if;
  card_key:=case when participant.team_id is null then 'player:'||player::text else 'team:'||participant.team_id end;
  select * into card from public.league_scorecards where week_id=p_week_id and entry_key=card_key;
  -- Retrying a start or an acknowledged submission is idempotent.
  if p_action='start' and card.entry_key is not null then return to_jsonb(card); end if;
  if card.submitted_at is not null then
    if p_action='submit' then return to_jsonb(card); end if;
    raise exception 'This scorecard has been submitted and is locked.' using errcode='42501';
  end if;
  if round.status is distinct from 'published' or not round.score_submission_enabled or round.date>(now() at time zone 'America/Chicago')::date then raise exception 'Score entry is closed for this round.' using errcode='42501'; end if;
  if round.rule_snapshot->>'scoringMode' is null or round.rule_snapshot->>'scoringMode' not in ('individual','scramble') or round.rule_snapshot->>'nineHoles' is distinct from 'front' then raise exception 'This round requires verified course and scoring rules.'; end if;
  if (round.rule_snapshot->>'scoringMode'='scramble') <> (participant.team_id is not null) then raise exception 'Team assignment does not match the frozen rules.'; end if;
  select array_agg(player_id order by player_id) into members from public.league_round_participants
    where week_id=p_week_id and (player_id=player or (participant.team_id is not null and team_id=participant.team_id));
  if exists(select 1 from public.league_attendance where week_id=p_week_id and player_id=any(members) and status='out') then raise exception 'A team member withdrew. Ask the commissioner to review the round.'; end if;
  if exists(select 1 from public.player_scores where week_id::text=p_week_id and player_id=any(members)) then raise exception 'A score already exists. This round is locked.'; end if;
  if p_action='start' then
    insert into public.league_scorecards(week_id,entry_key,team_id,member_ids,handicap_used,holes)
      values(p_week_id,card_key,participant.team_id,members,participant.handicap_used,front_holes) returning * into card;
    return to_jsonb(card);
  end if;
  if card.entry_key is null then raise exception 'Start your round first.'; end if;
  if p_revision is distinct from card.revision then raise exception 'This card changed on another device. Reload the card and review before trying again.' using errcode='40001'; end if;
  if p_action='save' then
    if p_hole is null or p_hole<1 or p_hole>9 or (p_gross is not null and (p_gross<1 or p_gross>20)) then raise exception 'Enter a whole-number score from 1 to 20 for a valid hole.'; end if;
    card.gross_scores[p_hole]:=p_gross;
    update public.league_scorecards set gross_scores=card.gross_scores,revision=revision+1,updated_at=clock_timestamp()
      where week_id=p_week_id and entry_key=card_key returning * into card;
  else
    if array_position(card.gross_scores,null) is not null then raise exception 'Complete all nine holes before submitting.'; end if;
    select sum(s)::integer into total from unnest(card.gross_scores) s;
    if card.team_id is null then
      select coalesce(array_agg(i) filter(where card.gross_scores[i]=(card.holes->(i-1)->>'par')::integer-1),'{}'),
        coalesce(array_agg(i) filter(where card.gross_scores[i]=(card.holes->(i-1)->>'par')::integer-2),'{}')
        into birdies,eagles from generate_series(1,9) i;
    end if;
    insert into public.player_scores(player_id,week_id,gross_score,net_score,handicap_used,birdie_holes,eagle_holes,is_team_score)
      select m,p_week_id::integer,total,total-card.handicap_used,card.handicap_used,to_jsonb(birdies),to_jsonb(eagles),card.team_id is not null from unnest(card.member_ids) m;
    update public.league_scorecards set submitted_at=clock_timestamp(),updated_at=clock_timestamp(),revision=revision+1
      where week_id=p_week_id and entry_key=card_key returning * into card;
  end if;
  return to_jsonb(card);
end $$;
revoke all on function league_private.manage_scorecard(text,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function league_private.manage_scorecard(text,text,integer,integer,integer) to authenticated;
create function public.manage_league_scorecard(p_week_id text,p_action text,p_hole integer default null,p_gross integer default null,p_revision integer default null) returns jsonb
language sql security invoker set search_path='' as $$ select league_private.manage_scorecard(p_week_id,p_action,p_hole,p_gross,p_revision); $$;
revoke all on function public.manage_league_scorecard(text,text,integer,integer,integer) from public,anon;
grant execute on function public.manage_league_scorecard(text,text,integer,integer,integer) to authenticated;

-- Older clients cannot submit a different total around a started card.
create or replace function league_private.submit_score(p_week_id text,p_gross_score integer,p_birdie_holes integer[],p_eagle_holes integer[]) returns jsonb
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
  if exists(select 1 from public.league_scorecards where week_id=p_week_id and player=any(member_ids)) then raise exception 'A live scorecard exists. Review and submit that card instead.'; end if;
  if p_gross_score is null or p_gross_score<9 or p_gross_score>180 then raise exception 'Invalid gross score.'; end if;
  if p_birdie_holes is null or p_eagle_holes is null or coalesce(array_ndims(p_birdie_holes),0)>1 or coalesce(array_ndims(p_eagle_holes),0)>1 or cardinality(p_birdie_holes)>9 or cardinality(p_eagle_holes)>9 or p_birdie_holes && p_eagle_holes or exists(select 1 from unnest(p_birdie_holes || p_eagle_holes) h where h is null or h<1 or h>9) then raise exception 'Invalid hole selections.'; end if;
  if (round.rule_snapshot->>'scoringMode'='scramble') <> (participant.team_id is not null) then raise exception 'Team assignment does not match the frozen rules.'; end if;
  if cardinality(p_birdie_holes || p_eagle_holes)<>(select count(distinct h) from unnest(p_birdie_holes || p_eagle_holes) h) then raise exception 'Each scoring hole may be selected once.'; end if;
  -- A scramble/team total must not create individual birdie/giant-skin records.
  if participant.team_id is not null and cardinality(p_birdie_holes || p_eagle_holes)>0 then raise exception 'Team scores cannot record individual birdies or eagles.'; end if;
  if exists(select 1 from public.player_scores s join public.league_round_participants p on p.player_id=s.player_id and p.week_id=s.week_id::text where p.week_id=p_week_id and (p.player_id=player or (participant.team_id is not null and p.team_id=participant.team_id))) then raise exception 'A score already exists. Ask the commissioner to correct it.'; end if;
  for team_member in select * from public.league_round_participants where week_id=p_week_id and (player_id=player or (participant.team_id is not null and team_id=participant.team_id)) loop
    insert into public.player_scores(player_id,week_id,gross_score,net_score,handicap_used,birdie_holes,eagle_holes,is_team_score)
      -- The RPC accepts typed integer arrays for validation, but the existing
      -- score table stores JSONB. Preserve that format and all historical rows.
      values(team_member.player_id,p_week_id::integer,p_gross_score,p_gross_score-team_member.handicap_used,team_member.handicap_used,to_jsonb(p_birdie_holes),to_jsonb(p_eagle_holes),participant.team_id is not null);
  end loop;
  select jsonb_agg(to_jsonb(s)) into output from public.player_scores s join public.league_round_participants p on p.player_id=s.player_id and p.week_id=s.week_id::text where p.week_id=p_week_id and (p.player_id=player or (participant.team_id is not null and p.team_id=participant.team_id));
  return output;
end $$;

commit;
