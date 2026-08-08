import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

// Memoized: multiple GoTrue instances in one tab cause token-refresh races.
export function createClient() {
    if (!client) {
        client = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        );
    }
    return client;
}
