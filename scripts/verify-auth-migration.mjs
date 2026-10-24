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
create table public.players(id integer primary key,name text,email text,phone text,handicap numeric default 0,availability jsonb default '[]'::jsonb,type text);
create table public.player_scores(id serial primary key,player_id integer not null,week_id integer not null,gross_score integer not null,net_score integer not null,handicap_used integer not null,birdie_holes jsonb default '[]'::jsonb,eagle_holes jsonb default '[]'::jsonb,is_team_score boolean default false,created_at timestamptz default now(),unique(player_id,week_id));
create table public.tee_sheets(id integer primary key,week_id integer,tee_sheet jsonb);
create table public.player_money(id integer primary key,player_id integer,week_id integer,category text,amount numeric,unique(player_id,week_id,category));
create table public.giant_skins(id integer primary key);
create table public.weekly_games(week_id integer primary key,game_name text,game_description text,side_game text,side_game_description text,team_type text,show_team_handicap boolean,reduced_handicap boolean);
create table public.league_settings(id integer primary key);
create table public.payout_templates(id text primary key,name text not null,payouts jsonb default '[]'::jsonb,side_game_total numeric default 0,is_default boolean default false,side_game_name text default '',side_game_description text default '');
-- Mirror the permissive legacy grants/policies discovered on the live tables,
-- then prove the migration actually removes their anonymous write paths.
grant all on all tables in schema public to anon,authenticated;
grant usage,select on all sequences in schema public to anon,authenticated;
do $$
declare target text;
begin
  foreach target in array array['players','tee_sheets','player_money','giant_skins','player_scores','weekly_games','league_settings','payout_templates'] loop
    execute format('alter table public.%I enable row level security',target);
    execute format('create policy legacy_open_all on public.%I for all to anon,authenticated using (true) with check (true)',target);
  end loop;
