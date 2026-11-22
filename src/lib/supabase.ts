import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 環境變數缺少時為 null，畫面會顯示設定說明，而不是直接壞掉 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

export const CONFIG_ERROR =
  '尚未設定 Supabase：請把 .env.example 複製成 .env.local，填入 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY 後重新啟動。';
