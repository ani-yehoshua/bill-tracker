import { NextRequest, NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase/service';
import type { Bill } from '@/lib/types';
import { getMonthKey } from '@/lib/types';

webpush.setVapidDetails(
    'mailto:owed-app@notifications.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

function getBillsDueForReminder(bills: Bill[], monthKey: string): Bill[] {
    const [todayYear, todayMonth] = monthKey.split('-').map(Number);
    const todayDate = new Date().getDate();

    return bills.filter(bill => {
        if (bill.recurrence === 'once') {
            const [y, m] = (bill.monthKey ?? '').split('-').map(Number);
            if (y !== todayYear || m !== todayMonth) return false;
        }
        if (bill.recurrence === 'yearly') {
            if (bill.dueMonth !== todayMonth) return false;
        }

        const reminderDay = bill.dueDay - bill.notifyDaysBefore;
        if (reminderDay < 1) return false;
        return reminderDay === todayDate;
    });
}

/** 'YYYY-MM-DD' in a timezone utcOffsetMinutes away from UTC (getTimezoneOffset sign convention). */
function localDateString(utcOffsetMinutes: number): string {
    const local = new Date(Date.now() - utcOffsetMinutes * 60_000);
    return local.toISOString().slice(0, 10);
}

/** Same convention: month/day derived from the device's local date, not UTC. */
function localMonthKey(utcOffsetMinutes: number): string {
    const local = new Date(Date.now() - utcOffsetMinutes * 60_000);
    return getMonthKey(local.getUTCFullYear(), local.getUTCMonth());
}

/**
 * Converts the user's preferred local time to UTC using their stored
 * timezone offset, then fires on the first cron run at or after that
 * UTC hour. Guards against double-sending with last_sent_local_date.
 */
function shouldSendNow(
    preferredTime: string,
    utcOffsetMinutes: number,
    lastSentLocalDate: string | null,
): boolean {
    const [prefHour, prefMinute] = preferredTime.split(':').map(Number);
    const now = new Date();

    // Already sent today (in the device's own local date) — don't resend.
    if (lastSentLocalDate === localDateString(utcOffsetMinutes)) return false;

    // Convert preferred local time to UTC. getTimezoneOffset() is positive
    // for zones behind UTC (e.g. Central = 300/360) and NEGATIVE for zones
    // ahead of UTC — a plain `% 24` on a negative value stays negative in
    // JS, which previously made `now.getUTCHours() >= prefUTCHour` always
    // true for those zones (fired at 00:00 UTC regardless of preference).
    const prefLocalMinutes = prefHour * 60 + prefMinute;
    const prefUTCMinutesRaw = prefLocalMinutes + utcOffsetMinutes;
    const prefUTCMinutes = ((prefUTCMinutesRaw % 1440) + 1440) % 1440;
    const prefUTCHour = Math.floor(prefUTCMinutes / 60);

    // Fire on the first cron run at or after the preferred UTC hour.
    return now.getUTCHours() >= prefUTCHour;
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .not('household_id', 'is', null);

    if (subError) {
        console.error('Failed to fetch subscriptions:', subError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
        return NextResponse.json({ sent: 0, message: 'No subscriptions' });
    }

    const householdIds = [
        ...new Set(subscriptions.map(s => s.household_id!)),
    ];

    const { data: billRows, error: billError } = await supabase
        .from('bills')
        .select('*')
        .in('household_id', householdIds)
        .is('archived_at', null);

    if (billError) {
        console.error('Failed to fetch bills:', billError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    const billsByHousehold = new Map<string, Bill[]>();
    for (const row of billRows ?? []) {
        const bill: Bill = {
            id: row.id,
            name: row.name,
            amount: Number(row.amount),
            dueDay: row.due_day,
            dueMonth: row.due_month ?? undefined,
            category: row.category as Bill['category'],
            recurrence: row.recurrence,
            monthKey: row.month_key ?? undefined,
            notes: row.notes ?? undefined,
            notifyDaysBefore: row.notify_days_before,
            color: row.color ?? undefined,
        };
        const list = billsByHousehold.get(row.household_id) ?? [];
        list.push(bill);
        billsByHousehold.set(row.household_id, list);
    }

    // Bills already marked paid this month, per household — don't nag about those.
    // (Per-subscription month keys, using each device's own UTC offset, are
    // computed in the loop below.)
    const { data: paidRows } = await supabase
        .from('bill_paid')
        .select('bill_id, household_id, month_key')
        .in('household_id', householdIds);

    const paidSet = new Set(
        (paidRows ?? []).map(r => `${r.household_id}:${r.month_key}:${r.bill_id}`),
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
        const notifyTime = sub.notify_time ?? '09:00';
        const utcOffsetMinutes = sub.utc_offset_minutes ?? 0;
        const lastSentLocalDate = sub.last_sent_local_date ?? null;
        const householdId = sub.household_id;
        if (!householdId) continue;

        if (!shouldSendNow(notifyTime, utcOffsetMinutes, lastSentLocalDate)) {
            skipped++;
            continue;
        }

        const monthKey = localMonthKey(utcOffsetMinutes);
        const bills = billsByHousehold.get(householdId) ?? [];
        const billsDue = getBillsDueForReminder(bills, monthKey).filter(
            bill => !paidSet.has(`${householdId}:${monthKey}:${bill.id}`),
        );
        if (billsDue.length === 0) continue;

        // Claim today's send slot BEFORE delivering anything. Writing
        // last_sent_local_date afterwards (and not checking its error, as
        // this used to) means a failed write leaves no record that we
        // already reminded — and since shouldSendNow is a `>=` window, every
        // later cron run this UTC day resends. Claiming first inverts the
        // failure mode: a write we can't perform means we skip this run
        // rather than risk an unbounded resend loop, and the conditional
        // filter makes the claim atomic against overlapping runs.
        const localToday = localDateString(utcOffsetMinutes);
        const { data: claimed, error: claimError } = await supabase
            .from('push_subscriptions')
            .update({ last_sent_local_date: localToday })
            .eq('endpoint', sub.endpoint)
            .or(
                `last_sent_local_date.is.null,last_sent_local_date.neq.${localToday}`,
            )
            .select('endpoint');

        if (claimError) {
            console.error(
                'Could not claim reminder slot, skipping send:',
                claimError,
            );
            failed++;
            continue;
        }
        if (!claimed || claimed.length === 0) {
            // Another concurrent run already claimed today for this device.
            skipped++;
            continue;
        }

        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        for (const bill of billsDue) {
            const body =
                bill.notifyDaysBefore === 0
                    ? `${bill.name} is due today — $${bill.amount.toFixed(2)}`
                    : bill.notifyDaysBefore === 1
                      ? `${bill.name} is due tomorrow — $${bill.amount.toFixed(2)}`
                      : `${bill.name} is due in ${bill.notifyDaysBefore} days — $${bill.amount.toFixed(2)}`;

            const payload = JSON.stringify({
                title: '💳 Bill Reminder',
                body,
                tag: bill.id,
                url: '/',
            });

            try {
                await webpush.sendNotification(pushSubscription, payload);
                sent++;
            } catch (err: unknown) {
                if (
                    err &&
                    typeof err === 'object' &&
                    'statusCode' in err &&
                    (err.statusCode === 404 || err.statusCode === 410)
                ) {
                    expiredEndpoints.push(sub.endpoint);
                } else {
                    console.error('Push send failed:', err);
                    failed++;
                }
            }
        }
    }

    // Remove expired subscriptions
    if (expiredEndpoints.length > 0) {
        await supabase
            .from('push_subscriptions')
            .delete()
            .in('endpoint', expiredEndpoints);
    }

    return NextResponse.json({
        sent,
        failed,
        skipped,
        expired: expiredEndpoints.length,
    });
}
