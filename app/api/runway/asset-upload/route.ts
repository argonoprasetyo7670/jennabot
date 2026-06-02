import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

const USEAPI_BASE = "https://api.useapi.net/v1/runwayml"

/**
 * Map HTTP status codes & common error texts to user-friendly Indonesian messages.
 */
function friendlyUploadError(status: number, rawError: string): string {
  const lower = rawError.toLowerCase()

  // By status code
  if (status === 413 || lower.includes("entity too large") || lower.includes("too large"))
    return "Ukuran file terlalu besar. Maksimal 16MB untuk gambar atau 100MB untuk video."
  if (status === 415 || lower.includes("unsupported media"))
    return "Format file tidak didukung. Gunakan PNG, JPEG, WebP, atau MP4."
  if (status === 429 || lower.includes("rate limit") || lower.includes("too many"))
    return "Terlalu banyak permintaan. Tunggu beberapa saat lalu coba lagi."
  if (status === 401 || status === 403)
    return "Sesi login habis. Silakan refresh halaman dan login ulang."
  if (status === 503 || status === 502 || lower.includes("unavailable"))
    return "Layanan sedang sibuk. Coba lagi dalam beberapa menit."
  if (status >= 500)
    return "Terjadi kesalahan pada server. Coba lagi dalam beberapa saat."

  // By text content
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "Upload timeout. Pastikan koneksi internet stabil dan coba lagi."
  if (lower.includes("invalid") || lower.includes("bad request"))
    return "File tidak valid. Pastikan file adalah gambar atau video yang benar."

  return "Gagal mengupload file. Silakan coba lagi."
}

/**
 * POST /api/runway/asset-upload
 * Upload an image or video asset to Runway via UseAPI.
 */
export async function POST(req: NextRequest) {
  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "Layanan tidak tersedia saat ini." }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 })
  }

  try {
    const contentType = req.headers.get("content-type") || "image/jpeg"
    const name = req.nextUrl.searchParams.get("name") || `asset-${Date.now()}`
    const email = req.nextUrl.searchParams.get("email")

    const params = new URLSearchParams()
    params.set("name", name)
    if (email) params.set("email", email)

    const body = await req.arrayBuffer()

    console.log(`[runway/asset-upload] Uploading ${contentType} asset "${name}" (${body.byteLength} bytes)`)

    const response = await fetch(`${USEAPI_BASE}/assets/?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": contentType,
      },
      body,
    })

    // Parse response — UseAPI may return plain text on errors
    let data: Record<string, unknown>
    const responseText = await response.text()
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error(`[runway/asset-upload] Non-JSON response (${response.status}):`, responseText.slice(0, 300))
      return NextResponse.json(
        { error: friendlyUploadError(response.status, responseText) },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      const rawError = (data.error as string) || responseText.slice(0, 200)
      console.error(`[runway/asset-upload] Error ${response.status}:`, rawError)
      return NextResponse.json(
        { error: friendlyUploadError(response.status, rawError) },
        { status: response.status }
      )
    }

    console.log(`[runway/asset-upload] Success: assetId=${data.assetId}`)

    return NextResponse.json({
      assetId: data.assetId,
      url: data.url,
      mediaType: data.type?.type || "image",
      name: data.name,
    })
  } catch (error) {
    console.error("[runway/asset-upload] Error:", error)
    return NextResponse.json({ error: "Gagal mengupload file. Silakan coba lagi." }, { status: 500 })
  }
}

export const maxDuration = 120
