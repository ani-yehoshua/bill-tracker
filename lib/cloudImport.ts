'use client';

import { runMigrations } from '@/lib/migrate';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_BILLS, STORAGE_PAID_PREFIX } from '@/lib/types';
import type { Bill } from '@/lib/types';
import { billToRow } from '@/lib/db/bills';
import { generateUuid } from '@/lib/uuid';

const IMPORT_FLAG = 'owed_imported_to_cloud_v1';

export interface PendingImport {
    localBills: Bill[];
    householdHasBills: boolean;
}

/**
 * Stage 1 of the pipeline is lib/migrate.ts (legacy keys -> owed_bills_v3).
 * This is stage 2: owed_bills_v3 -> Supabase, run once per device.
 *
 * Returns null if there's nothing to import or it already ran. Returns a
 * PendingImport otherwise — the caller decides whether to prompt (household
 * already has bills) or import silently (household is empty).
 */
export async function checkPendingImport(
    householdId: string,
): Promise<PendingImport | null> {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem(IMPORT_FLAG)) return null;

    runMigrations();
    const raw = localStorage.getItem(STORAGE_BILLS);
    const localBills: Bill[] = raw ? JSON.parse(raw) : [];
    if (localBills.length === 0) {
        localStorage.setItem(IMPORT_FLAG, new Date().toISOString());
        return null;
    }

    const supabase = createClient();
    const { count } = await supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .is('archived_at', null);

    return { localBills, householdHasBills: (count ?? 0) > 0 };
}

/**
 * Imports local bills into the household. Bill ids predate UUIDs
 * (Date.now().toString(36)+random), so every bill gets a fresh UUID
 * (generateUuid()) and paid records are remapped through the same idMap
 * in one atomic pass — otherwise every bill silently becomes unpaid.
 */
export async function importLocalBills(
    localBills: Bill[],
    householdId: string,
): Promise<void> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    const idMap = new Map<string, string>();
    for (const bill of localBills) idMap.set(bill.id, generateUuid());

    const billRows = localBills.map(bill => ({
        ...billToRow({ ...bill, id: idMap.get(bill.id)! }, householdId),
        created_by: userId,
    }));

    const { error: billsError } = await supabase.from('bills').insert(billRows);
    if (billsError) throw billsError;

    const paidRows: {
        bill_id: string;
        household_id: string;
        month_key: string;
        paid_by: string | null;
    }[] = [];
    for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(STORAGE_PAID_PREFIX)) continue;
        const monthKey = key.slice(STORAGE_PAID_PREFIX.length);
        const paid = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<
            string,
            boolean
        >;
        for (const [oldId, isPaid] of Object.entries(paid)) {
            const newId = idMap.get(oldId);
            if (isPaid && newId) {
                paidRows.push({
                    bill_id: newId,
                    household_id: householdId,
                    month_key: monthKey,
                    paid_by: userId,
                });
            }
        }
    }

    if (paidRows.length > 0) {
        const { error: paidError } = await supabase
            .from('bill_paid')
            .upsert(paidRows, { onConflict: 'bill_id,month_key' });
        if (paidError) throw paidError;
    }

    finishImport();
}

/** Marks the import as handled without uploading anything (user chose Discard). */
export function discardLocalImport(): void {
    finishImport();
}

function finishImport(): void {
    const ts = Date.now();
    const raw = localStorage.getItem(STORAGE_BILLS);
    if (raw) {
        localStorage.setItem(`${STORAGE_BILLS}__imported_${ts}`, raw);
        localStorage.removeItem(STORAGE_BILLS);
    }
    localStorage.setItem(IMPORT_FLAG, new Date().toISOString());
}
