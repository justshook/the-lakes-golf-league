// Run against a disposable in-process Postgres, never a connected live project.
// npm install --prefix /tmp/lakes-db-test --no-save @electric-sql/pglite@0.3.14
// PGLITE_MODULE=/tmp/lakes-db-test/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-auth-migration.mjs
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.players(id bigint primary key,name text,email text,phone text,handicap numeric,availability text[],type text);
create table public.player_scores(id bigserial primary key,player_id bigint,week_id integer,gross_score numeric,net_score numeric,handicap_used numeric,birdie_holes integer[],eagle_holes integer[],is_team_score boolean);
create table public.tee_sheets(id bigint primary key,week_id integer,tee_sheet jsonb);
create table public.player_money(id bigint primary key,player_id bigint,week_id integer,amount numeric);
create table public.giant_skins(id bigint primary key);
create table public.weekly_games(id bigint primary key);
create table public.league_settings(id bigint primary key);
create table public.payout_templates(id text primary key);
insert into public.players values
(1,'Fixture One','one@example.test','private-1',8,array['3:30 PM'],'full-time'),
(2,'Fixture Two','two@example.test','private-2',12,array['3:30 PM'],'full-time'),
(3,'Duplicate One','duplicate@example.test','private-3',9,array['3:30 PM'],'full-time'),
(4,'Duplicate Two','duplicate@example.test','private-4',10,array['3:30 PM'],'full-time');
insert into auth.users values
('00000000-0000-0000-0000-000000000001','one@example.test',now(),'{}'),
('00000000-0000-0000-0000-000000000002','two@example.test',now(),'{}'),
('00000000-0000-0000-0000-000000000003','duplicate@example.test',now(),'{}'),
('00000000-0000-0000-0000-000000000004','unverified@example.test',null,'{}'),
('00000000-0000-0000-0000-000000000005','commissioner@example.test',now(),'{"league_role":"admin"}');
`);
const migration = await fs.readFile(new URL('../supabase/migrations/20261019015334_player_accounts_attendance_permissions.sql', import.meta.url),'utf8');
await db.exec(migration);
const ledgerMigration = await fs.readFile(new URL('../supabase/migrations/20261019015737_player_ledger.sql', import.meta.url), 'utf8');
await db.exec(ledgerMigration);
let checks=0;
const pass=()=>checks++;
async function asUser(id){await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);}
async function denied(sql,pattern){await assert.rejects(()=>db.query(sql),pattern);pass();}
await db.exec('set role anon;');
const roster=await db.query('select * from public.league_public_players');
assert.equal(roster.rows.length,4); assert.ok(!('email' in roster.rows[0]));assert.ok(!('phone' in roster.rows[0]));pass();
await denied('select * from public.players',/permission denied/);
await denied('select public.claim_league_player()',/permission denied/);
await asUser('00000000-0000-0000-0000-000000000001');
assert.equal((await db.query('select public.claim_league_player() profile')).rows[0].profile.player_id,1);pass();
assert.equal((await db.query('select * from public.players')).rows.length,1);pass();
await denied("insert into public.player_scores(id,player_id,week_id,gross_score) values(100,2,1,10)",/row-level security/);
await denied("select public.set_league_attendance('1','out')",/awaiting commissioner setup/);
await denied("select public.create_league_round(current_date+7,now()+interval '6 day','{\"scoringMode\":\"individual\",\"nineHoles\":\"front\"}')",/Commissioner/);
await asUser('00000000-0000-0000-0000-000000000003');
assert.equal((await db.query('select public.claim_league_player() profile')).rows[0].profile.player_id,null);pass();
await asUser('00000000-0000-0000-0000-000000000004');
await denied('select public.claim_league_player()',/Verify your email/);
await db.exec(`reset role; insert into public.league_rounds(week_id,date,attendance_deadline) values('1',(now() at time zone 'America/Chicago')::date,now()+interval '1 hour'),('2',(now() at time zone 'America/Chicago')::date,now()-interval '1 hour');`);
await asUser('00000000-0000-0000-0000-000000000001');
assert.equal((await db.query("select public.set_league_attendance('1','out') result")).rows[0].result.status,'out');pass();
await denied("select public.set_league_attendance('2','out')",/locked/);
await denied("insert into public.league_attendance values('1',2,'00000000-0000-0000-0000-000000000001','out',now())",/row-level security/);
await asUser('00000000-0000-0000-0000-000000000002');
await db.query('select public.claim_league_player()');
assert.equal((await db.query('select * from public.league_attendance')).rows.length,0);pass();
await asUser('00000000-0000-0000-0000-000000000005');
assert.equal((await db.query('select public.claim_league_player() profile')).rows[0].profile.is_admin,true);pass();
const sheet=JSON.stringify([{time:'3:30 PM',players:[1,2],teams:[{teamId:'team-a',teamType:'2-person',memberIds:[1,2]}]}]);
const members=JSON.stringify([{player_id:1,team_id:'team-a',handicap_used:5,tee_time:'3:30 PM'},{player_id:2,team_id:'team-a',handicap_used:5,tee_time:'3:30 PM'}]);
const rules=JSON.stringify({scoringMode:'scramble',teamType:'2-person',nineHoles:'front',handicapFormat:'scramble'});
const publish=()=>db.query('select public.publish_league_round($1,$2::jsonb,$3::jsonb,$4::jsonb)', ['1',sheet,members,rules]);
await assert.rejects(publish,/unavailable/);pass();
await asUser('00000000-0000-0000-0000-000000000001');
await db.query("select public.set_league_attendance('1','in')");
await asUser('00000000-0000-0000-0000-000000000005');
await assert.rejects(()=>db.query('select public.publish_league_round($1,$2::jsonb,$3::jsonb,$4::jsonb)', ['1', JSON.stringify([{time:'3:30 PM',players:[1,2],teams:[{teamId:'wrong-team',teamType:'2-person',memberIds:[1,2]}]}]),members,rules]),/Displayed team members/);pass();
await publish();pass();
await denied("update public.league_round_participants set handicap_used=50",/permission denied/);
await asUser('00000000-0000-0000-0000-000000000001');
await db.query("select public.set_league_attendance('1','out')");
await denied("select public.submit_league_score('1',35,array[]::integer[],array[]::integer[])",/withdrew/);
await db.query("select public.set_league_attendance('1','in')");
await denied("select public.submit_league_score('1',35,array[1],array[]::integer[])",/individual birdies/);
const scores=(await db.query("select public.submit_league_score('1',35,array[]::integer[],array[]::integer[]) scores")).rows[0].scores;
assert.equal(scores.length,2);assert.equal(scores[0].net_score,30);pass();
await denied("select public.set_league_attendance('1','out')",/locked/);
await denied("select public.submit_league_score('1',10,array[]::integer[],array[]::integer[])",/already exists/);
await asUser('00000000-0000-0000-0000-000000000005');
await assert.rejects(publish,/Scores already exist/);pass();
await denied("select public.cancel_league_round('1')",/scored round/);
const created=(await db.query("select public.create_league_round(current_date+7,now()+interval '6 day','{\"scoringMode\":\"individual\",\"nineHoles\":\"front\"}') round")).rows[0].round;
assert.match(created.week_id,/^\d{8}$/);pass();
// Real SQL/RLS coverage for immutable accounting and retry protection.
const ledgerEntry=(id,type,amount,extra={})=>({id,idempotencyKey:`key:${id}`,playerId:1,type,status:'posted',amountCents:amount,currency:'USD',reference:['payment','payout','refund'].includes(type)?`receipt:${id}`:null,occurredAt:'2026-01-01T12:00:00Z',description:'Fixture',...extra});
const record=entry=>db.query('select public.record_league_ledger_entry($1::jsonb) entry',[JSON.stringify(entry)]);
const award=ledgerEntry('award','award',10000);
await record(award);await record(award);
assert.equal((await db.query('select count(*)::integer n from public.league_ledger_entries')).rows[0].n,1);pass();
await assert.rejects(()=>record({...award,amountCents:10001}),/already used/);pass();
await record(ledgerEntry('payment','payment',20000));
await record(ledgerEntry('payout','payout',5000));
await assert.rejects(()=>record(ledgerEntry('excess-payout','payout',6000)),/exceeds recorded/);pass();
await record(ledgerEntry('refund','refund',1000,{relatedEntryId:'payment'}));
await assert.rejects(()=>record(ledgerEntry('excess-refund','refund',20000,{relatedEntryId:'payment'})),/exceeds the original/);pass();
await assert.rejects(()=>record(ledgerEntry('duplicate-receipt','payment',20000,{reference:'receipt:payment'})),/already been recorded/);pass();
await assert.rejects(()=>record(ledgerEntry('no-proof','payment',20000,{reference:null})),/reference is required/);pass();
await assert.rejects(()=>record(ledgerEntry('malformed','award',1.5)),/integer cents/);pass();
await denied("update public.league_ledger_entries set amount_cents=1",/permission denied/);
await asUser('00000000-0000-0000-0000-000000000002');
assert.equal((await db.query('select * from public.league_ledger_entries')).rows.length,0);pass();
await assert.rejects(()=>record(ledgerEntry('player-write','award',10000)),/Commissioner/);pass();
await asUser('00000000-0000-0000-0000-000000000001');
assert.equal((await db.query('select * from public.league_ledger_entries')).rows.length,4);pass();
await db.exec('reset role; set role anon;');
await denied('select * from public.league_ledger_entries',/permission denied/);
await assert.rejects(()=>record(ledgerEntry('anon-write','award',10000)),/permission denied/);pass();
await db.close();
console.log(`Passed ${checks} database security and transaction checks on a disposable representative legacy schema.`);
