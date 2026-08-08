import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // See app/page.tsx for why this must be filtered by user_id.
        const { data: membership } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', userData.user.id)
            .maybeSingle();

        const body = await req.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json(
                { error: 'Missing required subscription fields' },
                { status: 400 },
            );
        }

        const service = createServiceClient();
        const { error } = await service.from('push_subscriptions').upsert(
            {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                user_id: userData.user.id,
                household_id: membership?.household_id ?? null,
            },
            { onConflict: 'endpoint' },
        );

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Subscribe error:', err);
        return NextResponse.json(
            { error: 'Failed to save subscription' },
            { status: 500 },
        );
    }
}
