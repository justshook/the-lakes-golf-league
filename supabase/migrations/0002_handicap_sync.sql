-- Weekly handicap sync: snapshot history + run summaries.
-- Run this once via the Supabase SQL editor (or psql) before deploying the cron.

create table if not exists handicap_history (
  id           bigserial primary key,
  player_id    int not null references players(id) on delete cascade,
  handicap     numeric not null,
  recorded_at  timestamptz not null default now()
);
create index if not exists handicap_history_player_recorded_idx
  on handicap_history(player_id, recorded_at desc);

do $$ begin
  create type sync_status as enum ('running','success','partial','failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists handicap_sync_runs (
  id              bigserial primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          sync_status not null default 'running',
  summary         jsonb not null default '{}'::jsonb,
  error_message   text
);
create index if not exists handicap_sync_runs_started_idx
  on handicap_sync_runs(started_at desc);

alter table handicap_history   enable row level security;
alter table handicap_sync_runs enable row level security;

drop policy if exists "read all" on handicap_history;
drop policy if exists "read all" on handicap_sync_runs;
create policy "read all" on handicap_history   for select using (true);
create policy "read all" on handicap_sync_runs for select using (true);
-- Writes happen only from the serverless function using the service role key,
-- which bypasses RLS, so no insert/update policy is needed for anon/authenticated.
