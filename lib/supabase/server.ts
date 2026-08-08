import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

// Fresh client per request — server components can't safely share module state.
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: cookiesToSet => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Called during a Server Component render, where cookies
                        // can't be set — safe to ignore since proxy.ts already
                        // refreshed the session for this request.
                    }
                },
            },
        },
    );
}
