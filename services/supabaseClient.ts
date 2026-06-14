import { createClient } from '@supabase/supabase-js';

// Lấy biến môi trường. Trên Vercel bạn cần set:
// VITE_SUPABASE_URL
// VITE_SUPABASE_ANON_KEY

// Safely retrieve env vars handling cases where import.meta.env might be undefined
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
  }
  return '';
};

// Fallback to placeholder if missing to prevent "supabaseUrl is required" crash
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn("Supabase credentials missing! App will likely fail to load data. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);