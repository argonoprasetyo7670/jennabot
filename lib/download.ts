/**
 * Cross-browser download helper for media files.
 *
 * Safari iOS does NOT support:
 *  - `<a download>` for blob URLs
 *  - programmatic link clicks to trigger downloads
 *
 * For Safari/iOS we redirect the browser directly to the proxy URL
 * with `mode=attachment` — the server responds with Content-Disposition: attachment
 * which triggers the native download dialog.
 *
 * For other browsers we fetch a blob and use createObjectURL which gives
 * a cleaner UX (no navigation away from the page).
 */

function isSafariIOS(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  // iOS Safari, iPadOS Safari, or standalone WebView on iOS
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || isIOS
  return isIOS || isSafari
}

/**
 * Download a video file, handling Safari/iOS quirks.
 */
export async function downloadVideo(videoUrl: string, filename: string): Promise<void> {
  const proxyUrl = `/api/ai/video-download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}&mode=attachment`

  if (isSafariIOS()) {
    // Safari/iOS: direct navigation to proxy with Content-Disposition: attachment
    window.location.href = proxyUrl
    return
  }

  // Other browsers: fetch blob → createObjectURL → programmatic click
  try {
    const res = await fetch(proxyUrl)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    // Fallback: open in new tab
    window.open(proxyUrl, "_blank")
  }
}

/**
 * Download an image file, handling Safari/iOS quirks.
 */
export async function downloadImage(imageUrl: string, filename: string): Promise<void> {
  const proxyUrl = `/api/ai/image-download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`

  if (isSafariIOS()) {
    // Safari/iOS: direct navigation to proxy with Content-Disposition: attachment
    window.location.href = proxyUrl
    return
  }

  // Other browsers: fetch blob → createObjectURL → programmatic click
  try {
    const res = await fetch(proxyUrl)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(proxyUrl, "_blank")
  }
}

/**
 * Download a media file (auto-detect video/image by type).
 */
export async function downloadMedia(
  url: string,
  filename: string,
  type: "video" | "image"
): Promise<void> {
  if (type === "video") {
    return downloadVideo(url, filename)
  }
  return downloadImage(url, filename)
}
