"use client";

import type { BudgetRing } from "@/lib/types";
import { formatCurrency, ringProgress } from "@/lib/types";

interface RingCardProps {
    ring: BudgetRing;
    spent: number;
    onTap: (ring: BudgetRing) => void;
}

const SIZE = 76;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RingCard({ ring, spent, onTap }: RingCardProps) {
    const hasTarget = ring.targetAmount > 0;
    const progress = ringProgress(ring, spent);
    const pct = Math.round(progress * 100);
    const drawnProgress = Math.min(progress, 1);
    const overTarget = hasTarget && progress > 1;
    const pctColor = overTarget
        ? ring.kind === "save"
            ? "var(--success)"
            : "var(--danger)"
        : "var(--text)";

    return (
        <button
            onClick={() => onTap(ring)}
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "14px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans)",
            }}>
            <div
                style={{
                    position: "relative",
                    width: SIZE,
                    height: SIZE,
                }}>
                <svg
                    width={SIZE}
                    height={SIZE}
                    style={{ transform: "rotate(-90deg)" }}>
                    <circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        fill='none'
                        stroke='var(--surface2)'
                        strokeWidth={STROKE}
                    />
                    {hasTarget && (
                        <circle
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={RADIUS}
                            fill='none'
                            stroke={overTarget ? pctColor : ring.color}
                            strokeWidth={STROKE}
                            strokeLinecap='round'
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={
                                CIRCUMFERENCE * (1 - drawnProgress)
                            }
                            style={{ transition: "stroke-dashoffset 0.4s ease" }}
                        />
                    )}
                </svg>
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                    <span style={{ fontSize: 20 }}>{ring.icon}</span>
                    {hasTarget && (
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: pctColor,
                                marginTop: 1,
                            }}>
                            {pct}%
                        </span>
                    )}
                </div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 90,
                    }}>
                    {ring.name}
                </div>
                {hasTarget ? (
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>
                        {formatCurrency(spent)} / {formatCurrency(ring.targetAmount)}
                    </div>
                ) : (
                    <div style={{ fontSize: 10, color: "var(--accent)" }}>
                        Set a budget
                    </div>
                )}
            </div>
        </button>
    );
}
