// Hand-authored from supabase/migrations/20260804010000_auth_households_bills.sql.
// Regenerate with the Supabase CLI/MCP `generate_typescript_types` once available
// to catch schema drift automatically.

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    display_name: string | null;
                    avatar_emoji: string;
                    created_at: string;
                    updated_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
                    id: string;
                };
                Update: Partial<Database['public']['Tables']['profiles']['Row']>;
            };
            households: {
                Row: {
                    id: string;
                    name: string;
                    invite_code: string | null;
                    created_by: string | null;
                    currency: string;
                    created_at: string;
                    updated_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['households']['Row']>;
                Update: Partial<Database['public']['Tables']['households']['Row']>;
            };
            household_members: {
                Row: {
                    household_id: string;
                    user_id: string;
                    role: 'owner' | 'member';
                    joined_at: string;
                };
                Relationships: [];
                Insert: Partial<
                    Database['public']['Tables']['household_members']['Row']
                > & {
                    household_id: string;
                    user_id: string;
                };
                Update: Partial<Database['public']['Tables']['household_members']['Row']>;
            };
            bills: {
                Row: {
                    id: string;
                    household_id: string;
                    name: string;
                    amount: number;
                    due_day: number;
                    due_month: number | null;
                    category: string;
                    recurrence: 'once' | 'monthly' | 'yearly';
                    month_key: string | null;
                    notes: string | null;
                    notify_days_before: number;
                    color: string | null;
                    ring_id: string | null;
                    archived_at: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['bills']['Row']> & {
                    household_id: string;
                    name: string;
                    amount: number;
                    due_day: number;
                };
                Update: Partial<Database['public']['Tables']['bills']['Row']>;
            };
            bill_paid: {
                Row: {
                    id: string;
                    bill_id: string;
                    household_id: string;
                    month_key: string;
                    amount_paid: number | null;
                    paid_by: string | null;
                    paid_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['bill_paid']['Row']> & {
                    bill_id: string;
                    month_key: string;
                };
                Update: Partial<Database['public']['Tables']['bill_paid']['Row']>;
            };
            budget_rings: {
                Row: {
                    id: string;
                    household_id: string;
                    name: string;
                    target_amount: number;
                    color: string;
                    icon: string;
                    period: 'monthly' | 'weekly' | 'yearly';
                    kind: 'spend' | 'save';
                    sort_order: number;
                    archived_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['budget_rings']['Row']> & {
                    household_id: string;
                    name: string;
                };
                Update: Partial<Database['public']['Tables']['budget_rings']['Row']>;
            };
            expenses: {
                Row: {
                    id: string;
                    household_id: string;
                    ring_id: string | null;
                    amount: number;
                    description: string | null;
                    spent_on: string;
                    month_key: string;
                    created_by: string | null;
                    created_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['expenses']['Row']> & {
                    household_id: string;
                    amount: number;
                    month_key: string;
                };
                Update: Partial<Database['public']['Tables']['expenses']['Row']>;
            };
            paychecks: {
                Row: {
                    id: string;
                    household_id: string;
                    user_id: string | null;
                    amount: number;
                    received_on: string;
                    month_key: string;
                    source: string | null;
                    note: string | null;
                    created_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['paychecks']['Row']> & {
                    household_id: string;
                    amount: number;
                    month_key: string;
                };
                Update: Partial<Database['public']['Tables']['paychecks']['Row']>;
            };
            household_settings: {
                Row: {
                    household_id: string;
                    monthly_income_target: number | null;
                    payday_weekday: number | null;
                    updated_at: string;
                };
                Relationships: [];
                Insert: Partial<
                    Database['public']['Tables']['household_settings']['Row']
                > & { household_id: string };
                Update: Partial<Database['public']['Tables']['household_settings']['Row']>;
            };
            milestones: {
                Row: {
                    id: string;
                    household_id: string;
                    key: string;
                    achieved_at: string;
                    achieved_by: string | null;
                    meta: Json;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['milestones']['Row']> & {
                    household_id: string;
                    key: string;
                };
                Update: Partial<Database['public']['Tables']['milestones']['Row']>;
            };
            household_stats: {
                Row: {
                    household_id: string;
                    streak_current: number;
                    streak_best: number;
                    last_streak_month: string | null;
                    points: number;
                    updated_at: string;
                };
                Relationships: [];
                Insert: Partial<Database['public']['Tables']['household_stats']['Row']> & {
                    household_id: string;
                };
                Update: Partial<Database['public']['Tables']['household_stats']['Row']>;
            };
            push_subscriptions: {
                Row: {
                    id: string;
                    endpoint: string;
                    p256dh: string;
                    auth: string;
                    user_agent: string | null;
                    user_id: string | null;
                    household_id: string | null;
                    notify_time: string;
                    utc_offset_minutes: number;
                    last_sent_date: string | null;
                    last_sent_local_date: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Relationships: [];
                Insert: Partial<
                    Database['public']['Tables']['push_subscriptions']['Row']
                > & {
                    endpoint: string;
                    p256dh: string;
                    auth: string;
                };
                Update: Partial<Database['public']['Tables']['push_subscriptions']['Row']>;
            };
        };
        Views: Record<string, never>;
        Functions: {
            create_household: {
                Args: { p_name?: string };
                Returns: Database['public']['Tables']['households']['Row'];
            };
            join_household_by_code: {
                Args: { p_code: string };
                Returns: Database['public']['Tables']['households']['Row'];
            };
            rotate_invite_code: {
                Args: Record<PropertyKey, never>;
                Returns: string;
            };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}
