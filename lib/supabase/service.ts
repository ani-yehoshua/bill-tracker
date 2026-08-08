import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Server-only. Bypasses RLS entirely — never import this into client code.
export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SECRET_KEY!;
    return createClient<Database>(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
