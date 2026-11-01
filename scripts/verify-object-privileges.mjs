// Disposable PostgreSQL verification only. Never connects to a live project.
// PGLITE_MODULE=/tmp/lakes-db-test/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-object-privileges.mjs
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
let checks = 0;
const pass = () => checks++;
const migration = await fs.readFile(new URL('../supabase/migrations/20261019025446_harden_league_object_privileges.sql', import.meta.url), 'utf8');

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create role supabase_admin;
    grant usage on schema public to anon, authenticated, service_role;
    -- Match the audited old project's automatic public-schema exposure.
    alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
    alter default privileges for role supabase_admin in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges for role supabase_admin in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges for role supabase_admin in schema public grant execute on functions to anon, authenticated, service_role;
    create table public.legacy_records(id serial primary key, description text not null);
    insert into public.legacy_records(description) values('Preserved history');
    -- Prior migrations have already selected intentional existing object access.
    revoke all on public.legacy_records from public, anon, authenticated;
    grant select on public.legacy_records to anon, authenticated;
    create function public.existing_read() returns integer language sql as $$ select 42; $$;
    revoke all on function public.existing_read() from public, anon, authenticated;
    grant execute on function public.existing_read() to anon, authenticated;
    -- Represent current intentional write API: only the definer consumes IDs.
    create function public.existing_insert() returns integer language sql security definer set search_path='' as $$
      insert into public.legacy_records(description) values('Checked RPC fixture') returning id;
    $$;
    revoke all on function public.existing_insert() from public, anon, authenticated;
    grant execute on function public.existing_insert() to authenticated;
    create schema platform_fixture;
    create table platform_fixture.untouched(id integer);
    grant all on platform_fixture.untouched to anon, authenticated;
    create function platform_fixture.untouched() returns integer language sql as $$ select 7; $$;
  `);
  const managedBefore = (await db.query("select defaclobjtype,defaclacl::text acl from pg_default_acl where defaclrole='supabase_admin'::regrole order by defaclobjtype")).rows;
  const existingBefore = (await db.query("select c.oid::regclass::text name,c.relacl::text acl from pg_class c where c.oid in ('public.legacy_records'::regclass,'platform_fixture.untouched'::regclass) order by name")).rows;
  const functionBefore = (await db.query("select p.oid::regprocedure::text name,p.proacl::text acl from pg_proc p where p.oid in ('public.existing_read()'::regprocedure,'public.existing_insert()'::regprocedure,'platform_fixture.untouched()'::regprocedure) order by name")).rows;
  const sequenceBefore = (await db.query('select last_value,is_called from public.legacy_records_id_seq')).rows;
  await db.exec(migration);

  assert.deepEqual((await db.query("select id,description from public.legacy_records order by id")).rows, [{ id: 1, description: 'Preserved history' }]); pass();
  assert.deepEqual((await db.query('select last_value,is_called from public.legacy_records_id_seq')).rows, sequenceBefore); pass();
  assert.deepEqual((await db.query("select c.oid::regclass::text name,c.relacl::text acl from pg_class c where c.oid in ('public.legacy_records'::regclass,'platform_fixture.untouched'::regclass) order by name")).rows, existingBefore); pass();
  assert.deepEqual((await db.query("select p.oid::regprocedure::text name,p.proacl::text acl from pg_proc p where p.oid in ('public.existing_read()'::regprocedure,'public.existing_insert()'::regprocedure,'platform_fixture.untouched()'::regprocedure) order by name")).rows, functionBefore); pass();
  assert.deepEqual((await db.query("select defaclobjtype,defaclacl::text acl from pg_default_acl where defaclrole='supabase_admin'::regrole order by defaclobjtype")).rows, managedBefore); pass();

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    assert.equal((await db.query("select has_schema_privilege(current_user,'public','CREATE') allowed")).rows[0].allowed, false); pass();
    for (const operation of ["select nextval('public.legacy_records_id_seq')", "select setval('public.legacy_records_id_seq',9000)", 'select last_value from public.legacy_records_id_seq']) {
      await assert.rejects(() => db.query(operation), /permission denied/); pass();
    }
    assert.equal((await db.query('select public.existing_read() answer')).rows[0].answer, 42); pass();
    assert.equal((await db.query('select count(*)::integer total from public.legacy_records')).rows[0].total, 1); pass();
    await assert.rejects(() => db.query('truncate public.legacy_records'), /permission denied/); pass();
    await db.exec('reset role');
  }
  // Explicit checked RPCs retain sequence access through their trusted owner.
  await db.exec('set role authenticated');
  assert.equal((await db.query('select public.existing_insert() id')).rows[0].id, 2); pass();
  await db.exec('reset role');

  // The dangerous failure mode is a newly created table with RLS accidentally
  // omitted. It must still be unreachable until explicitly granted access.
  await db.exec(`
    create table public.future_private(id serial primary key, amount_cents bigint);
    insert into public.future_private(amount_cents) values(1000);
    create function public.future_private_function() returns integer language sql security definer set search_path='' as $$ select 99; $$;
  `);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    for (const operation of ['select * from public.future_private', 'insert into public.future_private(amount_cents) values(2000)', 'truncate public.future_private', "select nextval('public.future_private_id_seq')", 'select public.future_private_function()']) {
      await assert.rejects(() => db.query(operation), /permission denied/); pass();
    }
    await db.exec('reset role');
  }
  // Trusted server grants were not removed from existing or future objects.
  assert.equal((await db.query("select has_sequence_privilege('service_role','public.legacy_records_id_seq','USAGE') allowed")).rows[0].allowed, true); pass();
  assert.equal((await db.query("select has_table_privilege('service_role','public.future_private','INSERT') allowed")).rows[0].allowed, true); pass();
  assert.equal((await db.query("select has_function_privilege('service_role','public.future_private_function()','EXECUTE') allowed")).rows[0].allowed, true); pass();
  // Idempotence: repeat grants hardening without dropping/recreating anything.
  await db.exec(migration);
  assert.equal((await db.query('select count(*)::integer total from public.legacy_records')).rows[0].total, 2); pass();
  console.log(`Passed ${checks} object-privilege checks on disposable PostgreSQL. No live database was contacted.`);
} finally {
  await db.close();
}
