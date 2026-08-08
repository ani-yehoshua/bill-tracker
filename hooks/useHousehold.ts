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
    const [inviteCodeExpiresAt, setInviteCodeExpiresAt] = React.useState<
        string | null
    >(null);
    const [members, setMembers] = React.useState<HouseholdMember[]>([]);
    const [loading, setLoading] = React.useState(true);

    const refetch = React.useCallback(async () => {
        const supabase = createClient();
        const [{ data: household }, { data: memberRows }] = await Promise.all([
            supabase
                .from('households')
                .select('name, invite_code, invite_code_expires_at')
                .eq('id', householdId)
                .single(),
            supabase
                .from('household_members')
                .select('user_id, role')
                .eq('household_id', householdId)
                .order('joined_at'),
        ]);

        if (household) {
            setName(household.name);
            setInviteCode(household.invite_code);
            setInviteCodeExpiresAt(household.invite_code_expires_at);
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
        // rotateInviteCode() only returns the new code; refetch to pick up
        // the new invite_code_expires_at that came with it.
        await refetch();
        return code;
    }, [refetch]);

    const rename = React.useCallback(
        async (newName: string) => {
            const supabase = createClient();
            const { error } = await supabase
                .from('households')
                .update({ name: newName })
                .eq('id', householdId);
            if (error) throw error;
            setName(newName);
        },
        [householdId],
    );

    const closeInvites = React.useCallback(async () => {
        const supabase = createClient();
        const { error } = await supabase
            .from('households')
            .update({ invite_code: null, invite_code_expires_at: null })
            .eq('id', householdId);
        if (error) throw error;
        setInviteCode(null);
        setInviteCodeExpiresAt(null);
    }, [householdId]);

    return {
        name,
        inviteCode,
        inviteCodeExpiresAt,
        members,
        loading,
        refetch,
        rotate,
        rename,
        closeInvites,
    };
}
