import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env?.VITE_SUPABASE_URL;
const rawKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawUrl || 'https://zwfxgkgwnfdbddkciqfr.supabase.co';
const supabaseAnonKey = rawKey || 'sb_publishable_MbC2NT50ozmp8WJl_-G5pA_GqdN4l0j';

if (!rawUrl || !rawKey) {
  console.info('Supabase: Using default project credentials. For production, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

if (!supabaseUrl) {
  throw new Error('Supabase initialization failed: supabaseUrl is missing even with fallback.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
