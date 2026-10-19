-- Close the remaining grants observed in the verified Lakes League project.
-- Object/data ownership and all historical rows remain unchanged. The first
-- two migrations define the explicit table/view/RPC access this app needs.
begin;

-- RLS does not protect sequences, TRUNCATE, or schema DDL. Earlier migrations
-- removed table-level TRUNCATE; remove legacy sequence mutation/read grants too.
-- Score inserts run through a checked SECURITY DEFINER RPC, so players do not
-- need direct nextval/setval access. Trusted service_role access is retained.
revoke create on schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

-- Future postgres-created public objects are private until a reviewed migration
-- grants the exact API access and enables appropriate RLS. These defaults do
-- not remove the intentional grants on existing league tables and RPCs.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;

-- PUBLIC EXECUTE is a built-in GLOBAL function default. A schema-specific
-- REVOKE cannot cancel it. This changes future postgres-created functions in
-- every schema; existing auth/storage/realtime functions are untouched.
alter default privileges for role postgres revoke execute on functions from public;

-- supabase_admin is a managed platform owner. Its default ACLs are deliberately
-- not modified here: this migration does not assume membership in that role.
-- Future app migrations must run as postgres, explicitly set RLS/grants, and
-- verify the resulting ACLs rather than rely on another owner's defaults.
commit;
