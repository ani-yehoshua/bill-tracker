import { createClient } from '@/lib/supabase/client';
import type { BudgetRing } from '@/lib/types';
import type { Database } from '@/lib/database.types';

type RingRow = Database['public']['Tables']['budget_rings']['Row'];

export function rowToRing(row: RingRow): BudgetRing {
    return {
        id: row.id,
        name: row.name,
        targetAmount: Number(row.target_amount),
        color: row.color,
        icon: row.icon,
        kind: row.kind,
        sortOrder: row.sort_order,
    };
}

export function ringToRow(
    ring: Omit<BudgetRing, 'id'> & { id?: string },
    householdId: string,
): Database['public']['Tables']['budget_rings']['Insert'] {
    return {
        id: ring.id,
        household_id: householdId,
        name: ring.name,
        target_amount: ring.targetAmount,
        color: ring.color,
        icon: ring.icon,
        kind: ring.kind,
        sort_order: ring.sortOrder,
    };
}

export async function fetchRings(householdId: string): Promise<BudgetRing[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('budget_rings')
        .select('*')
        .eq('household_id', householdId)
        .is('archived_at', null)
        .order('sort_order');
    if (error) throw error;
    return (data ?? []).map(rowToRing);
}

export async function insertRing(
    ring: Omit<BudgetRing, 'id'> & { id: string },
    householdId: string,
) {
    const supabase = createClient();
    const { error } = await supabase
        .from('budget_rings')
        .insert(ringToRow(ring, householdId));
    if (error) throw error;
}

export async function updateRingRow(
    id: string,
    updates: Partial<BudgetRing>,
    householdId: string,
) {
    const supabase = createClient();
    const patch: Database['public']['Tables']['budget_rings']['Update'] = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.targetAmount !== undefined) patch.target_amount = updates.targetAmount;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.icon !== undefined) patch.icon = updates.icon;
    if (updates.kind !== undefined) patch.kind = updates.kind;
    if (updates.sortOrder !== undefined) patch.sort_order = updates.sortOrder;

    const { error } = await supabase
        .from('budget_rings')
        .update(patch)
        .eq('id', id)
        .eq('household_id', householdId);
    if (error) throw error;
}

export async function archiveRing(id: string, householdId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('budget_rings')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .eq('household_id', householdId);
    if (error) throw error;
}
