/**
 * Thin client-side wrapper around /api/ai/image-upload
 * Sends raw binary body with correct Content-Type (not FormData).
 *
 * Pass `email` to pin the upload to a specific Google account.
 * This is critical when uploading multiple reference images — all refs
 * MUST be on the same Google account or the generation will only use 1 ref.
 */

export interface UploadResult {
  mediaGenerationId: string
  email: string
}

export async function uploadImageAsset(file: File, email?: string): Promise<UploadResult> {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
  const mimeType = file.type || "image/jpeg"

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Format tidak didukung: ${mimeType}. Gunakan PNG, JPEG, atau WebP.`)
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Ukuran file melebihi batas 20MB.")
  }

  const url = email
    ? `/api/ai/image-upload?email=${encodeURIComponent(email)}`
    : `/api/ai/image-upload`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: file,
  })

  const data = await res.json().catch(() => ({})) as Record<string, unknown>

  if (!res.ok) {
    const errMsg = typeof data.error === "string"
      ? data.error
      : (data.error as { message?: string } | undefined)?.message
      || `Upload gagal (${res.status})`
    throw new Error(errMsg)
  }

  // Upload API response: { mediaGenerationId: { mediaGenerationId: "user:..." }, email: "..." }
  // Unwrap the nested mediaGenerationId
  const mgId = data.mediaGenerationId
  const resolvedId = mgId && typeof mgId === "object"
    ? ((mgId as Record<string, string>).mediaGenerationId || "")
    : (mgId as string) || ""

  return {
    mediaGenerationId: resolvedId,
    email: (data.email as string) || "",
  }
}
