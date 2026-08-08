import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HouseholdGate from '@/components/HouseholdGate';

export default async function HouseholdSetupPage() {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) redirect('/login');

    // See app/page.tsx for why this must be filtered by user_id.
    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();
    if (membership) redirect('/');

    return <HouseholdGate />;
}
