import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

export async function updateProfile(
    userId: string,
    updates: { displayName?: string; avatarEmoji?: string },
) {
    const supabase = createClient();
    const patch: Database['public']['Tables']['profiles']['Update'] = {};
    if (updates.displayName !== undefined)
        patch.display_name = updates.displayName;
    if (updates.avatarEmoji !== undefined)
        patch.avatar_emoji = updates.avatarEmoji;

    const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId);
    if (error) throw error;
}
