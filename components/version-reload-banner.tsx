"use client"

import * as React from "react"
import { RefreshCwIcon, XIcon } from "lucide-react"

const VERSION_MISMATCH_PATTERNS = [
  "Failed to find Server Action",
  "older or newer deployment",
  "ChunkLoadError",
  "Loading chunk",
  "failed to fetch dynamically imported module",
  "Importing a module script failed",
  "CSS_CHUNK_LOAD_FAILED",
]

function getErrorText(value: unknown) {
  if (value instanceof Error) return `${value.name} ${value.message} ${value.stack ?? ""}`
  if (typeof value === "string") return value
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return [record.name, record.message, record.stack, record.reason]
      .filter(Boolean)
      .map(String)
      .join(" ")
  }
  return ""
}

function isVersionMismatch(value: unknown) {
  const text = getErrorText(value).toLowerCase()
  return VERSION_MISMATCH_PATTERNS.some((pattern) => text.includes(pattern.toLowerCase()))
}

export function VersionReloadBanner() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const showIfVersionMismatch = (value: unknown) => {
      if (isVersionMismatch(value)) setVisible(true)
    }

    const handleError = (event: ErrorEvent) => {
      showIfVersionMismatch(event.error || event.message)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      showIfVersionMismatch(event.reason)
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-xl items-center gap-3 rounded-lg border border-violet-400/30 bg-background/95 p-3 text-foreground shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold">Versi aplikasi sudah diperbarui</p>
        <p className="text-xs text-muted-foreground">Muat ulang halaman untuk memakai versi terbaru.</p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-violet-500 px-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-violet-400"
      >
        <RefreshCwIcon className="h-3.5 w-3.5" />
        Reload
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Tutup"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
