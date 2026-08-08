export default function Loading() {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100dvh",
            }}>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</div>
        </div>
    );
}
