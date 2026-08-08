/**
 * crypto.randomUUID() requires a secure context — unavailable over plain
 * HTTP to a LAN dev origin (next.config.ts allowedDevOrigins) or in some
 * restricted webviews. Falls back to a manual RFC4122 v4 UUID so bill ids
 * are always valid for the `uuid` primary key column, even when it's
 * missing. Math.random() is fine here — this is a row id, not a secret.
 */
export function generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
