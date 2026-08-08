"use client";

import * as React from "react";
import {
    getPermissionStatus,
    sendTestNotification,
    registerServiceWorker,
    subscribeToPush,
    unsubscribeFromPush,
    getExistingSubscription,
    getSavedNotifyTime,
    saveNotifyTime,
    savePushPrefs,
    formatTime12h,
    DEFAULT_NOTIFY_TIME,
} from "@/lib/notifications";

// All 24 hours as selectable options
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
    const value = `${String(i).padStart(2, "0")}:00`;
    const label =
        i === 0
            ? "12 AM"
            : i < 12
              ? `${i} AM`
              : i === 12
                ? "12 PM"
                : `${i - 12} PM`;
    return { value, label };
});
import type { Bill } from "@/lib/types";

interface NotificationPanelProps {
    bills: Bill[];
    onClose: () => void;
}

export default function NotificationPanel({
    bills,
    onClose,
}: NotificationPanelProps) {
    const [permission, setPermission] = React.useState<
        NotificationPermission | "unsupported"
    >(() => getPermissionStatus());
    const [subscribed, setSubscribed] = React.useState(false);
    const [swReady, setSwReady] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [testSent, setTestSent] = React.useState(false);
    const [notifyTime, setNotifyTime] =
        React.useState<string>(DEFAULT_NOTIFY_TIME);
    const [timeSaved, setTimeSaved] = React.useState(false);

    React.useEffect(() => {
        registerServiceWorker().then(reg => setSwReady(!!reg));
        setNotifyTime(getSavedNotifyTime());
        getExistingSubscription().then(sub => setSubscribed(!!sub));
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const sub = await subscribeToPush();
            if (sub) {
                setSubscribed(true);
                setPermission("granted");
                await savePushPrefs();
            } else {
                setPermission(getPermissionStatus());
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        setLoading(true);
        try {
            await unsubscribeFromPush();
            setSubscribed(false);
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        if (bills.length === 0) return;
        await sendTestNotification(bills[0].name, bills[0].amount);
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
    };

    const handleTimeChange = (value: string) => {
        setNotifyTime(value);
        saveNotifyTime(value);
        savePushPrefs();
        setTimeSaved(true);
        setTimeout(() => setTimeSaved(false), 2000);
    };

    const statusColor =
        subscribed && permission === "granted"
            ? "var(--success)"
            : permission === "denied"
              ? "var(--danger)"
              : permission === "unsupported"
                ? "var(--muted)"
                : "var(--accent)";

    const statusLabel =
        subscribed && permission === "granted"
            ? "Push Notifications Active ✓"
            : permission === "denied"
              ? "Notifications Blocked"
              : permission === "unsupported"
                ? "Not Supported on this device"
                : "Notifications Off";

    const statusSub =
        subscribed && swReady
            ? "Reminders will arrive even when the app is closed"
            : swReady
              ? "Service worker ready — tap Enable below"
              : "Service worker not registered";

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

                <div
                    style={{
                        fontFamily: "var(--font-dm-serif)",
                        fontSize: 22,
                        color: "var(--accent)",
                        marginBottom: 6,
                    }}>
                    🔔 Notifications
                </div>
                <p
                    style={{
                        fontSize: 13,
                        color: "var(--muted)",
                        marginBottom: 24,
                    }}>
                    True push notifications — reminders arrive even when the app
                    is fully closed.
                </p>

                {/* Status pill */}
                <div
                    style={{
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                    }}>
                    <div>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: statusColor,
                            }}>
                            {statusLabel}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--muted)",
                                marginTop: 2,
                            }}>
                            {statusSub}
                        </div>
                    </div>
                    <div
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: statusColor,
                            boxShadow: `0 0 8px ${statusColor}`,
                        }}
                    />
                </div>

                {/* Reminder hour slider */}
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
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text)",
                            marginBottom: 4,
                        }}>
                        ⏰ Reminder Time
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            marginBottom: 12,
                        }}>
                        Reminders fire at{" "}
                        <span
                            style={{ color: "var(--accent)", fontWeight: 600 }}>
                            {formatTime12h(notifyTime)}
                        </span>
                        {timeSaved && (
                            <span
                                style={{
                                    color: "var(--success)",
                                    marginLeft: 6,
                                }}>
                                ✓ saved
                            </span>
                        )}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: 6,
                            overflowX: "auto",
                            paddingBottom: 4,
                            scrollbarWidth: "none",
                        }}>
                        {HOUR_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleTimeChange(opt.value)}
                                style={{
                                    flexShrink: 0,
                                    background:
                                        notifyTime === opt.value
                                            ? "rgba(200,169,110,0.2)"
                                            : "var(--surface)",
                                    border: `1px solid ${notifyTime === opt.value ? "var(--accent)" : "var(--border)"}`,
                                    borderRadius: 8,
                                    padding: "7px 10px",
                                    color:
                                        notifyTime === opt.value
                                            ? "var(--accent)"
                                            : "var(--muted)",
                                    fontSize: 12,
                                    fontWeight:
                                        notifyTime === opt.value ? 600 : 400,
                                    fontFamily: "var(--font-dm-sans)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    whiteSpace: "nowrap",
                                }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* iOS instructions */}
                <div
                    style={{
                        background: "rgba(200,169,110,0.08)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        marginBottom: 20,
                    }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--accent)",
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                        }}>
                        📱 iPhone Setup
                    </div>
                    <ol
                        style={{
                            fontSize: 13,
                            color: "var(--muted)",
                            paddingLeft: 16,
                            lineHeight: 1.8,
                            margin: 0,
                        }}>
                        <li>
                            Open this app in{" "}
                            <strong style={{ color: "var(--text)" }}>
                                Safari
                            </strong>
                        </li>
                        <li>
                            Tap the{" "}
                            <strong style={{ color: "var(--text)" }}>
                                Share
                            </strong>{" "}
                            button (bottom bar)
                        </li>
                        <li>
                            Select{" "}
                            <strong style={{ color: "var(--text)" }}>
                                &ldquo;Add to Home Screen&rdquo;
                            </strong>
                        </li>
                        <li>Open the app from your home screen</li>
                        <li>
                            Tap{" "}
                            <strong style={{ color: "var(--text)" }}>
                                Enable Notifications
                            </strong>{" "}
                            below
                        </li>
                    </ol>
                </div>

                {/* Enable / Disable button */}
                {permission === "denied" ? (
                    <div
                        style={{
                            background: "rgba(224,112,112,0.1)",
                            border: "1px solid var(--danger)",
                            borderRadius: 12,
                            padding: 14,
                            fontSize: 13,
                            color: "var(--danger)",
                            marginBottom: 12,
                            textAlign: "center",
                        }}>
                        Notifications are blocked. Go to Settings → Safari →
                        Notifications to re-enable.
                    </div>
                ) : subscribed ? (
                    <button
                        onClick={handleDisable}
                        disabled={loading}
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
                            cursor: loading ? "wait" : "pointer",
                            marginBottom: 12,
                            opacity: loading ? 0.6 : 1,
                        }}>
                        {loading ? "Disabling…" : "Disable Notifications"}
                    </button>
                ) : (
                    <button
                        onClick={handleEnable}
                        disabled={loading || permission === "unsupported"}
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
                            cursor: loading ? "wait" : "pointer",
                            marginBottom: 12,
                            opacity:
                                loading || permission === "unsupported"
                                    ? 0.6
                                    : 1,
                        }}>
                        {loading ? "Enabling…" : "Enable Notifications"}
                    </button>
                )}

                {/* Test button */}
                {subscribed && permission === "granted" && bills.length > 0 && (
                    <button
                        onClick={handleTest}
                        style={{
                            width: "100%",
                            background: testSent
                                ? "var(--success)"
                                : "var(--surface2)",
                            color: testSent ? "#0f1117" : "var(--text)",
                            border: `1px solid ${testSent ? "var(--success)" : "var(--border)"}`,
                            borderRadius: 14,
                            padding: 14,
                            fontSize: 15,
                            fontWeight: 500,
                            fontFamily: "var(--font-dm-sans)",
                            cursor: "pointer",
                            marginBottom: 12,
                            transition: "all 0.2s",
                        }}>
                        {testSent ? "✓ Test sent!" : "Send Test Notification"}
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
