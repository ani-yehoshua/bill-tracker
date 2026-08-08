'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import { rotateInviteCode } from '@/lib/db/household';

export interface HouseholdMember {
    userId: string;
    role: 'owner' | 'member';
    email: string | null;
    displayName: string | null;
    avatarEmoji: string;
}

export function useHousehold(householdId: string) {
    const [name, setName] = React.useState('');
    const [inviteCode, setInviteCode] = React.useState<string | null>(null);
    const [members, setMembers] = React.useState<HouseholdMember[]>([]);
    const [loading, setLoading] = React.useState(true);

    const refetch = React.useCallback(async () => {
        const supabase = createClient();
        const [{ data: household }, { data: memberRows }] = await Promise.all([
            supabase
                .from('households')
                .select('name, invite_code')
                .eq('id', householdId)
                .single(),
            supabase
                .from('household_members')
                .select('user_id, role')
                .eq('household_id', householdId),
        ]);

        if (household) {
            setName(household.name);
            setInviteCode(household.invite_code);
        }

        if (memberRows && memberRows.length > 0) {
            const userIds = memberRows.map(r => r.user_id);
            const { data: profileRows } = await supabase
                .from('profiles')
                .select('id, email, display_name, avatar_emoji')
                .in('id', userIds);
            const profileById = new Map(
                (profileRows ?? []).map(p => [p.id, p]),
            );

            setMembers(
                memberRows.map(r => {
                    const profile = profileById.get(r.user_id);
                    return {
                        userId: r.user_id,
                        role: r.role,
                        email: profile?.email ?? null,
                        displayName: profile?.display_name ?? null,
                        avatarEmoji: profile?.avatar_emoji ?? '🙂',
                    };
                }),
            );
        } else {
            setMembers([]);
        }
        setLoading(false);
    }, [householdId]);

    React.useEffect(() => {
        refetch();
    }, [refetch]);

    const rotate = React.useCallback(async () => {
        const code = await rotateInviteCode();
        setInviteCode(code);
        return code;
    }, []);

    return { name, inviteCode, members, loading, refetch, rotate };
}
