'use client';

import * as React from 'react';
import type { Expense } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { fetchExpenses, insertExpense, deleteExpense } from '@/lib/db/expenses';

export function useExpenses(householdId: string, monthKey: string) {
    const [expenses, setExpenses] = React.useState<Expense[]>([]);

    const refetch = React.useCallback(async () => {
        try {
            setExpenses(await fetchExpenses(householdId, monthKey));
        } catch {
            // leave previous state
        }
    }, [householdId, monthKey]);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const rows = await fetchExpenses(householdId, monthKey).catch(
                () => [] as Expense[],
            );
            if (!cancelled) setExpenses(rows);
        })();
        return () => {
            cancelled = true;
        };
    }, [householdId, monthKey]);

    React.useEffect(() => {
        const supabase = createClient();
        let debounce: ReturnType<typeof setTimeout>;
        const channel = supabase
            .channel(`household:${householdId}:expenses`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'expenses',
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

    const addExpense = React.useCallback(
        async (expense: Expense) => {
            setExpenses(prev => [expense, ...prev]);
            try {
                await insertExpense(expense, householdId);
            } catch (e) {
                setExpenses(prev => prev.filter(x => x.id !== expense.id));
                throw e;
            }
        },
        [householdId],
    );

    const removeExpense = React.useCallback(
        async (id: string) => {
            const prevExpenses = expenses;
            setExpenses(prev => prev.filter(x => x.id !== id));
            try {
                await deleteExpense(id, householdId);
            } catch (e) {
                setExpenses(prevExpenses);
                throw e;
            }
        },
        [expenses, householdId],
    );

    return { expenses, addExpense, removeExpense, refetch };
}
