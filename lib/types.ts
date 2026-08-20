export type Category =
    | 'housing'
    | 'utility'
    | 'sub'
    | 'auto'
    | 'health'
    | 'other';

export type Recurrence = 'once' | 'monthly' | 'yearly';

export interface Bill {
    id: string;
    name: string;
    amount: number;
    dueDay: number; // day of month 1–31
    dueMonth?: number; // 0–11, only used for yearly bills
    category: Category;
    recurrence: Recurrence;
    monthKey?: string; // "YYYY-M" for one-time bills
    notes?: string;
    notifyDaysBefore: number;
    color?: string;
    // "YYYY-M": first month this bill should appear in. Set when a new bill
    // is added mid-cycle after its due date already passed — that cycle was
    // never really owed, so it's hidden until the one that actually is.
    startsMonthKey?: string;
}

export interface PaidRecord {
    [billId: string]: boolean;
}

export interface MonthlyPaid {
    [monthKey: string]: PaidRecord;
}

export const CATEGORIES: {
    id: Category;
    label: string;
    icon: string;
    color: string;
}[] = [
    { id: 'housing', label: 'Housing', icon: '🏠', color: '#7B9EF0' },
    { id: 'utility', label: 'Utilities', icon: '💡', color: '#F0C97B' },
    { id: 'sub', label: 'Subscriptions', icon: '📺', color: '#B07BF0' },
    { id: 'auto', label: 'Auto', icon: '🚗', color: '#7BF0C9' },
    { id: 'health', label: 'Health', icon: '💊', color: '#F07B7B' },
    { id: 'other', label: 'Other', icon: '📋', color: '#C8A96E' },
];

export const RECURRENCE_OPTIONS: {
    value: Recurrence;
    label: string;
    sublabel: string;
    icon: string;
}[] = [
    { value: 'monthly', label: 'Monthly', sublabel: 'Every month', icon: '🔄' },
    { value: 'yearly', label: 'Yearly', sublabel: 'Once a year', icon: '📅' },
    {
        value: 'once',
        label: 'One-time',
        sublabel: 'This month only',
        icon: '1️⃣',
    },
];

export const NOTIFY_OPTIONS = [
    { value: 0, label: 'Day of' },
    { value: 1, label: '1 day before' },
    { value: 3, label: '3 days before' },
    { value: 7, label: '1 week before' },
];

export const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export function getMonthKey(year: number, month: number) {
    return `${year}-${month}`;
}

/** Next calendar month's key, in the same "YYYY-M" (0-indexed) format. */
export function nextMonthKey(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    return month === 11 ? getMonthKey(year + 1, 0) : getMonthKey(year, month + 1);
}

/**
 * Chronological comparison of two "YYYY-M" keys — negative if `a` is
 * earlier, positive if later, 0 if equal. Never compare month_key strings
 * lexically: "2026-10" < "2026-7" as plain strings despite being later.
 */
function monthKeyCompare(a: string, b: string): number {
    const [ay, am] = a.split('-').map(Number);
    const [by, bm] = b.split('-').map(Number);
    return ay * 12 + am - (by * 12 + bm);
}

export function getCategoryInfo(id: Category) {
    return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[5];
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount);
}

export function ordinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Returns true if a bill should appear in the given monthKey */
export function billVisibleInMonth(bill: Bill, monthKey: string): boolean {
    if (bill.startsMonthKey && monthKeyCompare(monthKey, bill.startsMonthKey) < 0)
        return false;

    const [, month] = monthKey.split('-').map(Number);
    if (bill.recurrence === 'monthly') return true;
    if (bill.recurrence === 'once') return bill.monthKey === monthKey;
    // yearly: visible when the calendar month matches the bill's dueMonth
    if (bill.recurrence === 'yearly') {
        return bill.dueMonth === month;
    }
    return false;
}

export function isOverdue(
    bill: Bill,
    monthKey: string,
    paid: boolean,
): boolean {
    const today = new Date();
    const [year, month] = monthKey.split('-').map(Number);
    if (year !== today.getFullYear() || month !== today.getMonth())
        return false;
    return !paid && bill.dueDay < today.getDate();
}

export function isDueToday(
    bill: Bill,
    monthKey: string,
    paid: boolean,
): boolean {
    const today = new Date();
    const [year, month] = monthKey.split('-').map(Number);
    if (year !== today.getFullYear() || month !== today.getMonth())
        return false;
    return !paid && bill.dueDay === today.getDate();
}

export function isDueSoon(
    bill: Bill,
    monthKey: string,
    paid: boolean,
): boolean {
    const today = new Date();
    const [year, month] = monthKey.split('-').map(Number);
    if (year !== today.getFullYear() || month !== today.getMonth())
        return false;
    const daysUntilDue = bill.dueDay - today.getDate();
    // 1-3 days away, excludes today (isDueToday handles that)
    return !paid && daysUntilDue >= 1 && daysUntilDue <= 3;
}

// localStorage keys
export const STORAGE_BILLS = 'owed_bills_v3';
export const STORAGE_PAID_PREFIX = 'owed_paid_';
export const STORAGE_PUSH_SUB = 'owed_push_sub';

// ─── Budget rings / income (Phase 2) ───────────────────────────────────────────

export type RingKind = 'spend' | 'save';

export interface BudgetRing {
    id: string;
    name: string;
    targetAmount: number;
    color: string;
    icon: string;
    kind: RingKind;
    sortOrder: number;
}

export interface Expense {
    id: string;
    ringId: string | null;
    amount: number;
    description?: string;
    spentOn: string; // ISO date "YYYY-MM-DD"
    monthKey: string;
}

export interface Paycheck {
    id: string;
    amount: number;
    receivedOn: string; // ISO date "YYYY-MM-DD"
    monthKey: string;
    source?: string;
    note?: string;
}

export const RING_COLOR_PRESETS = [
    '#7BF0C9',
    '#B07BF0',
    '#F0C97B',
    '#6EC8A0',
    '#7B9EF0',
    '#F07B7B',
    '#C8A96E',
    '#E8C98E',
];

export const RING_ICON_PRESETS = [
    '🛒',
    '🧴',
    '⛽',
    '🏦',
    '🎮',
    '📚',
    '✈️',
    '🎁',
    '🍽️',
    '💳',
    '🐾',
    '🎯',
];

export const AVATAR_EMOJI_PRESETS = [
    '🙂',
    '😎',
    '🥳',
    '🤓',
    '🦊',
    '🐶',
    '🐱',
    '🐼',
    '🦁',
    '🐸',
    '🌈',
    '⭐',
];

export function ringProgress(ring: BudgetRing, spent: number): number {
    if (ring.targetAmount <= 0) return 0;
    return spent / ring.targetAmount;
}
