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
        const { data, error } = await service
            .from('push_subscriptions')
            .update({
                notify_time: notifyTime ?? '09:00',
                utc_offset_minutes: utcOffsetMinutes ?? 0,
            })
            .eq('endpoint', endpoint)
            .eq('user_id', userData.user.id)
            .select('endpoint');

        if (error) throw error;

        // An UPDATE matching zero rows isn't a PostgREST error — without this
        // check, a stale/mismatched endpoint (e.g. after the browser silently
        // rotates its push subscription) reports "saved" while the device
        // keeps its previous notify_time/utc_offset_minutes indefinitely.
        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'Subscription not found' },
                { status: 404 },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Prefs update failed:', err);
        return NextResponse.json(
            { error: 'Failed to update preferences' },
            { status: 500 },
        );
    }
}
