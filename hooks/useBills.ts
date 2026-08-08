'use client';

import * as React from 'react';
import type { Bill } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
    fetchBills,
    insertBill,
    updateBillRow,
    deleteBillRow,
    fetchPaid,
    markPaid,
    markUnpaid,
} from '@/lib/db/bills';

export function useBills(householdId: string) {
    const [bills, setBills] = React.useState<Bill[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    const refetch = React.useCallback(async () => {
        try {
            setBills(await fetchBills(householdId));
        } catch {
            // leave previous state — the realtime channel or next mutation
            // will retry
        }
    }, [householdId]);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await fetchBills(householdId);
                if (!cancelled) setBills(rows);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [householdId]);

    React.useEffect(() => {
        const supabase = createClient();
        let debounce: ReturnType<typeof setTimeout>;
        const channel = supabase
            .channel(`household:${householdId}:bills`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bills',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    clearTimeout(debounce);
                    debounce = setTimeout(refetch, 150);
                },
            )
            .subscribe();
        return () => {
            clearTimeout(debounce);
            supabase.removeChannel(channel);
        };
    }, [householdId, refetch]);

    const addBill = React.useCallback(
        async (bill: Bill) => {
            setBills(prev => [...prev, bill]);
            try {
                await insertBill(bill, householdId);
            } catch (e) {
                setBills(prev => prev.filter(b => b.id !== bill.id));
                throw e;
            }
        },
        [householdId],
    );

    const updateBill = React.useCallback(
        async (id: string, updates: Partial<Bill>) => {
            const prevBills = bills;
            setBills(prev =>
                prev.map(b => (b.id === id ? { ...b, ...updates } : b)),
            );
            try {
                await updateBillRow(id, updates, householdId);
            } catch (e) {
                setBills(prevBills);
                throw e;
            }
        },
        [bills, householdId],
    );

    const deleteBill = React.useCallback(
        async (id: string) => {
            const prevBills = bills;
            setBills(prev => prev.filter(b => b.id !== id));
            try {
                await deleteBillRow(id, householdId);
            } catch (e) {
                setBills(prevBills);
                throw e;
            }
        },
        [bills, householdId],
    );

    return { bills, loaded, addBill, updateBill, deleteBill, refetch };
}

export function usePaid(householdId: string, monthKey: string) {
    const [paid, setPaid] = React.useState<Record<string, true>>({});

    const refetch = React.useCallback(async () => {
        try {
            setPaid(await fetchPaid(householdId, monthKey));
        } catch {
            // leave previous state
        }
    }, [householdId, monthKey]);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const rows = await fetchPaid(householdId, monthKey).catch(
                () => ({}) as Record<string, true>,
            );
            if (!cancelled) setPaid(rows);
        })();
        return () => {
            cancelled = true;
        };
    }, [householdId, monthKey]);

    React.useEffect(() => {
        const supabase = createClient();
        let debounce: ReturnType<typeof setTimeout>;
        const channel = supabase
            .channel(`household:${householdId}:bill_paid`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bill_paid',
                    filter: `household_id=eq.${householdId}`,
                },
                () => {
                    clearTimeout(debounce);
                    debounce = setTimeout(refetch, 150);
                },
            )
            .subscribe();
        return () => {
            clearTimeout(debounce);
            supabase.removeChannel(channel);
        };
    }, [householdId, refetch]);

    const togglePaid = React.useCallback(
        async (id: string) => {
            const wasPaid = !!paid[id];
            setPaid(prev => {
                const next = { ...prev };
                if (wasPaid) delete next[id];
                else next[id] = true;
                return next;
            });
            try {
                if (wasPaid) await markUnpaid(id, monthKey);
                else await markPaid(id, householdId, monthKey);
            } catch (e) {
                setPaid(prev => {
                    const next = { ...prev };
                    if (wasPaid) next[id] = true;
                    else delete next[id];
                    return next;
                });
                throw e;
            }
        },
        [paid, householdId, monthKey],
    );

    return { paid, togglePaid };
}
