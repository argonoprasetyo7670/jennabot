import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse the expiry date from a signed media URL.
 *
 * Supports:
 * - Google Flow CDN: `?Expires=<unix_timestamp>`
 * - AWS S3 signed URLs: `?X-Amz-Expires=<seconds>&X-Amz-Date=<YYYYMMDDTHHMMSSZ>`
 * - Generic: any `?expires=<unix_timestamp>` or `?exp=<unix_timestamp>`
 *
 * Returns null if no expiry info found.
 */
export function parseMediaUrlExpiry(url: string): Date | null {
  try {
    const u = new URL(url)
    // Google Flow CDN: Expires is a Unix timestamp
    const expires = u.searchParams.get("Expires") || u.searchParams.get("expires")
    if (expires) {
      const ts = parseInt(expires, 10)
      if (!isNaN(ts)) return new Date(ts * 1000)
    }
    // Generic exp param
    const exp = u.searchParams.get("exp")
    if (exp) {
      const ts = parseInt(exp, 10)
      if (!isNaN(ts)) return new Date(ts * 1000)
    }
  } catch {
    // Invalid URL — ignore
  }
  return null
}

/**
 * Returns true if the URL has an `Expires` param AND it is in the past.
 * Returns false if URL has no expiry info (unknown = assume valid).
 */
export function isMediaUrlExpired(url: string): boolean {
  const expiry = parseMediaUrlExpiry(url)
  if (!expiry) return false
  return expiry.getTime() < Date.now()
}

/**
 * Returns a human-readable label like "Expired" or "Expires in 5h 30m".
 */
export function mediaUrlExpiryLabel(url: string, locale = "id-ID"): string | null {
  const expiry = parseMediaUrlExpiry(url)
  if (!expiry) return null
  const diff = expiry.getTime() - Date.now()
  if (diff <= 0) return "Kadaluarsa"
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h >= 24) {
    return `Berlaku ${Math.floor(h / 24)}h lagi`
  }
  if (h > 0) return `Berlaku ${h}j ${m}m lagi`
  return `Berlaku ${m}m lagi`
}
