import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client. Uses the service role key which bypasses RLS,
// so this MUST never be imported into client-side code. Env vars are NOT
// prefixed with VITE_ so Vite's bundler cannot pick them up.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
