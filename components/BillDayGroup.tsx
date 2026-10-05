"use client";

import type { ReactNode } from "react";
import type { Bill } from "@/lib/types";
import { formatCurrency, isOverdue, ordinal } from "@/lib/types";

interface BillDayGroupProps {
    dueDay: number;
    bills: Bill[];
    monthKey: string;
    paid: Record<string, true>;
    expanded: boolean;
    onToggle: () => void;
    children: ReactNode;
}

/**
 * Collapsible wrapper for bills that share a due day. The header carries
 * enough state (paid progress, total, overdue tint) that collapsing a day
 * never hides something that needs attention.
 */
export default function BillDayGroup({
    dueDay,
    bills,
    monthKey,
    paid,
    expanded,
    onToggle,
    children,
}: BillDayGroupProps) {
    const paidCount = bills.filter(b => paid[b.id]).length;
    const allPaid = paidCount === bills.length;
    const anyOverdue = bills.some(b => isOverdue(b, monthKey, !!paid[b.id]));
    const total = bills.reduce((s, b) => s + b.amount, 0);

    const accent = anyOverdue
        ? "var(--danger)"
        : allPaid
          ? "var(--success)"
          : "var(--accent)";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
                onClick={onToggle}
                aria-expanded={expanded}
                style={{
                    background: "var(--surface)",
                    border: `1px solid ${anyOverdue ? "var(--danger)" : "var(--border)"}`,
                    borderRadius: 16,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    fontFamily: "var(--font-dm-sans)",
                    textAlign: "left",
                    opacity: allPaid && !expanded ? 0.6 : 1,
                    transition: "opacity 0.2s",
                }}>
                <span
                    style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        transform: expanded ? "rotate(90deg)" : "none",
                        transition: "transform 0.15s",
                        flexShrink: 0,
                    }}>
                    ▶
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text)",
                        }}>
                        Due the {ordinal(dueDay)}
                    </div>
                    <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>
                        {anyOverdue
                            ? "Overdue · "
                            : ""}
                        {paidCount} of {bills.length} paid
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text)",
                        flexShrink: 0,
                    }}>
                    {formatCurrency(total)}
                </div>
            </button>
            {expanded && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        paddingLeft: 12,
                    }}>
                    {children}
                </div>
            )}
        </div>
    );
}
