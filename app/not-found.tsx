/**
 * Custom 404 page.
 *
 * Next.js 16 tries to prerender /_not-found at build time.
 * Force dynamic rendering to avoid "Expected workStore to be initialized" error.
 */
export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#0a0a0a",
        color: "#fafafa",
      }}
    >
      <h1
        style={{
          fontSize: "6rem",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          background: "linear-gradient(135deg, #8b5cf6, #3b82f6, #06b6d4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
        }}
      >
        404
      </h1>
      <p
        style={{
          marginTop: "1rem",
          fontSize: "1.125rem",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Halaman tidak ditemukan
      </p>
      <a
        href="/"
        style={{
          marginTop: "2rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1.5rem",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#fff",
          background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
          textDecoration: "none",
          transition: "opacity 0.2s",
        }}
      >
        ← Kembali ke beranda
      </a>
    </div>
  )
}
