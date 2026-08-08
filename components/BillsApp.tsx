"use client";

import { useState, useEffect, useMemo } from "react";
import { useBills, usePaid } from "@/hooks/useBills";
import BillCard from "@/components/BillCard";
import BillForm from "@/components/BillForm";
import NotificationPanel from "@/components/NotificationPanel";
import HouseholdPanel from "@/components/HouseholdPanel";
import ImportPrompt from "@/components/ImportPrompt";
import type { Bill } from "@/lib/types";
import { formatCurrency, getMonthKey, billVisibleInMonth } from "@/lib/types";
import { registerServiceWorker, getPermissionStatus } from "@/lib/notifications";
import {
    checkPendingImport,
    importLocalBills,
    discardLocalImport,
    type PendingImport,
} from "@/lib/cloudImport";

interface BillsAppProps {
    userId: string;
    householdId: string;
}

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function getViewMonth(offset: number) {
    const d = new Date();
    const m = d.getMonth() + offset;
    const y = d.getFullYear() + Math.floor(m / 12);
    const month = ((m % 12) + 12) % 12;
    return { year: y, month };
}

export default function BillsApp({ householdId }: BillsAppProps) {
    const [monthOffset, setMonthOffset] = useState(0);
    const { year, month } = getViewMonth(monthOffset);
    const monthKey = getMonthKey(year, month);

    const { bills, loaded, addBill, updateBill, deleteBill, refetch } =
        useBills(householdId);
    const { paid, togglePaid } = usePaid(householdId, monthKey);

    const [showForm, setShowForm] = useState(false);
    const [editBill, setEditBill] = useState<Bill | null>(null);
    const [showNotif, setShowNotif] = useState(false);
    const [showHousehold, setShowHousehold] = useState(false);
    const [pendingImport, setPendingImport] = useState<PendingImport | null>(
        null,
    );
    const [toast, setToast] = useState("");
    const [filterCat, setFilterCat] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"due" | "amount" | "name">("due");

    // Register SW on mount
    useEffect(() => {
        registerServiceWorker();
    }, []);

    // One-time localStorage -> Supabase import, per device
    useEffect(() => {
        checkPendingImport(householdId).then(pending => {
            if (!pending) return;
            if (pending.householdHasBills) {
                setPendingImport(pending);
            } else {
                importLocalBills(pending.localBills, householdId).then(refetch);
            }
        });
    }, [householdId, refetch]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(""), 2500);
    };

    const handleMergeImport = async () => {
        if (!pendingImport) return;
        await importLocalBills(pendingImport.localBills, householdId);
        await refetch();
        setPendingImport(null);
        showToast("Bills merged ✓");
    };

    const handleDiscardImport = () => {
        discardLocalImport();
        setPendingImport(null);
    };

    // Visible bills for this month
    const visibleBills = useMemo(() => {
        let filtered = bills.filter(b => billVisibleInMonth(b, monthKey));
        if (filterCat !== "all")
            filtered = filtered.filter(b => b.category === filterCat);
        return [...filtered].sort((a, b) => {
            if (sortBy === "due") return a.dueDay - b.dueDay;
            if (sortBy === "amount") return b.amount - a.amount;
            return a.name.localeCompare(b.name);
        });
    }, [bills, monthKey, filterCat, sortBy]);

    // Summary
    const { total, paidTotal, remaining } = useMemo(() => {
        const allMonthBills = bills.filter(b =>
            billVisibleInMonth(b, monthKey),
        );
        const total = allMonthBills.reduce((s, b) => s + b.amount, 0);
        const paidTotal = allMonthBills
            .filter(b => paid[b.id])
            .reduce((s, b) => s + b.amount, 0);
        return { total, paidTotal, remaining: total - paidTotal };
    }, [bills, monthKey, paid]);

    const notifStatus =
        typeof window !== "undefined" ? getPermissionStatus() : "default";

    const handleEdit = (bill: Bill) => {
        setEditBill(bill);
        setShowForm(true);
    };

    const handleSave = async (bill: Bill) => {
        try {
            if (editBill) {
                await updateBill(bill.id, bill);
                showToast("Bill updated! ✓");
            } else {
                await addBill(bill);
                showToast("Bill added! ✓");
            }
        } catch {
            showToast("Couldn't save — try again");
        }
        setEditBill(null);
    };

    if (!loaded) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100dvh",
                }}>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    Loading…
                </div>
            </div>
        );
    }

    const progressPct = total > 0 ? (paidTotal / total) * 100 : 0;

    return (
        <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>
            {/* ── HEADER ── */}
            <div
                style={{
                    background:
                        "linear-gradient(160deg,#1a1d27 0%,#0f1117 100%)",
                    borderBottom: "1px solid var(--border)",
                    padding: "52px 20px 20px",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 18,
                    }}>
                    <div>
                        <div
                            style={{
                                fontFamily: "var(--font-dm-serif)",
                                fontSize: 28,
                                color: "var(--accent)",
                                lineHeight: 1,
                            }}>
                            Owed
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: "var(--muted)",
                                marginTop: 4,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                            }}>
                            Track Your Bills
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}>
                        {/* Household button */}
                        <button
                            onClick={() => setShowHousehold(true)}
                            aria-label='Household'
                            style={{
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                                borderRadius: "50%",
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: 16,
                            }}>
                            👥
                        </button>

                        {/* Notification bell */}
                        <button
                            onClick={() => setShowNotif(true)}
                            aria-label='Notifications'
                            style={{
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                                borderRadius: "50%",
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: 16,
                                position: "relative",
                            }}>
                            🔔
                            {notifStatus !== "granted" && (
                                <span
                                    style={{
                                        position: "absolute",
                                        top: 2,
                                        right: 2,
                                        width: 8,
                                        height: 8,
                                        background: "var(--danger)",
                                        borderRadius: "50%",
                                        border: "1.5px solid var(--bg)",
                                    }}
                                />
                            )}
                        </button>

                        {/* Month nav */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}>
                            <button
                                onClick={() => setMonthOffset(o => o - 1)}
                                style={navBtnStyle}>
                                ‹
                            </button>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    minWidth: 80,
                                    textAlign: "center",
                                }}>
                                {MONTHS[month].slice(0, 3)} {year}
                            </div>
                            <button
                                onClick={() => setMonthOffset(o => o + 1)}
                                style={navBtnStyle}>
                                ›
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary cards */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 10,
                        marginBottom: 14,
                    }}>
                    {[
                        {
                            label: "Total",
                            value: formatCurrency(total),
                            color: "var(--text)",
                        },
                        {
                            label: "Paid",
                            value: formatCurrency(paidTotal),
                            color: "var(--success)",
                        },
                        {
                            label: "Left",
                            value: formatCurrency(remaining),
                            color:
                                remaining > 0
                                    ? "var(--danger)"
                                    : "var(--success)",
                        },
                    ].map(s => (
                        <div
                            key={s.label}
                            style={{
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: "10px 12px",
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
                                {s.label}
                            </div>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: s.color,
                                }}>
                                {s.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Progress bar */}
                {total > 0 && (
                    <div
                        style={{
                            height: 4,
                            background: "var(--surface2)",
                            borderRadius: 2,
                            overflow: "hidden",
                        }}>
                        <div
                            style={{
                                height: "100%",
                                width: `${progressPct}%`,
                                background: `linear-gradient(90deg, var(--success), #52b085)`,
                                borderRadius: 2,
                                transition: "width 0.4s ease",
                            }}
                        />
                    </div>
                )}
            </div>

            {/* ── CONTENT ── */}
            <div style={{ padding: "20px 16px" }}>
                {/* Controls row */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 14,
                        gap: 8,
                        position: "sticky",
                        top: 0,
                        background: "var(--bg)",
                        zIndex: 90,
                        paddingTop: 4,
                        paddingBottom: 4,
                    }}>
                    <div
                        style={{
                            display: "flex",
                            gap: 6,
                            overflow: "auto",
                            flex: 1,
                        }}>
                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={e =>
                                setSortBy(e.target.value as typeof sortBy)
                            }
                            style={{
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: "6px 10px",
                                color: "var(--muted)",
                                fontSize: 12,
                                fontFamily: "var(--font-dm-sans)",
                                cursor: "pointer",
                                outline: "none",
                            }}>
                            <option value='due'>By Date</option>
                            <option value='amount'>By Amount</option>
                            <option value='name'>By Name</option>
                        </select>
                        {/* Category filter */}
                        <select
                            value={filterCat}
                            onChange={e => setFilterCat(e.target.value)}
                            style={{
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: "6px 10px",
                                color: "var(--muted)",
                                fontSize: 12,
                                fontFamily: "var(--font-dm-sans)",
                                cursor: "pointer",
                                outline: "none",
                            }}>
                            <option value='all'>All Categories</option>
                            <option value='housing'>🏠 Housing</option>
                            <option value='utility'>💡 Utilities</option>
                            <option value='sub'>📺 Subscriptions</option>
                            <option value='auto'>🚗 Auto</option>
                            <option value='health'>💊 Health</option>
                            <option value='other'>📋 Other</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setEditBill(null);
                            setShowForm(true);
                        }}
                        style={{
                            background: "var(--accent)",
                            color: "#0f1117",
                            border: "none",
                            borderRadius: 20,
                            padding: "7px 16px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "var(--font-dm-sans)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}>
                        + Add
                    </button>
                </div>

                {/* Bills list */}
                {visibleBills.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "56px 20px" }}>
                        <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
                        <div
                            style={{
                                fontSize: 16,
                                color: "var(--muted)",
                                lineHeight: 1.6,
                            }}>
                            {bills.length === 0
                                ? "No bills yet.\nTap + Add to get started."
                                : "No bills in this category."}
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}>
                        {visibleBills.map(bill => (
                            <BillCard
                                key={bill.id}
                                bill={bill}
                                monthKey={monthKey}
                                paid={!!paid[bill.id]}
                                onTogglePaid={id => {
                                    togglePaid(id);
                                    showToast(
                                        paid[id]
                                            ? "Marked unpaid"
                                            : "Marked as paid! ✓",
                                    );
                                }}
                                onEdit={handleEdit}
                                onDelete={id => {
                                    deleteBill(id);
                                    showToast("Bill deleted");
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Stats footer */}
                {visibleBills.length > 0 && (
                    <div
                        style={{
                            marginTop: 24,
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "14px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            color: "var(--muted)",
                        }}>
                        <span>
                            {visibleBills.length} bill
                            {visibleBills.length !== 1 ? "s" : ""}
                        </span>
                        <span>
                            {visibleBills.filter(b => paid[b.id]).length} paid ·{" "}
                            {visibleBills.filter(b => !paid[b.id]).length}{" "}
                            remaining
                        </span>
                    </div>
                )}
            </div>

            {/* ── MODALS ── */}
            {showForm && (
                <BillForm
                    initial={editBill}
                    onSave={handleSave}
                    onClose={() => {
                        setShowForm(false);
                        setEditBill(null);
                    }}
                    currentMonthKey={monthKey}
                />
            )}
            {showNotif && (
                <NotificationPanel
                    bills={bills}
                    onClose={() => setShowNotif(false)}
                />
            )}
            {showHousehold && (
                <HouseholdPanel
                    householdId={householdId}
                    onClose={() => setShowHousehold(false)}
                    showToast={showToast}
                />
            )}
            {pendingImport && (
                <ImportPrompt
                    count={pendingImport.localBills.length}
                    onMerge={handleMergeImport}
                    onDiscard={handleDiscardImport}
                />
            )}

            {/* ── TOAST ── */}
            <div
                style={{
                    position: "fixed",
                    bottom: `calc(24px + env(safe-area-inset-bottom, 0px))`,
                    left: "50%",
                    transform: `translateX(-50%) translateY(${toast ? "0" : "80px"})`,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text)",
                    zIndex: 300,
                    transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                }}>
                {toast}
            </div>
        </div>
    );
}

const navBtnStyle: React.CSSProperties = {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--accent)",
    width: 30,
    height: 30,
    borderRadius: "50%",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};
