'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

const RESEND_COOLDOWN = 30;

export default function AuthScreen() {
    const supabase = createClient();

    const [step, setStep] = React.useState<'email' | 'code'>('email');
    const [email, setEmail] = React.useState('');
    const [digits, setDigits] = React.useState<string[]>(Array(6).fill(''));
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [cooldown, setCooldown] = React.useState(0);
    const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

    React.useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const sendCode = async () => {
        setError('');
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true },
        });
        setLoading(false);
        if (error) {
            setError(error.message);
            return;
        }
        setStep('code');
        setCooldown(RESEND_COOLDOWN);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
    };

    const submitCode = async (code: string) => {
        if (code.length !== 6) return;
        setError('');
        setLoading(true);
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'email',
        });
        setLoading(false);
        if (error) {
            setError("That code didn't work — check it and try again.");
            setDigits(Array(6).fill(''));
            inputRefs.current[0]?.focus();
            return;
        }
        // Hard navigation — see HouseholdGate.tsx for why this beats
        // router.replace/refresh here.
        window.location.assign('/');
    };

    const handleDigitChange = (i: number, value: string) => {
        const v = value.replace(/\D/g, '');
        if (!v) {
            const next = [...digits];
            next[i] = '';
            setDigits(next);
            return;
        }
        // Paste-to-fill: if more than one digit landed in one box, spread it.
        if (v.length > 1) {
            const next = [...digits];
            for (let j = 0; j < v.length && i + j < 6; j++) next[i + j] = v[j];
            setDigits(next);
            const lastIdx = Math.min(i + v.length, 5);
            inputRefs.current[lastIdx]?.focus();
            if (next.every(d => d)) submitCode(next.join(''));
            return;
        }
        const next = [...digits];
        next[i] = v;
        setDigits(next);
        if (i < 5) inputRefs.current[i + 1]?.focus();
        if (next.every(d => d)) submitCode(next.join(''));
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) {
            inputRefs.current[i - 1]?.focus();
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
                    fontSize: 44,
                    color: 'var(--accent)',
                    lineHeight: 1,
                }}>
                Owed
            </div>
            <div
                style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    marginTop: 6,
                    marginBottom: 40,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                }}>
                Track your bills, together
            </div>

            <div style={{ width: '100%' }}>
                {step === 'email' ? (
                    <>
                        <label
                            style={{
                                display: 'block',
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--muted)',
                                marginBottom: 6,
                            }}>
                            Email
                        </label>
                        <input
                            type='email'
                            inputMode='email'
                            autoComplete='email'
                            autoFocus
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendCode()}
                            placeholder='you@example.com'
                            style={{
                                width: '100%',
                                background: 'var(--surface2)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '14px 16px',
                                color: 'var(--text)',
                                fontFamily: 'var(--font-dm-sans)',
                                fontSize: 16,
                                outline: 'none',
                                boxSizing: 'border-box',
                                marginBottom: 16,
                            }}
                        />
                        <button
                            onClick={sendCode}
                            disabled={loading || !email}
                            style={{
                                width: '100%',
                                background: 'var(--accent)',
                                color: '#0f1117',
                                border: 'none',
                                borderRadius: 20,
                                padding: 16,
                                fontSize: 16,
                                fontWeight: 600,
                                fontFamily: 'var(--font-dm-sans)',
                                cursor: loading ? 'wait' : 'pointer',
                                opacity: loading || !email ? 0.6 : 1,
                            }}>
                            {loading ? 'Sending…' : 'Send me a code'}
                        </button>
                    </>
                ) : (
                    <>
                        <div
                            style={{
                                fontSize: 13,
                                color: 'var(--muted)',
                                marginBottom: 16,
                                textAlign: 'center',
                            }}>
                            Enter the 6-digit code sent to{' '}
                            <span style={{ color: 'var(--text)' }}>{email}</span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: 8,
                                marginBottom: 20,
                            }}>
                            {digits.map((d, i) => (
                                <input
                                    key={i}
                                    ref={el => {
                                        inputRefs.current[i] = el;
                                    }}
                                    value={d}
                                    onChange={e =>
                                        handleDigitChange(i, e.target.value)
                                    }
                                    onKeyDown={e => handleKeyDown(i, e)}
                                    inputMode='numeric'
                                    autoComplete='one-time-code'
                                    maxLength={6}
                                    style={{
                                        width: 44,
                                        height: 52,
                                        textAlign: 'center',
                                        fontSize: 24,
                                        background: 'var(--surface2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 12,
                                        color: 'var(--text)',
                                        fontFamily: 'var(--font-dm-sans)',
                                        outline: 'none',
                                    }}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => sendCode()}
                            disabled={cooldown > 0 || loading}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                color: cooldown > 0 ? 'var(--muted)' : 'var(--accent)',
                                border: '1px solid var(--border)',
                                borderRadius: 14,
                                padding: 12,
                                fontSize: 13,
                                fontFamily: 'var(--font-dm-sans)',
                                cursor: cooldown > 0 ? 'default' : 'pointer',
                            }}>
                            {cooldown > 0
                                ? `Resend code in ${cooldown}s`
                                : 'Resend code'}
                        </button>
                    </>
                )}

                {error && (
                    <div
                        style={{
                            fontSize: 12,
                            color: 'var(--danger)',
                            marginTop: 12,
                            textAlign: 'center',
                        }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
