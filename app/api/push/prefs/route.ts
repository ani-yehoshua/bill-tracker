import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// Replaces the old /api/push/sync-bills — bills now live in the `bills`
// table and the cron reads them directly, so all this needs to sync is the
// device's own reminder-time preference.
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint, notifyTime, utcOffsetMinutes } = await req.json();
        if (!endpoint) {
            return NextResponse.json(
                { error: 'Missing endpoint' },
                { status: 400 },
            );
        }

        const service = createServiceClient();
        const { error } = await service
            .from('push_subscriptions')
            .update({
                notify_time: notifyTime ?? '09:00',
                utc_offset_minutes: utcOffsetMinutes ?? 0,
            })
            .eq('endpoint', endpoint)
            .eq('user_id', userData.user.id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Prefs update failed:', err);
        return NextResponse.json(
            { error: 'Failed to update preferences' },
            { status: 500 },
        );
    }
}
