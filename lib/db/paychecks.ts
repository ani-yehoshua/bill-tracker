import { createClient } from '@/lib/supabase/client';
import type { Paycheck } from '@/lib/types';
import type { Database } from '@/lib/database.types';

type PaycheckRow = Database['public']['Tables']['paychecks']['Row'];

function rowToPaycheck(row: PaycheckRow): Paycheck {
    return {
        id: row.id,
        amount: Number(row.amount),
        receivedOn: row.received_on,
        monthKey: row.month_key,
        source: row.source ?? undefined,
        note: row.note ?? undefined,
    };
}

export async function fetchPaychecks(
    householdId: string,
    monthKey: string,
): Promise<Paycheck[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('paychecks')
        .select('*')
        .eq('household_id', householdId)
        .eq('month_key', monthKey)
        .order('received_on', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToPaycheck);
}

export async function insertPaycheck(paycheck: Paycheck, householdId: string) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('paychecks').insert({
        id: paycheck.id,
        household_id: householdId,
        user_id: userData.user?.id ?? null,
        amount: paycheck.amount,
        received_on: paycheck.receivedOn,
        month_key: paycheck.monthKey,
        source: paycheck.source ?? null,
        note: paycheck.note ?? null,
    });
    if (error) throw error;
}

export async function deletePaycheck(id: string, householdId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('paychecks')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId);
    if (error) throw error;
}
