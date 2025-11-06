import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file and restart the dev server.'
    );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to create a new client instance
export function createSupabaseClient() {
    return createClient<Database>(supabaseUrl as string, supabaseAnonKey as string);
}
