'use client';

import * as React from 'react';
import type { BudgetRing } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
    fetchRings,
    insertRing,
    updateRingRow,
    archiveRing,
} from '@/lib/db/budgetRings';

export function useBudgetRings(householdId: string) {
    const [rings, setRings] = React.useState<BudgetRing[]>([]);
    const [loaded, setLoaded] = React.useState(false);

    const refetch = React.useCallback(async () => {
        try {
            setRings(await fetchRings(householdId));
        } catch {
            // leave previous state — the realtime channel or next mutation
            // will retry
        }
    }, [householdId]);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await fetchRings(householdId);
                if (!cancelled) setRings(rows);
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
            .channel(`household:${householdId}:budget_rings`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'budget_rings',
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

    const addRing = React.useCallback(
        async (ring: BudgetRing) => {
            setRings(prev => [...prev, ring]);
            try {
                await insertRing(ring, householdId);
            } catch (e) {
                setRings(prev => prev.filter(r => r.id !== ring.id));
                throw e;
            }
        },
        [householdId],
    );

    const updateRing = React.useCallback(
        async (id: string, updates: Partial<BudgetRing>) => {
            const prevRings = rings;
            setRings(prev =>
                prev.map(r => (r.id === id ? { ...r, ...updates } : r)),
            );
            try {
                await updateRingRow(id, updates, householdId);
            } catch (e) {
                setRings(prevRings);
                throw e;
            }
        },
        [rings, householdId],
    );

    const removeRing = React.useCallback(
        async (id: string) => {
            const prevRings = rings;
            setRings(prev => prev.filter(r => r.id !== id));
            try {
                await archiveRing(id, householdId);
            } catch (e) {
                setRings(prevRings);
                throw e;
            }
        },
        [rings, householdId],
    );

    return { rings, loaded, addRing, updateRing, removeRing, refetch };
}
