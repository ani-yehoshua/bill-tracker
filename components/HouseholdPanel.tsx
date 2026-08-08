'use client';

import * as React from 'react';
import { useHousehold } from '@/hooks/useHousehold';

interface HouseholdPanelProps {
    householdId: string;
    onClose: () => void;
    showToast: (msg: string) => void;
}

export default function HouseholdPanel({
    householdId,
    onClose,
    showToast,
}: HouseholdPanelProps) {
    const { name, inviteCode, members, loading, rotate } =
        useHousehold(householdId);
    const [rotating, setRotating] = React.useState(false);
    const [signingOut, setSigningOut] = React.useState(false);

    const handleCopy = async () => {
        if (!inviteCode) return;
        try {
            await navigator.clipboard.writeText(inviteCode);
            showToast('Code copied ✓');
        } catch {
            showToast('Could not copy — copy it manually');
        }
    };

    const handleRotate = async () => {
        setRotating(true);
        try {
            await rotate();
            showToast('New code generated ✓');
        } catch {
            showToast('Could not generate a new code');
        } finally {
            setRotating(false);
        }
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        await fetch('/auth/signout', { method: 'POST' });
        window.location.href = '/login';
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'flex-end',
                backdropFilter: 'blur(4px)',
            }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px 24px 0 0',
                    padding:
                        '28px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
                    width: '100%',
                    maxHeight: '92dvh',
                    overflowY: 'auto',
                }}>
                <div
                    style={{
                        width: 36,
                        height: 4,
                        background: 'var(--muted)',
                        borderRadius: 2,
                        margin: '0 auto 20px',
                        opacity: 0.4,
                    }}
                />

                <div
                    style={{
                        fontFamily: 'var(--font-dm-serif)',
                        fontSize: 22,
                        color: 'var(--accent)',
                        marginBottom: 6,
                    }}>
                    👥 {loading ? 'Household' : name}
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
                    Manage your bills together.
                </p>

                <div
                    style={{
                        background: 'var(--surface2)',
                        border: '1px dashed var(--border)',
                        borderRadius: 12,
                        padding: '18px 16px',
                        marginBottom: 12,
                        textAlign: 'center',
                    }}>
                    {inviteCode ? (
                        <>
                            <button
                                onClick={handleCopy}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontFamily: 'var(--font-dm-serif)',
                                    fontSize: 32,
                                    letterSpacing: '0.12em',
                                    color: 'var(--accent)',
                                    cursor: 'pointer',
                                }}>
                                {inviteCode}
                            </button>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: 'var(--muted)',
                                    marginTop: 8,
                                }}>
                                Tap to copy. Share it with your partner — it
                                stops working once they join.
                            </div>
                        </>
                    ) : (
                        <>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                }}>
                                Household is closed
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: 'var(--muted)',
                                    marginTop: 4,
                                    marginBottom: 12,
                                }}>
                                Generate a new code to invite someone else.
                            </div>
                            <button
                                onClick={handleRotate}
                                disabled={rotating}
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    padding: '8px 14px',
                                    color: 'var(--accent)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-dm-sans)',
                                    cursor: rotating ? 'wait' : 'pointer',
                                }}>
                                {rotating ? 'Generating…' : 'Generate new code'}
                            </button>
                        </>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 20,
                    }}>
                    {members.map(m => (
                        <div
                            key={m.userId}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--surface2)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                padding: '10px 12px',
                            }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}>
                                <span style={{ fontSize: 18 }}>
                                    {m.avatarEmoji}
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--text)' }}>
                                    {m.displayName || m.email || 'Member'}
                                </span>
                            </div>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'var(--muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>
                                {m.role}
                            </span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    style={{
                        width: '100%',
                        background: 'rgba(224,112,112,0.12)',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        borderRadius: 14,
                        padding: 14,
                        fontSize: 15,
                        fontWeight: 500,
                        fontFamily: 'var(--font-dm-sans)',
                        cursor: signingOut ? 'wait' : 'pointer',
                        marginBottom: 12,
                        opacity: signingOut ? 0.6 : 1,
                    }}>
                    {signingOut ? 'Signing out…' : 'Sign out'}
                </button>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: 14,
                        fontSize: 15,
                        fontFamily: 'var(--font-dm-sans)',
                        cursor: 'pointer',
                    }}>
                    Close
                </button>
            </div>
        </div>
    );
}
