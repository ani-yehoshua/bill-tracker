"use client";

import * as React from "react";
import type { Bill, Category, Recurrence } from "@/lib/types";
import {
    CATEGORIES,
    NOTIFY_OPTIONS,
    RECURRENCE_OPTIONS,
    MONTH_NAMES,
    getMonthKey,
    nextMonthKey,
} from "@/lib/types";
import { generateUuid } from "@/lib/uuid";

interface BillFormProps {
    initial?: Bill | null;
    onSave: (bill: Bill, markPaid?: boolean) => void;
    onClose: () => void;
    currentMonthKey: string;
}

/**
 * True when the bill's due date, within the currently-viewed month, has
 * already passed relative to real today — computed directly from the due
 * day already entered, never asked as a separate question. Only meaningful
 * when adding to the real current month; a "past due date" in a month
 * you've navigated to (past or future) doesn't mean the same thing.
 */
function isDuePastThisMonth(bill: Bill, currentMonthKey: string): boolean {
    const now = new Date();
    if (currentMonthKey !== getMonthKey(now.getFullYear(), now.getMonth()))
        return false;

    const today = now.getDate();
    if (bill.recurrence === "yearly")
        return bill.dueMonth === now.getMonth() && bill.dueDay < today;
    return bill.dueDay < today;
}

