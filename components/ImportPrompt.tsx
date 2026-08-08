'use client';

import * as React from 'react';

interface ImportPromptProps {
    count: number;
    onMerge: () => void;
    onDiscard: () => void;
}

export default function ImportPrompt({
    count,
    onMerge,
    onDiscard,
}: ImportPromptProps) {
    const [loading, setLoading] = React.useState<'merge' | 'discard' | null>(
        null,
    );

    const handleMerge = async () => {
        setLoading('merge');
        await onMerge();
    };

    const handleDiscard = async () => {
        setLoading('discard');
        await onDiscard();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                zIndex: 250,
                display: 'flex',
                alignItems: 'flex-end',
                backdropFilter: 'blur(4px)',
            }}>
            <div
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px 24px 0 0',
                    padding:
                        '28px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
                    width: '100%',
                }}>
                <div
                    style={{
                        fontFamily: 'var(--font-dm-serif)',
                        fontSize: 20,
                        color: 'var(--accent)',
                        marginBottom: 10,
                    }}>
                    Bills found on this device
                </div>
                <p
                    style={{
                        fontSize: 14,
                        color: 'var(--muted)',
                        lineHeight: 1.6,
                        marginBottom: 24,
                    }}>
                    You have {count} bill{count !== 1 ? 's' : ''} saved on this
                    device from before joining the household. The household
                    already has bills too — do you want to add yours to the
                    household, or leave them behind?
                </p>
                <button
                    onClick={handleMerge}
                    disabled={loading !== null}
                    style={{
                        width: '100%',
                        background: 'var(--accent)',
                        color: '#0f1117',
                        border: 'none',
                        borderRadius: 14,
                        padding: 16,
                        fontSize: 15,
                        fontWeight: 600,
                        fontFamily: 'var(--font-dm-sans)',
                        cursor: loading ? 'wait' : 'pointer',
                        marginBottom: 10,
                        opacity: loading ? 0.6 : 1,
                    }}>
                    {loading === 'merge'
                        ? 'Adding…'
                        : `Merge ${count} bill${count !== 1 ? 's' : ''} into household`}
                </button>
                <button
                    onClick={handleDiscard}
                    disabled={loading !== null}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: 14,
                        fontSize: 14,
                        fontFamily: 'var(--font-dm-sans)',
                        cursor: loading ? 'wait' : 'pointer',
                    }}>
                    {loading === 'discard' ? 'Discarding…' : 'Discard mine'}
                </button>
            </div>
        </div>
    );
}
