import { createClient } from '@/lib/supabase/client';

export type HouseholdErrorCode =
    | 'not_authenticated'
    | 'already_in_household'
    | 'invalid_code'
    | 'no_household'
    | 'unknown';

export function parseHouseholdError(message: string): HouseholdErrorCode {
    if (message.includes('not_authenticated')) return 'not_authenticated';
    if (message.includes('already_in_household')) return 'already_in_household';
    if (message.includes('invalid_code')) return 'invalid_code';
    if (message.includes('no_household')) return 'no_household';
    return 'unknown';
}

export async function createHousehold(name?: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_household', {
        p_name: name,
    });
    if (error) throw error;
    return data;
}

export async function joinHouseholdByCode(code: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('join_household_by_code', {
        p_code: code,
    });
    if (error) throw error;
    return data;
}

export async function rotateInviteCode() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('rotate_invite_code');
    if (error) throw error;
    return data;
}

export async function fetchMembership() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    // See app/page.tsx for why this must be filtered by user_id: hm_select
    // makes every row in a household visible to any member, so an
    // unfiltered query returns 2+ rows once a second member joins.
    const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', userData.user.id)
        .maybeSingle();
    if (error) throw error;
    return data;
}
