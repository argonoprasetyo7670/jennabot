"use client"

/**
 * Global error boundary — catches errors in root layout.
 * Must be a client component and must include its own <html>/<body>.
 *
 * `export const dynamic` is NOT supported in error files (client components),
 * so this file exists purely to provide a static fallback that Next.js
 * can prerender without hitting the workStore bug.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          margin: 0,
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            background: "linear-gradient(135deg, #ef4444, #f97316)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
          }}
        >
          Terjadi Kesalahan
        </h1>
        <p
          style={{
            marginTop: "1rem",
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.5)",
            maxWidth: "400px",
            textAlign: "center",
          }}
        >
          {error?.message || "Sesuatu yang tidak terduga terjadi"}
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "2rem",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Coba lagi
        </button>
      </body>
    </html>
  )
}
