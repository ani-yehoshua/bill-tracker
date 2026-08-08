'use client';

import * as React from 'react';
import {
    createHousehold,
    joinHouseholdByCode,
    parseHouseholdError,
} from '@/lib/db/household';

const ERROR_COPY: Record<string, string> = {
    invalid_code:
        "We don't recognize that code — double-check with your partner.",
    already_in_household: "You're already in a household.",
    not_authenticated: 'Please sign in again.',
    unknown: 'Something went wrong — try again.',
};

function formatCodeInput(raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (clean.length <= 4) return clean;
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

export default function HouseholdGate() {
    const [mode, setMode] = React.useState<'choose' | 'join'>('choose');
    const [code, setCode] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleCreate = async () => {
        setError('');
        setLoading(true);
        try {
            await createHousehold();
            // Hard navigation, not router.replace/refresh — guarantees a
            // fresh server-rendered response with no client router-cache
            // race against the membership row that was just inserted.
            window.location.href = '/';
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            const errCode = parseHouseholdError(msg);
            setError(errCode === 'unknown' && msg ? msg : ERROR_COPY[errCode]);
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setError('');
        setLoading(true);
        try {
            await joinHouseholdByCode(code);
            window.location.href = '/';
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            const errCode = parseHouseholdError(msg);
            setError(errCode === 'unknown' && msg ? msg : ERROR_COPY[errCode]);
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: 480,
                margin: '0 auto',
                padding: '20px 24px',
            }}>
            <div
                style={{
                    fontFamily: 'var(--font-dm-serif)',
                    fontSize: 32,
                    color: 'var(--accent)',
                    lineHeight: 1,
                    marginBottom: 8,
                    textAlign: 'center',
                }}>
                Set up your household
            </div>
            <p
                style={{
                    fontSize: 13,
                    color: 'var(--muted)',
                    marginBottom: 32,
                    textAlign: 'center',
                }}>
                Start fresh, or join the household your partner already
                created.
            </p>

            {mode === 'choose' ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: 'var(--accent)',
                            color: '#0f1117',
                            border: 'none',
                            borderRadius: 16,
                            padding: 18,
                            fontSize: 16,
                            fontWeight: 600,
                            fontFamily: 'var(--font-dm-sans)',
                            cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                        }}>
                        {loading ? 'Creating…' : '🏠 Start a household'}
                    </button>
                    <button
                        onClick={() => setMode('join')}
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: 'var(--surface2)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: 16,
                            padding: 18,
                            fontSize: 16,
                            fontWeight: 600,
                            fontFamily: 'var(--font-dm-sans)',
                            cursor: 'pointer',
                        }}>
                        🔑 Join with a code
                    </button>
                </div>
            ) : (
                <div style={{ width: '100%' }}>
                    <input
                        value={code}
                        onChange={e => setCode(formatCodeInput(e.target.value))}
                        placeholder='OWED-4F2K'
                        maxLength={9}
                        autoCapitalize='characters'
                        autoFocus
                        style={{
                            width: '100%',
                            background: 'var(--surface2)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '16px',
                            color: 'var(--accent)',
                            fontFamily: 'var(--font-dm-serif)',
                            fontSize: 22,
                            letterSpacing: '0.1em',
                            textAlign: 'center',
                            outline: 'none',
                            boxSizing: 'border-box',
                            marginBottom: 16,
                        }}
                    />
                    <button
                        onClick={handleJoin}
                        disabled={loading || code.length < 9}
                        style={{
                            width: '100%',
                            background: 'var(--accent)',
                            color: '#0f1117',
                            border: 'none',
                            borderRadius: 16,
                            padding: 16,
                            fontSize: 16,
                            fontWeight: 600,
                            fontFamily: 'var(--font-dm-sans)',
                            cursor: loading ? 'wait' : 'pointer',
                            opacity: loading || code.length < 9 ? 0.6 : 1,
                            marginBottom: 12,
                        }}>
                        {loading ? 'Joining…' : 'Join household'}
                    </button>
                    <button
                        onClick={() => {
                            setMode('choose');
                            setError('');
                        }}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            color: 'var(--muted)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            padding: 14,
                            fontSize: 14,
                            fontFamily: 'var(--font-dm-sans)',
                            cursor: 'pointer',
                        }}>
                        Back
                    </button>
                </div>
            )}

            {error && (
                <div
                    style={{
                        fontSize: 12,
                        color: 'var(--danger)',
                        marginTop: 16,
                        textAlign: 'center',
                    }}>
                    {error}
                </div>
            )}
        </div>
    );
}
