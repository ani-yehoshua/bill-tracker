import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Cross-browser fallback for a clicked magic-link email (not the in-app OTP
// code flow, which is the primary path — see components/AuthScreen.tsx).
// token_hash verification isn't PKCE, so it works even when the email link
// opens in a different browser than the one that requested it.
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next') ?? '/';

    if (token_hash && type) {
        const supabase = await createClient();
        const { error } = await supabase.auth.verifyOtp({ type, token_hash });
        if (!error) {
            redirect(next);
        }
    }

    redirect('/login?error=invalid_link');
}
