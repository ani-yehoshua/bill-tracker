"use client";

import * as React from "react";
import type { BudgetRing, Expense, RingKind } from "@/lib/types";
import { RING_COLOR_PRESETS, RING_ICON_PRESETS, formatCurrency } from "@/lib/types";
import { generateUuid } from "@/lib/uuid";

interface RingSheetProps {
    initial: BudgetRing | null;
    spent: number;
    expenses: Expense[];
    onSave: (ring: BudgetRing) => void;
    onRemove: (id: string) => void;
    onAddExpense: (amount: number, description?: string) => void;
    onDeleteExpense: (id: string) => void;
    onClose: () => void;
}

export default function RingSheet({
    initial,
    spent,
    expenses,
    onSave,
    onRemove,
    onAddExpense,
    onDeleteExpense,
    onClose,
}: RingSheetProps) {
    const [name, setName] = React.useState(initial?.name ?? "");
    const [icon, setIcon] = React.useState(initial?.icon ?? RING_ICON_PRESETS[0]);
    const [color, setColor] = React.useState(initial?.color ?? RING_COLOR_PRESETS[0]);
    const [kind, setKind] = React.useState<RingKind>(initial?.kind ?? "spend");
    const [targetAmount, setTargetAmount] = React.useState(
        initial ? String(initial.targetAmount) : "",
    );
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const [entryAmount, setEntryAmount] = React.useState("");
    const [entryDescription, setEntryDescription] = React.useState("");

    const target = parseFloat(targetAmount) || 0;
    const pct = target > 0 ? Math.round((spent / target) * 100) : 0;
    const verb = kind === "save" ? "Saved" : "Spent";

    const handleSave = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        const amt = parseFloat(targetAmount);
        if (targetAmount !== "" && (isNaN(amt) || amt < 0))
            e.targetAmount = "Enter a valid amount";
        if (Object.keys(e).length > 0) {
            setErrors(e);
            return;
        }
        onSave({
            id: initial?.id ?? generateUuid(),
            name: name.trim(),
            targetAmount: isNaN(amt) ? 0 : amt,
            color,
            icon,
            kind,
            sortOrder: initial?.sortOrder ?? 0,
        });
        onClose();
    };

    const handleAddEntry = () => {
        const amt = parseFloat(entryAmount);
        if (isNaN(amt) || amt <= 0) return;
        onAddExpense(amt, entryDescription.trim() || undefined);
        setEntryAmount("");
        setEntryDescription("");
    };

    const handleRemove = () => {
        if (!initial) return;
        if (confirm(`Remove "${initial.name}"? Past entries are kept.`)) {
            onRemove(initial.id);
            onClose();
        }
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
                        marginBottom: 20,
                    }}>
                    {initial ? `${icon} ${initial.name}` : "New Budget Ring"}
                </div>

                {/* Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Name</label>
                    <input
                        style={{
                            ...inputStyle,
                            borderColor: errors.name ? "var(--danger)" : undefined,
                        }}
                        value={name}
                        onChange={e => {
                            setName(e.target.value);
                            setErrors(p => ({ ...p, name: "" }));
                        }}
                        placeholder='Groceries, Gas, Fun money…'
                        autoFocus={!initial}
                    />
                    {errors.name && <div style={errorStyle}>{errors.name}</div>}
                </div>

                {/* Icon */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Icon</label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(6,1fr)",
                            gap: 8,
                        }}>
                        {RING_ICON_PRESETS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setIcon(opt)}
                                style={{
                                    background:
                                        icon === opt
                                            ? "rgba(200,169,110,0.15)"
                                            : "var(--surface2)",
                                    border: `1px solid ${icon === opt ? "var(--accent)" : "var(--border)"}`,
                                    borderRadius: 10,
                                    padding: "8px 0",
                                    fontSize: 18,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Color</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {RING_COLOR_PRESETS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                aria-label={c}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: "50%",
                                    background: c,
                                    border:
                                        color === c
                                            ? "3px solid var(--text)"
                                            : "1px solid var(--border)",
                                    cursor: "pointer",
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Kind */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Type</label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2,1fr)",
                            gap: 8,
                        }}>
                        {(
                            [
                                { value: "spend", label: "Spending", sub: "Track spending against a limit" },
                                { value: "save", label: "Savings", sub: "Track progress toward a goal" },
                            ] as { value: RingKind; label: string; sub: string }[]
                        ).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setKind(opt.value)}
                                style={{
                                    background:
                                        kind === opt.value
                                            ? "rgba(200,169,110,0.15)"
                                            : "var(--surface2)",
                                    border: `1px solid ${kind === opt.value ? "var(--accent)" : "var(--border)"}`,
                                    borderRadius: 10,
                                    padding: "10px 8px",
                                    color:
                                        kind === opt.value
                                            ? "var(--accent)"
                                            : "var(--muted)",
                                    fontFamily: "var(--font-dm-sans)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    textAlign: "center",
                                }}>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: kind === opt.value ? 600 : 400,
                                    }}>
                                    {opt.label}
                                </div>
                                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                                    {opt.sub}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Target amount */}
                <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>
                        {kind === "save" ? "Goal Amount ($)" : "Monthly Budget ($)"}
                    </label>
                    <input
                        style={{
                            ...inputStyle,
                            borderColor: errors.targetAmount
                                ? "var(--danger)"
                                : undefined,
                        }}
                        value={targetAmount}
                        onChange={e => {
                            setTargetAmount(e.target.value);
                            setErrors(p => ({ ...p, targetAmount: "" }));
                        }}
                        type='number'
                        inputMode='decimal'
                        placeholder='0.00'
                        min='0'
                        step='0.01'
                    />
                    {errors.targetAmount && (
                        <div style={errorStyle}>{errors.targetAmount}</div>
                    )}
                </div>

                {initial && target > 0 && (
                    <div
                        style={{
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "14px 16px",
                            marginBottom: 16,
                        }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 13,
                                marginBottom: 8,
                            }}>
                            <span style={{ color: "var(--muted)" }}>
                                {verb} this month
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--text)" }}>
                                {formatCurrency(spent)} / {formatCurrency(target)}
                            </span>
                        </div>
                        <div
                            style={{
                                height: 4,
                                background: "var(--surface)",
                                borderRadius: 2,
                                overflow: "hidden",
                            }}>
                            <div
                                style={{
                                    height: "100%",
                                    width: `${Math.min(pct, 100)}%`,
                                    background: color,
                                    borderRadius: 2,
                                    transition: "width 0.4s ease",
                                }}
                            />
                        </div>
                    </div>
                )}

                {initial && (
                    <>
                        {/* Quick add entry */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>
                                + Add {kind === "save" ? "contribution" : "expense"}
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    value={entryAmount}
                                    onChange={e => setEntryAmount(e.target.value)}
                                    type='number'
                                    inputMode='decimal'
                                    placeholder='0.00'
                                    min='0'
                                    step='0.01'
                                />
                                <input
                                    style={{ ...inputStyle, flex: 1 }}
                                    value={entryDescription}
                                    onChange={e => setEntryDescription(e.target.value)}
                                    placeholder='Note (optional)'
                                />
                                <button
                                    onClick={handleAddEntry}
                                    style={{
                                        background: "var(--accent)",
                                        color: "#0f1117",
                                        border: "none",
                                        borderRadius: 12,
                                        padding: "0 16px",
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

                        {/* Recent entries */}
                        {expenses.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <label style={labelStyle}>This month</label>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 6,
                                    }}>
                                    {expenses.map(ex => (
                                        <div
                                            key={ex.id}
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
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        color: "var(--text)",
                                                    }}>
                                                    {formatCurrency(ex.amount)}
                                                </div>
                                                {ex.description && (
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: "var(--muted)",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}>
                                                        {ex.description}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => onDeleteExpense(ex.id)}
                                                aria-label='Delete entry'
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
                    </>
                )}

                <button
                    onClick={handleSave}
                    style={{
                        width: "100%",
                        background: "var(--accent)",
                        color: "#0f1117",
                        border: "none",
                        borderRadius: 14,
                        padding: 16,
                        fontSize: 16,
                        fontWeight: 600,
                        fontFamily: "var(--font-dm-sans)",
                        cursor: "pointer",
                        marginBottom: 12,
                    }}>
                    {initial ? "Save Changes" : "Create Ring"}
                </button>

                {initial && (
                    <button
                        onClick={handleRemove}
                        style={{
                            width: "100%",
                            background: "rgba(224,112,112,0.12)",
                            color: "var(--danger)",
                            border: "1px solid var(--danger)",
                            borderRadius: 14,
                            padding: 14,
                            fontSize: 15,
                            fontWeight: 500,
                            fontFamily: "var(--font-dm-sans)",
                            cursor: "pointer",
                            marginBottom: 12,
                        }}>
                        Remove Ring
                    </button>
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

const errorStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--danger)",
    marginTop: 4,
};
