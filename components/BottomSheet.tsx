"use client";

import * as React from "react";

interface BottomSheetProps {
    onClose: () => void;
    children: React.ReactNode;
}

const DISMISS_DISTANCE = 100; // px dragged down before it counts as a dismiss
const DISMISS_VELOCITY = 0.5; // px/ms — a fast flick dismisses early
const DISMISS_ANIM_MS = 220;

/**
 * Shared bottom-sheet chrome (backdrop, rounded card, grab handle) used by
 * every modal in the app. Swipe-to-dismiss lives only on the handle, not
 * the whole sheet — several of these sheets scroll internally (long forms,
 * lists), and a whole-sheet drag would fight that.
 */
export default function BottomSheet({ onClose, children }: BottomSheetProps) {
    const [dragY, setDragY] = React.useState(0);
    const [dragging, setDragging] = React.useState(false);
    const [dismissing, setDismissing] = React.useState(false);
    const startY = React.useRef(0);
    const startTime = React.useRef(0);

    const handlePointerDown = (e: React.PointerEvent) => {
        setDragging(true);
        startY.current = e.clientY;
        startTime.current = Date.now();
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging) return;
        setDragY(Math.max(0, e.clientY - startY.current));
    };

    const handlePointerUp = () => {
        if (!dragging) return;
        setDragging(false);
        const elapsed = Date.now() - startTime.current || 1;
        const velocity = dragY / elapsed;
        if (dragY > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
            setDismissing(true);
            setDragY(
                typeof window !== "undefined" ? window.innerHeight : 800,
            );
            setTimeout(onClose, DISMISS_ANIM_MS);
        } else {
            setDragY(0);
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
                        "16px 20px calc(28px + env(safe-area-inset-bottom, 0px))",
                    width: "100%",
                    maxHeight: "92dvh",
                    overflowY: "auto",
                    transform: `translateY(${dragY}px)`,
                    transition:
                        dragging || dismissing
                            ? dismissing
                                ? `transform ${DISMISS_ANIM_MS}ms ease-in`
                                : "none"
                            : "transform 0.25s ease",
                }}>
                {/* Grab handle — enlarged invisible hit area around the
                    visible bar so it's comfortable to grab on a phone. */}
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "12px 0",
                        marginBottom: 8,
                        cursor: dragging ? "grabbing" : "grab",
                        touchAction: "none",
                    }}>
                    <div
                        style={{
                            width: 36,
                            height: 4,
                            background: "var(--muted)",
                            borderRadius: 2,
                            opacity: 0.4,
                        }}
                    />
                </div>
                {children}
            </div>
        </div>
    );
}
