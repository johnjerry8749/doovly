import { createClient } from '@supabase/supabase-js';

// Replace these with your real values from the Supabase dashboard
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Recommended for React Native
    storage: undefined, // you can later plug AsyncStorage / MMKV here if needed
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
