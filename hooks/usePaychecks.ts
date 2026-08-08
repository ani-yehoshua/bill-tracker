'use client';

import * as React from 'react';
import type { Paycheck } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
    fetchPaychecks,
    insertPaycheck,
    deletePaycheck,
} from '@/lib/db/paychecks';

export function usePaychecks(householdId: string, monthKey: string) {
    const [paychecks, setPaychecks] = React.useState<Paycheck[]>([]);

    const refetch = React.useCallback(async () => {
        try {
            setPaychecks(await fetchPaychecks(householdId, monthKey));
        } catch {
            // leave previous state
        }
    }, [householdId, monthKey]);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const rows = await fetchPaychecks(householdId, monthKey).catch(
                () => [] as Paycheck[],
            );
            if (!cancelled) setPaychecks(rows);
        })();
        return () => {
            cancelled = true;
        };
    }, [householdId, monthKey]);

    React.useEffect(() => {
        const supabase = createClient();
        let debounce: ReturnType<typeof setTimeout>;
        const channel = supabase
            .channel(`household:${householdId}:paychecks`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'paychecks',
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

    const addPaycheck = React.useCallback(
        async (paycheck: Paycheck) => {
            setPaychecks(prev => [paycheck, ...prev]);
            try {
                await insertPaycheck(paycheck, householdId);
            } catch (e) {
                setPaychecks(prev => prev.filter(p => p.id !== paycheck.id));
                throw e;
            }
        },
        [householdId],
    );

    const removePaycheck = React.useCallback(
        async (id: string) => {
            const prevPaychecks = paychecks;
            setPaychecks(prev => prev.filter(p => p.id !== id));
            try {
                await deletePaycheck(id, householdId);
            } catch (e) {
                setPaychecks(prevPaychecks);
                throw e;
            }
        },
        [paychecks, householdId],
    );

    return { paychecks, addPaycheck, removePaycheck, refetch };
}
