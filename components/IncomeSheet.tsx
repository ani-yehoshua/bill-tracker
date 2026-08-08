"use client";

import * as React from "react";
import type { Paycheck } from "@/lib/types";
import { formatCurrency } from "@/lib/types";
import { generateUuid } from "@/lib/uuid";

interface IncomeSheetProps {
    paychecks: Paycheck[];
    total: number;
    currentMonthKey: string;
    onAdd: (paycheck: Paycheck) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

export default function IncomeSheet({
    paychecks,
    total,
    currentMonthKey,
    onAdd,
    onDelete,
    onClose,
}: IncomeSheetProps) {
    const [amount, setAmount] = React.useState("");
    const [receivedOn, setReceivedOn] = React.useState(todayIso());
    const [source, setSource] = React.useState("");

    const handleAdd = () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) return;
        onAdd({
            id: generateUuid(),
            amount: amt,
            receivedOn,
            monthKey: currentMonthKey,
            source: source.trim() || undefined,
        });
        setAmount("");
        setSource("");
        setReceivedOn(todayIso());
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                zIndex: 200,
                display: "flex",
                alignItems: "flex-end",
                backdropFilter: "blur(4px)",
            }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div
                style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "24px 24px 0 0",
                    padding:
                        "28px 20px calc(28px + env(safe-area-inset-bottom, 0px))",
                    width: "100%",
                    maxHeight: "92dvh",
                    overflowY: "auto",
                }}>
                <div
                    style={{
                        width: 36,
                        height: 4,
                        background: "var(--muted)",
                        borderRadius: 2,
                        margin: "0 auto 20px",
                        opacity: 0.4,
                    }}
                />

                <div
                    style={{
                        fontFamily: "var(--font-dm-serif)",
                        fontSize: 22,
                        color: "var(--accent)",
                        marginBottom: 6,
                    }}>
                    💰 Income
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
                    Log each paycheck as it comes in to fill in this month&apos;s
                    income.
                </p>

                <div
                    style={{
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        marginBottom: 20,
                        textAlign: "center",
                    }}>
                    <div
                        style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 4,
                        }}>
                        This Month
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "var(--success)" }}>
                        {formatCurrency(total)}
                    </div>
                </div>

                {/* Quick add */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>+ Add Paycheck</label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                            marginBottom: 8,
                        }}>
                        <input
                            style={inputStyle}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            type='number'
                            inputMode='decimal'
                            placeholder='0.00'
                            min='0'
                            step='0.01'
                            autoFocus
                        />
                        <input
                            style={inputStyle}
                            value={receivedOn}
                            onChange={e => setReceivedOn(e.target.value)}
                            type='date'
                        />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            style={{ ...inputStyle, flex: 1 }}
                            value={source}
                            onChange={e => setSource(e.target.value)}
                            placeholder='Source (optional)'
                        />
                        <button
                            onClick={handleAdd}
                            style={{
                                background: "var(--accent)",
                                color: "#0f1117",
                                border: "none",
                                borderRadius: 12,
                                padding: "0 20px",
                                fontSize: 14,
                                fontWeight: 600,
                                fontFamily: "var(--font-dm-sans)",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}>
                            Add
                        </button>
                    </div>
                </div>

                {paychecks.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>This month&apos;s paychecks</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {paychecks.map(p => (
                                <div
                                    key={p.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        background: "var(--surface2)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 10,
                                        padding: "8px 12px",
                                    }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, color: "var(--text)" }}>
                                            {formatCurrency(p.amount)}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "var(--muted)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>
                                            {p.receivedOn}
                                            {p.source ? ` · ${p.source}` : ""}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onDelete(p.id)}
                                        aria-label='Delete paycheck'
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "var(--muted)",
                                            cursor: "pointer",
                                            fontSize: 13,
                                            flexShrink: 0,
                                        }}>
                                        🗑
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        width: "100%",
                        background: "transparent",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                        borderRadius: 14,
                        padding: 14,
                        fontSize: 15,
                        fontFamily: "var(--font-dm-sans)",
                        cursor: "pointer",
                    }}>
                    Close
                </button>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "13px 14px",
    color: "var(--text)",
    fontFamily: "var(--font-dm-sans)",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
};
