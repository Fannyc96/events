import { createClient } from '@supabase/supabase-js';

export function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('缺少環境變數 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（GitHub Secrets：VITE_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY）');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const OUT_DIR = 'automation/out';
