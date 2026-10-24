import { createClient } from '@supabase/supabase-js';

// Demo mode is explicit and never opens a connection to the live database.
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseConfigured = Boolean(url && key) && !isDemoMode;
export const supabase = supabaseConfigured ? createClient(url, key, { auth: { detectSessionInUrl: false, flowType: 'implicit', persistSession: true, autoRefreshToken: true } }) : null;
