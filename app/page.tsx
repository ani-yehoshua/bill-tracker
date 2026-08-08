import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BillsApp from '@/components/BillsApp';

export default async function Page() {
    const supabase = await createClient();

    // getUser(), not getSession() — this is the authorization boundary and
    // must validate against the auth server, not just read the cookie.
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) redirect('/login');

    // Filtered by user_id, not just RLS-scoped: hm_select makes every row in
    // a household visible to any member (so member lists can render), so an
    // unfiltered query returns 2+ rows once a second member joins and
    // .maybeSingle() throws — silently treated as "no membership" otherwise.
    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();
    if (!membership) redirect('/household/setup');

    return (
        <BillsApp userId={userData.user.id} householdId={membership.household_id} />
    );
}
