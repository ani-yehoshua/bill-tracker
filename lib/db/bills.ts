import { createClient } from '@/lib/supabase/client';
import type { Bill } from '@/lib/types';
import type { Database } from '@/lib/database.types';

type BillRow = Database['public']['Tables']['bills']['Row'];

export function rowToBill(row: BillRow): Bill {
    return {
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
}

export function billToRow(
    bill: Bill,
    householdId: string,
): Database['public']['Tables']['bills']['Insert'] {
    return {
        id: bill.id,
        household_id: householdId,
        name: bill.name,
        amount: bill.amount,
        due_day: bill.dueDay,
        due_month: bill.dueMonth ?? null,
        category: bill.category,
        recurrence: bill.recurrence,
        month_key: bill.monthKey ?? null,
        notes: bill.notes ?? null,
        notify_days_before: bill.notifyDaysBefore,
        color: bill.color ?? null,
    };
}

export async function fetchBills(householdId: string): Promise<Bill[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('household_id', householdId)
        .is('archived_at', null);
    if (error) throw error;
    return (data ?? []).map(rowToBill);
}

export async function insertBill(bill: Bill, householdId: string) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('bills').insert({
        ...billToRow(bill, householdId),
        created_by: userData.user?.id ?? null,
    });
    if (error) throw error;
}

export async function updateBillRow(
    id: string,
    updates: Partial<Bill>,
    householdId: string,
) {
    const supabase = createClient();
    const patch: Database['public']['Tables']['bills']['Update'] = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.amount !== undefined) patch.amount = updates.amount;
    if (updates.dueDay !== undefined) patch.due_day = updates.dueDay;
    if (updates.dueMonth !== undefined) patch.due_month = updates.dueMonth ?? null;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.recurrence !== undefined) patch.recurrence = updates.recurrence;
    if (updates.monthKey !== undefined) patch.month_key = updates.monthKey ?? null;
    if (updates.notes !== undefined) patch.notes = updates.notes ?? null;
    if (updates.notifyDaysBefore !== undefined)
        patch.notify_days_before = updates.notifyDaysBefore;
    if (updates.color !== undefined) patch.color = updates.color ?? null;

    const { error } = await supabase
        .from('bills')
        .update(patch)
        .eq('id', id)
        .eq('household_id', householdId);
    if (error) throw error;
}

export async function deleteBillRow(id: string, householdId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId);
    if (error) throw error;
}

export async function fetchPaid(
    householdId: string,
    monthKey: string,
): Promise<Record<string, true>> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('bill_paid')
        .select('bill_id')
        .eq('household_id', householdId)
        .eq('month_key', monthKey);
    if (error) throw error;
    const paid: Record<string, true> = {};
    for (const row of data ?? []) paid[row.bill_id] = true;
    return paid;
}

export async function markPaid(
    billId: string,
    householdId: string,
    monthKey: string,
) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('bill_paid')
        .upsert(
            {
                bill_id: billId,
                household_id: householdId,
                month_key: monthKey,
                paid_by: userData.user?.id ?? null,
            },
            { onConflict: 'bill_id,month_key' },
        );
    if (error) throw error;
}

export async function markUnpaid(billId: string, monthKey: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('bill_paid')
        .delete()
        .eq('bill_id', billId)
        .eq('month_key', monthKey);
    if (error) throw error;
}
