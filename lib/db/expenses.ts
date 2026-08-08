import { createClient } from '@/lib/supabase/client';
import type { Expense } from '@/lib/types';
import type { Database } from '@/lib/database.types';

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

function rowToExpense(row: ExpenseRow): Expense {
    return {
        id: row.id,
        ringId: row.ring_id,
        amount: Number(row.amount),
        description: row.description ?? undefined,
        spentOn: row.spent_on,
        monthKey: row.month_key,
    };
}

export async function fetchExpenses(
    householdId: string,
    monthKey: string,
): Promise<Expense[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', householdId)
        .eq('month_key', monthKey)
        .order('spent_on', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToExpense);
}

export async function insertExpense(
    expense: Omit<Expense, 'monthKey'> & { monthKey: string },
    householdId: string,
) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('expenses').insert({
        id: expense.id,
        household_id: householdId,
        ring_id: expense.ringId,
        amount: expense.amount,
        description: expense.description ?? null,
        spent_on: expense.spentOn,
        month_key: expense.monthKey,
        created_by: userData.user?.id ?? null,
    });
    if (error) throw error;
}

export async function deleteExpense(id: string, householdId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId);
    if (error) throw error;
}
