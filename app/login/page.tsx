import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthScreen from '@/components/AuthScreen';

export default async function LoginPage() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect('/');

    return <AuthScreen />;
}
