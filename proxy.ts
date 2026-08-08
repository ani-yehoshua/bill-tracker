import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Refreshes the Supabase session cookie only — this does NOT authorize.
// Authorization happens in each page/route (see app/page.tsx). See
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: cookiesToSet => {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    // Must rebuild response from the request carrying the
                    // updated cookies, and return THIS object below — a
                    // fresh NextResponse.next() here drops the rotated
                    // refresh token and randomly logs users out.
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // getClaims() verifies the JWT locally against cached JWKS — no network
    // round-trip per request, unlike getUser().
    await supabase.auth.getClaims();

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*\\.png|api/cron).*)',
    ],
};