export default function BillForm({
    initial,
    onSave,
    onClose,
    currentMonthKey,
}: BillFormProps) {
    const [name, setName] = React.useState(initial?.name ?? "");
    const [amount, setAmount] = React.useState(initial ? String(initial.amount) : "");
    const [dueDay, setDueDay] = React.useState(initial ? String(initial.dueDay) : "");
    const [category, setCategory] = React.useState<Category>(
        initial?.category ?? "other",
    );
    const [recurrence, setRecurrence] = React.useState<Recurrence>(
        initial?.recurrence ?? "monthly",
    );
    // For yearly bills: which month is it due in (0–11)
    const currentMonth = Number(currentMonthKey.split("-")[1]);
    const [dueMonth, setDueMonth] = React.useState<number>(
        initial?.dueMonth ?? currentMonth,
    );
    const [notifyDaysBefore, setNotifyDaysBefore] = React.useState(
        initial?.notifyDaysBefore ?? 3,
    );
    const [notes, setNotes] = React.useState(initial?.notes ?? "");
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    // Only used when adding a brand-new bill (not editing): a short
    // follow-up step that decides whether this month's bill should start
    // out marked paid.
    const [step, setStep] = React.useState<"form" | "kind" | "paid">("form");
    const [pendingBill, setPendingBill] = React.useState<Bill | null>(null);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt < 0) e.amount = "Enter a valid amount";
        const day = parseInt(dueDay);
        if (isNaN(day) || day < 1 || day > 31) e.dueDay = "Enter a day 1–31";
        return e;
    };

    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length > 0) {
            setErrors(e);
            return;
        }
        const bill: Bill = {
            id: initial?.id ?? generateUuid(),
            name: name.trim(),
            amount: parseFloat(amount),
            dueDay: parseInt(dueDay),
            dueMonth: recurrence === "yearly" ? dueMonth : undefined,
            category,
            recurrence,
            notifyDaysBefore,
            notes: notes.trim() || undefined,
            monthKey: recurrence === "once" ? currentMonthKey : undefined,
        };

        if (initial) {
            // Editing an existing entry — paid status is untouched here,
            // it's managed from the bill list itself.
            onSave(bill);
            onClose();
            return;
        }

        setPendingBill(bill);
        setStep("kind");
    };

    const finishAdd = (markPaid: boolean) => {
        if (!pendingBill) return;
        onSave(pendingBill, markPaid);
        onClose();
    };

    const handleNewBill = () => {
        if (!pendingBill) return;
        if (isDuePastThisMonth(pendingBill, currentMonthKey)) {
            // This cycle's due date already passed before the bill even
            // existed for us — nothing owed this month, so there's nothing
            // to ask. Save it hidden until the cycle that's actually ours.
            onSave(
                {
                    ...pendingBill,
                    startsMonthKey: nextMonthKey(currentMonthKey),
                },
                false,
            );
            onClose();
            return;
        }
        setStep("paid");
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
                {/* Handle */}
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

                {step === "form" && (
                <>
                <div
                    style={{
                        fontFamily: "var(--font-dm-serif)",
                        fontSize: 22,
                        color: "var(--accent)",
                        marginBottom: 20,
                    }}>
                    {initial ? "Edit Bill" : "Add a Bill"}
                </div>

                {/* Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Bill Name</label>
                    <input
                        style={{
                            ...inputStyle,
                            borderColor: errors.name
                                ? "var(--danger)"
                                : undefined,
                        }}
                        value={name}
                        onChange={e => {
                            setName(e.target.value);
                            setErrors(p => ({ ...p, name: "" }));
                        }}
                        placeholder='Netflix, Electric, Rent…'
                        autoFocus
                    />
                    {errors.name && <div style={errorStyle}>{errors.name}</div>}
                </div>

                {/* Amount + Due Day */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        marginBottom: 16,
                    }}>
                    <div>
                        <label style={labelStyle}>Amount ($)</label>
                        <input
                            style={{
                                ...inputStyle,
                                borderColor: errors.amount
                                    ? "var(--danger)"
                                    : undefined,
                            }}
                            value={amount}
                            onChange={e => {
                                setAmount(e.target.value);
                                setErrors(p => ({ ...p, amount: "" }));
                            }}
                            type='number'
                            inputMode='decimal'
                            placeholder='0.00'
                            min='0'
                            step='0.01'
                        />
                        {errors.amount && (
                            <div style={errorStyle}>{errors.amount}</div>
                        )}
                    </div>
                    <div>
                        <label style={labelStyle}>Due Day</label>
                        <input
                            style={{
                                ...inputStyle,
                                borderColor: errors.dueDay
                                    ? "var(--danger)"
                                    : undefined,
                            }}
                            value={dueDay}
                            onChange={e => {
                                setDueDay(e.target.value);
                                setErrors(p => ({ ...p, dueDay: "" }));
                            }}
                            type='number'
                            inputMode='numeric'
                            placeholder='1–31'
                            min='1'
                            max='31'
                        />
                        {errors.dueDay && (
                            <div style={errorStyle}>{errors.dueDay}</div>
                        )}
                    </div>
                </div>

                {/* Category */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Category</label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3,1fr)",
                            gap: 8,
                        }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                style={{
                                    background:
                                        category === cat.id
                                            ? `rgba(${hexToRgb(cat.color)},0.18)`
                                            : "var(--surface2)",
                                    border: `1px solid ${category === cat.id ? cat.color : "var(--border)"}`,
                                    borderRadius: 10,
                                    padding: "8px 4px",
                                    color:
                                        category === cat.id
                                            ? cat.color
                                            : "var(--muted)",
                                    fontSize: 12,
                                    fontFamily: "var(--font-dm-sans)",
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 3,
                                    transition: "all 0.15s",
                                }}>
                                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                                <span>{cat.label.split(" ")[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── RECURRENCE ── */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Repeats</label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3,1fr)",
                            gap: 8,
                        }}>
                        {RECURRENCE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setRecurrence(opt.value)}
                                style={{
                                    background:
                                        recurrence === opt.value
                                            ? "rgba(200,169,110,0.15)"
                                            : "var(--surface2)",
                                    border: `1px solid ${recurrence === opt.value ? "var(--accent)" : "var(--border)"}`,
                                    borderRadius: 10,
                                    padding: "10px 6px",
                                    color:
                                        recurrence === opt.value
                                            ? "var(--accent)"
                                            : "var(--muted)",
                                    fontFamily: "var(--font-dm-sans)",
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                    transition: "all 0.15s",
                                    textAlign: "center",
                                }}>
                                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight:
                                            recurrence === opt.value
                                                ? 600
                                                : 400,
                                    }}>
                                    {opt.label}
                                </span>
                                <span style={{ fontSize: 10, opacity: 0.7 }}>
                                    {opt.sublabel}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Due Month — only shown for yearly bills */}
                {recurrence === "yearly" && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Due Month</label>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4,1fr)",
                                gap: 6,
                            }}>
                            {MONTH_NAMES.map((mName, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setDueMonth(idx)}
                                    style={{
                                        background:
                                            dueMonth === idx
                                                ? "rgba(200,169,110,0.15)"
                                                : "var(--surface2)",
                                        border: `1px solid ${dueMonth === idx ? "var(--accent)" : "var(--border)"}`,
                                        borderRadius: 8,
                                        padding: "8px 4px",
                                        color:
                                            dueMonth === idx
                                                ? "var(--accent)"
                                                : "var(--muted)",
                                        fontSize: 12,
                                        fontWeight:
                                            dueMonth === idx ? 600 : 400,
                                        fontFamily: "var(--font-dm-sans)",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        textAlign: "center",
                                    }}>
                                    {mName.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notify */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Remind Me</label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2,1fr)",
                            gap: 8,
                        }}>
                        {NOTIFY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setNotifyDaysBefore(opt.value)}
                                style={{
                                    background:
                                        notifyDaysBefore === opt.value
                                            ? "rgba(200,169,110,0.15)"
                                            : "var(--surface2)",
                                    border: `1px solid ${notifyDaysBefore === opt.value ? "var(--accent)" : "var(--border)"}`,
                                    borderRadius: 10,
                                    padding: "10px 8px",
                                    color:
                                        notifyDaysBefore === opt.value
                                            ? "var(--accent)"
                                            : "var(--muted)",
                                    fontSize: 13,
                                    fontFamily: "var(--font-dm-sans)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    textAlign: "center",
                                }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Notes (optional)</label>
                    <textarea
                        style={{
                            ...inputStyle,
                            height: 72,
                            resize: "none",
                            lineHeight: 1.5,
                        }}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder='Account #, website, etc.'
                    />
                </div>

                <button
                    onClick={handleSubmit}
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
                    }}>
                    {initial ? "Save Changes" : "Add Bill"}
                </button>
                </>
                )}

                {step === "kind" && (
                    <>
                        <div
                            style={{
                                fontFamily: "var(--font-dm-serif)",
                                fontSize: 22,
                                color: "var(--accent)",
                                marginBottom: 8,
                            }}>
                            One more thing
                        </div>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--muted)",
                                marginBottom: 20,
                            }}>
                            Is this a bill you&apos;re already paying, or a
                            brand new one?
                        </p>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                marginBottom: 12,
                            }}>
                            <button
                                onClick={() => finishAdd(true)}
                                style={wizardBtnStyle}>
                                🔁 Already paying this
                                <span style={wizardBtnSubStyle}>
                                    Mark this month paid
                                </span>
                            </button>
                            <button
                                onClick={handleNewBill}
                                style={wizardBtnStyle}>
                                🆕 New bill
                                <span style={wizardBtnSubStyle}>
                                    I just signed up for this
                                </span>
                            </button>
                        </div>
                        <button
                            onClick={() => setStep("form")}
                            style={backBtnStyle}>
                            Back
                        </button>
                    </>
                )}

                {step === "paid" && (
                    <>
                        <div
                            style={{
                                fontFamily: "var(--font-dm-serif)",
                                fontSize: 22,
                                color: "var(--accent)",
                                marginBottom: 8,
                            }}>
                            Have you paid it yet?
                        </div>
                        <p
                            style={{
                                fontSize: 13,
                                color: "var(--muted)",
                                marginBottom: 20,
                            }}>
                            For this month&apos;s bill, specifically.
                        </p>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                                marginBottom: 12,
                            }}>
                            <button
                                onClick={() => finishAdd(true)}
                                style={wizardBtnStyle}>
                                ✓ Yes
                            </button>
                            <button
                                onClick={() => finishAdd(false)}
                                style={wizardBtnStyle}>
                                Not yet
                            </button>
                        </div>
                        <button
                            onClick={() => setStep("kind")}
                            style={backBtnStyle}>
                            Back
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

const wizardBtnStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
    fontFamily: "var(--font-dm-sans)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    textAlign: "center",
};

const wizardBtnSubStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 400,
    color: "var(--muted)",
};

const backBtnStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    fontFamily: "var(--font-dm-sans)",
    cursor: "pointer",
};

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

function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}
