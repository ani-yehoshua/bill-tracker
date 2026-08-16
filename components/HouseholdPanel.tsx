'use client';

import * as React from 'react';
import { useHousehold } from '@/hooks/useHousehold';
import { updateProfile } from '@/lib/db/profile';
import { AVATAR_EMOJI_PRESETS } from '@/lib/types';

interface HouseholdPanelProps {
    userId: string;
    householdId: string;
    onClose: () => void;
    showToast: (msg: string) => void;
}

function daysUntil(iso: string) {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(1, Math.ceil(ms / 86_400_000));
}

function isExpired(iso: string | null) {
    if (!iso) return false;
    return new Date(iso).getTime() <= Date.now();
}

export default function HouseholdPanel({
    userId,
    householdId,
    onClose,
    showToast,
}: HouseholdPanelProps) {
    const {
        name,
        inviteCode,
        inviteCodeExpiresAt,
        members,
        loading,
        refetch,
        rotate,
        rename,
        closeInvites,
    } = useHousehold(householdId);
    const [rotating, setRotating] = React.useState(false);
    const [closing, setClosing] = React.useState(false);
    const [signingOut, setSigningOut] = React.useState(false);

    const self = members.find(m => m.userId === userId);

    const [nameInput, setNameInput] = React.useState('');
    const [savingName, setSavingName] = React.useState(false);
    React.useEffect(() => setNameInput(name), [name]);

    const [displayNameInput, setDisplayNameInput] = React.useState('');
    const [avatarEmoji, setAvatarEmoji] = React.useState('🙂');
    const [savingProfile, setSavingProfile] = React.useState(false);
    React.useEffect(() => {
        if (!self) return;
        setDisplayNameInput(self.displayName ?? '');
        setAvatarEmoji(self.avatarEmoji);
    }, [self]);

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

    const handleCloseInvites = async () => {
        setClosing(true);
        try {
            await closeInvites();
            showToast('Invites closed');
        } catch {
            showToast('Could not close invites');
        } finally {
            setClosing(false);
        }
    };

    const handleSaveName = async () => {
        const trimmed = nameInput.trim();
        if (!trimmed || trimmed === name) return;
        setSavingName(true);
        try {
            await rename(trimmed);
            showToast('Household renamed ✓');
        } catch {
            showToast('Could not rename — try again');
        } finally {
            setSavingName(false);
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            await updateProfile(userId, {
                displayName: displayNameInput.trim(),
                avatarEmoji,
            });
            await refetch();
            showToast('Profile updated ✓');
        } catch {
            showToast('Could not save — try again');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSignOut = async () => {
        setSigningOut(true);
        await fetch('/auth/signout', { method: 'POST' });
        window.location.href = '/login';
    };

    const profileDirty =
        !!self &&
        (displayNameInput.trim() !== (self.displayName ?? '') ||
            avatarEmoji !== self.avatarEmoji);

    // A code can still be sitting in `invite_code` after it's expired —
    // nothing nulls it out automatically, only an explicit rotate/close
    // does. Treat an expired code the same as no code at all, so this
    // never shows a dead code as if it's still shareable.
    const codeExpired = isExpired(inviteCodeExpiresAt);
    const codeActive = !!inviteCode && !codeExpired;

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
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                    Manage your household together.
                </p>

                {/* Household name */}
                <div
                    style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '14px 16px',
                        marginBottom: 12,
                    }}>
                    <label style={labelStyle}>Household Name</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                        <input
                            style={{ ...inputStyle, flex: 1 }}
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            placeholder='Our Household'
                        />
                        <button
                            onClick={handleSaveName}
                            disabled={
                                savingName ||
                                !nameInput.trim() ||
                                nameInput.trim() === name
                            }
                            style={{
                                ...saveBtnStyle,
                                opacity:
                                    savingName ||
                                    !nameInput.trim() ||
                                    nameInput.trim() === name
                                        ? 0.5
                                        : 1,
                            }}>
                            {savingName ? '…' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Your profile */}
                <div
                    style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '14px 16px',
                        marginBottom: 12,
                    }}>
                    <label style={labelStyle}>Your Name</label>
                    <input
                        style={{ ...inputStyle, marginBottom: 10 }}
                        value={displayNameInput}
                        onChange={e => setDisplayNameInput(e.target.value)}
                        placeholder={self?.email ?? 'Your name'}
                    />
                    <label style={labelStyle}>Your Icon</label>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6,1fr)',
                            gap: 8,
                            marginBottom: 10,
                        }}>
                        {AVATAR_EMOJI_PRESETS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setAvatarEmoji(emoji)}
                                style={{
                                    background:
                                        avatarEmoji === emoji
                                            ? 'rgba(200,169,110,0.15)'
                                            : 'var(--surface)',
                                    border: `1px solid ${avatarEmoji === emoji ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: 10,
                                    padding: '8px 0',
                                    fontSize: 18,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}>
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile || !profileDirty}
                        style={{
                            ...saveBtnStyle,
                            width: '100%',
                            opacity: savingProfile || !profileDirty ? 0.5 : 1,
                        }}>
                        {savingProfile ? 'Saving…' : 'Save Profile'}
                    </button>
                </div>

                {/* Invite code */}
                <div
                    style={{
                        background: 'var(--surface2)',
                        border: '1px dashed var(--border)',
                        borderRadius: 12,
                        padding: '18px 16px',
                        marginBottom: 12,
                        textAlign: 'center',
                    }}>
                    {codeActive ? (
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
                                    marginBottom: 12,
                                }}>
                                Tap to copy. Share it with anyone joining
                                your household — it works for{' '}
                                {inviteCodeExpiresAt
                                    ? `${daysUntil(inviteCodeExpiresAt)} more day${daysUntil(inviteCodeExpiresAt) === 1 ? '' : 's'}`
                                    : 'a few days'}
                                , or until you close it below.
                            </div>
                            <button
                                onClick={handleCloseInvites}
                                disabled={closing}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    padding: '8px 14px',
                                    color: 'var(--muted)',
                                    fontSize: 13,
                                    fontFamily: 'var(--font-dm-sans)',
                                    cursor: closing ? 'wait' : 'pointer',
                                }}>
                                {closing ? 'Closing…' : 'Close invites'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                }}>
                                {codeExpired
                                    ? 'Invite code expired'
                                    : 'Invites are closed'}
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

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--muted)',
    marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 12px',
    color: 'var(--text)',
    fontFamily: 'var(--font-dm-sans)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
};

const saveBtnStyle: React.CSSProperties = {
    background: 'var(--accent)',
    color: '#0f1117',
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'var(--font-dm-sans)',
    cursor: 'pointer',
    flexShrink: 0,
};