end $$;
insert into public.players values
(1,'Fixture One','one@example.test','private-1',8,'["3:30 PM"]'::jsonb,'full-time'),
(2,'Fixture Two','two@example.test','private-2',12,'["3:30 PM"]'::jsonb,'full-time'),
(3,'Duplicate One','duplicate@example.test','private-3',9,'["3:30 PM"]'::jsonb,'full-time'),
(4,'Duplicate Two','duplicate@example.test','private-4',10,'["3:30 PM"]'::jsonb,'full-time'),
(5,'Null availability',null,'private-5',null,null,'full-time');
insert into public.player_scores(id,player_id,week_id,gross_score,net_score,handicap_used,birdie_holes,eagle_holes,is_team_score,created_at) values
(1001,1,901,39,35,4,'[2,6]'::jsonb,'[8]'::jsonb,false,'2026-07-01T12:00:00Z'),
(1002,2,902,40,34,6,null,null,null,'2026-07-08T12:00:00Z');
insert into auth.users values
('00000000-0000-0000-0000-000000000001','one@example.test',now(),'{}'),
('00000000-0000-0000-0000-000000000002','two@example.test',now(),'{}'),
('00000000-0000-0000-0000-000000000003','duplicate@example.test',now(),'{}'),
('00000000-0000-0000-0000-000000000004','unverified@example.test',null,'{}'),
('00000000-0000-0000-0000-000000000005','commissioner@example.test',now(),'{"league_role":"admin"}');
`);
const legacyBefore = (await db.query('select to_jsonb(s) row from public.player_scores s order by id')).rows;
const legacyRosterBefore = (await db.query('select id,handicap,availability from public.players order by id')).rows;
const migration = await fs.readFile(new URL('../supabase/migrations/20261019015334_player_accounts_attendance_permissions.sql', import.meta.url),'utf8');
await db.exec(migration);
const ledgerMigration = await fs.readFile(new URL('../supabase/migrations/20261019015737_player_ledger.sql', import.meta.url), 'utf8');
await db.exec(ledgerMigration);
let checks=0;
const pass=()=>checks++;
assert.deepEqual((await db.query('select to_jsonb(s) row from public.player_scores s order by id')).rows,legacyBefore);pass();
assert.deepEqual((await db.query('select id,handicap,availability from public.players order by id')).rows,legacyRosterBefore);pass();
assert.equal((await db.query("select count(*)::integer n from pg_policies where schemaname='public' and policyname='legacy_open_all'")).rows[0].n,0);pass();
const preservedTypes=(await db.query("select table_name,column_name,data_type from information_schema.columns where table_schema='public' and ((table_name='players' and column_name='availability') or (table_name='player_scores' and column_name in ('birdie_holes','eagle_holes'))) order by table_name,column_name")).rows;
assert.equal(preservedTypes.length,3);assert.ok(preservedTypes.every(column=>column.data_type==='jsonb'));pass();
async function asUser(id){await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);}
async function denied(sql,pattern){await assert.rejects(()=>db.query(sql),pattern);pass();}
await db.exec('set role anon;');
const roster=await db.query('select * from public.league_public_players');
assert.equal(roster.rows.length,5); assert.ok(!('email' in roster.rows[0]));assert.ok(!('phone' in roster.rows[0]));pass();
assert.deepEqual(roster.rows.find(player=>player.id===5).availability,[]);pass();
await denied('select * from public.players',/permission denied/);
await denied('select * from public.league_settings',/permission denied/);
await denied('select public.claim_league_player()',/permission denied/);
await asUser('00000000-0000-0000-0000-000000000001');
assert.equal((await db.query('select public.claim_league_player() profile')).rows[0].profile.player_id,1);pass();
assert.equal((await db.query('select * from public.players')).rows.length,1);pass();
assert.deepEqual((await db.query("select public.set_league_availability(array['4:10 PM']) times")).rows[0].times,['4:10 PM']);
assert.deepEqual((await db.query('select availability from public.league_public_players where id=1')).rows[0].availability,['4:10 PM']);
assert.deepEqual((await db.query('select availability from public.players where id=1')).rows[0].availability,['3:30 PM']);pass();
await db.query("select public.set_league_availability(array[]::text[])");
assert.deepEqual((await db.query('select availability from public.league_public_players where id=1')).rows[0].availability,[]);pass();
await db.query("select public.set_league_availability(array['3:30 PM'])");
await denied("insert into public.player_scores(id,player_id,week_id,gross_score,net_score,handicap_used) values(100,2,1,10,10,0)",/row-level security/);
await denied("select public.set_league_attendance('1','out')",/awaiting commissioner setup/);
await denied("select public.create_league_round(current_date+7,now()+interval '6 day','{\"scoringMode\":\"individual\",\"nineHoles\":\"front\"}')",/Commissioner/);
await asUser('00000000-0000-0000-0000-000000000003');
assert.equal((await db.query('select public.claim_league_player() profile')).rows[0].profile.player_id,null);pass();
await asUser('00000000-0000-0000-0000-000000000004');
await denied('select public.claim_league_player()',/Verify your email/);
await db.exec(`reset role; insert into public.league_rounds(week_id,date,attendance_deadline) values('1',(now() at time zone 'America/Chicago')::date,(((now() at time zone 'America/Chicago')::date+1)::timestamp at time zone 'America/Chicago')),('2',(now() at time zone 'America/Chicago')::date,now()-interval '1 hour');`);
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
assert.equal(scores.length,2);assert.equal(scores[0].net_score,30);assert.deepEqual(scores[0].birdie_holes,[]);assert.deepEqual(scores[0].eagle_holes,[]);pass();
await denied("select public.set_league_attendance('1','out')",/locked/);
await denied("select public.submit_league_score('1',10,array[]::integer[],array[]::integer[])",/already exists/);
await asUser('00000000-0000-0000-0000-000000000005');
await assert.rejects(publish,/Scores already exist/);pass();
await denied("select public.cancel_league_round('1')",/scored round/);
const created=(await db.query("select public.create_league_round(current_date+7,now()+interval '6 day','{\"scoringMode\":\"individual\",\"nineHoles\":\"front\"}') round")).rows[0].round;
assert.match(created.week_id,/^\d{8}$/);pass();
// Individual cards persist validated nonempty arrays as JSONB in the actual
// legacy formats. Invalid selections cannot create a partial card.
await db.exec(`reset role; insert into public.league_rounds(week_id,date,attendance_deadline) values('3',(now() at time zone 'America/Chicago')::date,(((now() at time zone 'America/Chicago')::date+1)::timestamp at time zone 'America/Chicago'));`);
await asUser('00000000-0000-0000-0000-000000000005');
const individualSheet=JSON.stringify([{time:'3:30 PM',players:[1],teams:[]}]);
const individualMembers=JSON.stringify([{player_id:1,team_id:null,handicap_used:4,tee_time:'3:30 PM'}]);
const individualRules=JSON.stringify({scoringMode:'individual',teamType:null,nineHoles:'front'});
await assert.rejects(()=>db.query('select public.publish_league_round($1,$2::jsonb,$3::jsonb,$4::jsonb)', ['3',individualSheet,JSON.stringify([{player_id:1,team_id:null,handicap_used:4.5,tee_time:'3:30 PM'}]),individualRules]),/whole numbers/);pass();
await db.query('select public.publish_league_round($1,$2::jsonb,$3::jsonb,$4::jsonb)', ['3',individualSheet,individualMembers,individualRules]);
await asUser('00000000-0000-0000-0000-000000000001');
await denied("select public.submit_league_score('3',40,array[2,2],array[]::integer[])",/selected once/);
await denied("select public.submit_league_score('3',40,array[10],array[]::integer[])",/Invalid hole selections/);
await denied("select public.submit_league_score('3',40,array[[2,6]],array[]::integer[])",/Invalid hole selections/);
const individualScores=(await db.query("select public.submit_league_score('3',40,array[2,6],array[8]) scores")).rows[0].scores;
assert.equal(individualScores.length,1);assert.equal(individualScores[0].net_score,36);
assert.deepEqual(individualScores[0].birdie_holes,[2,6]);assert.deepEqual(individualScores[0].eagle_holes,[8]);pass();
assert.equal((await db.query("select pg_typeof(birdie_holes)::text type,jsonb_typeof(birdie_holes) shape from public.player_scores where week_id=3")).rows[0].type,'jsonb');pass();
await db.exec('reset role;');
assert.deepEqual((await db.query('select to_jsonb(s) row from public.player_scores s where id in (1001,1002) order by id')).rows,legacyBefore);pass();
await asUser('00000000-0000-0000-0000-000000000005');
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
console.log(`Passed ${checks} database security and transaction checks on a disposable legacy schema matching verified Lakes League column formats.`);
