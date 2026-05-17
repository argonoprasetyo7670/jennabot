/**
 * Google Flow Image Generation API client
 * Reusable across any page/component
 */

export type ImageModel = "imagen-4" | "nano-banana-2" | "nano-banana-pro"
export type AspectRatio = "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "auto"

export interface GenerateImageParams {
  prompt: string
  model?: ImageModel
  aspectRatio?: AspectRatio
  count?: number
  seed?: number
  references?: string[]
  email?: string
}

export interface GeneratedImage {
  url: string
  seed?: number
  mediaGenerationId?: string
  aspectRatio?: string
  modelNameType?: string
}

export interface GenerateImageResult {
  jobId: string
  images: GeneratedImage[]
}

export interface UploadAssetResult {
  mediaGenerationId: string
  width: number
  height: number
  email: string
}

/**
 * Upload a reference image file.
 * Pass `email` to force upload to a specific Google account.
 */
export async function uploadImageAsset(file: File, email?: string): Promise<UploadAssetResult> {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Use PNG, JPEG, or WebP.`)
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File size exceeds 20MB limit")
  }

  const params = new URLSearchParams()
  if (email) params.set("email", email)

  const res = await fetch(`/api/ai/image-upload?${params}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : data.error?.message || `Upload failed (${res.status})`)
  }

  return {
    mediaGenerationId: data.mediaGenerationId?.mediaGenerationId || "",
    width: data.width,
    height: data.height,
    email: data.email || "",
  }
}

/**
 * Re-upload a reference image from a URL (e.g. gallery item).
 * Pass `email` to force upload to a specific Google account.
 */
export async function uploadImageFromUrl(url: string, email?: string): Promise<UploadAssetResult> {
  const params = new URLSearchParams()
  params.set("url", url)
  if (email) params.set("email", email)

  const res = await fetch(`/api/ai/image-upload?${params}`, {
    method: "POST",
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : data.error?.message || `Upload failed (${res.status})`)
  }

  return {
    mediaGenerationId: data.mediaGenerationId?.mediaGenerationId || "",
    width: data.width,
    height: data.height,
    email: data.email || "",
  }
}

/**
 * Generate images using Google Flow API.
 * Pass email when using reference images to ensure same account.
 */
export async function generateImages(params: GenerateImageParams): Promise<GenerateImageResult> {
  if (!params.prompt?.trim()) {
    throw new Error("Prompt is required")
  }

  const body: Record<string, unknown> = {
    prompt: params.prompt.trim(),
    model: params.model || "imagen-4",
    aspectRatio: params.aspectRatio || "16:9",
    count: params.count || 1,
    seed: params.seed,
    references: params.references,
  }

  if (params.email) {
    body.email = params.email
  }

  const res = await fetch("/api/ai/image-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : data.error?.message || `Generation failed (${res.status})`)
  }

  const images: GeneratedImage[] = (data.media || [])
    .map((m: Record<string, unknown>) => {
      const gen = (m.image as Record<string, unknown>)?.generatedImage as Record<string, unknown> | undefined
      if (!gen?.fifeUrl) return null
      return {
        url: gen.fifeUrl as string,
        seed: gen.seed as number | undefined,
        mediaGenerationId: gen.mediaGenerationId as string | undefined,
        aspectRatio: gen.aspectRatio as string | undefined,
        modelNameType: gen.modelNameType as string | undefined,
      }
    })
    .filter(Boolean) as GeneratedImage[]

  if (images.length === 0) {
    throw new Error("No images were generated. Try a different prompt.")
  }

  return { jobId: data.jobId || "", images }
}

export interface UpscaleResult {
  encodedImage: string
}

/**
 * Upscale a generated image to 2K or 4K resolution.
 * Only works with nano-banana-pro and nano-banana-2 models.
 * Returns base64-encoded JPEG data.
 */
export async function upscaleImage(
  mediaGenerationId: string,
  resolution: "2k" | "4k" = "2k"
): Promise<UpscaleResult> {
  if (!mediaGenerationId) {
    throw new Error("mediaGenerationId is required for upscaling")
  }

  const res = await fetch("/api/ai/image-upscale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaGenerationId, resolution }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message || `Upscale failed (${res.status})`
    )
  }

  return { encodedImage: data.encodedImage }
}

/**
 * Download a base64-encoded image as a file.
 * Used for upscaled images which are returned as base64.
 */
export function downloadBase64Image(base64: string, filename: string) {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: "image/jpeg" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── Video Generation ─── */

export type VideoModel = "veo-3.1-quality" | "veo-3.1-fast" | "veo-3.1-lite" | "veo-3.1-lite-low-priority"
export type VideoAspectRatio = "landscape" | "portrait"
export type VideoDuration = 4 | 6 | 8

export interface GenerateVideoParams {
  prompt: string
  model?: VideoModel
  aspectRatio?: VideoAspectRatio
  duration?: VideoDuration
  count?: number
  seed?: number
  startImage?: string
  endImage?: string
  referenceImages?: string[]
  voice?: string
  email?: string
}

export interface GeneratedVideo {
  url: string
  seed?: number
  mediaGenerationId?: string
  model?: string
  aspectRatio?: string
  prompt?: string
}

export interface GenerateVideoResult {
  jobId: string
  videos: GeneratedVideo[]
  remainingCredits?: number
}

/**
 * Generate videos using Google Flow Veo 3.1 API.
 * Supports T2V, I2V (start/end frames), R2V (reference images), and voice narration.
 */
export async function generateVideos(params: GenerateVideoParams): Promise<GenerateVideoResult> {
  if (!params.prompt?.trim()) {
    throw new Error("Prompt is required")
  }

  const body: Record<string, unknown> = {
    prompt: params.prompt.trim(),
    model: params.model || "veo-3.1-fast",
    aspectRatio: params.aspectRatio || "landscape",
    duration: params.duration || 8,
    count: params.count || 1,
  }

  if (params.seed !== undefined) body.seed = params.seed
  if (params.email) body.email = params.email
  if (params.startImage) body.startImage = params.startImage
  if (params.endImage) body.endImage = params.endImage
  if (params.voice) body.voice = params.voice

  if (params.referenceImages?.length) {
    body.referenceImages = params.referenceImages
  }

  const res = await fetch("/api/ai/video-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : data.error?.message || `Generation failed (${res.status})`
    )
  }

  const videos: GeneratedVideo[] = (data.media || [])
    .map((m: Record<string, unknown>) => {
      const videoUrl = m.videoUrl as string | undefined
      if (!videoUrl) return null
      const gen = (m.video as Record<string, unknown>)?.generatedVideo as Record<string, unknown> | undefined
      return {
        url: videoUrl,
        seed: gen?.seed as number | undefined,
        mediaGenerationId: m.mediaGenerationId as string | undefined,
        model: gen?.model as string | undefined,
        aspectRatio: gen?.aspectRatio as string | undefined,
        prompt: gen?.prompt as string | undefined,
      }
    })
    .filter(Boolean) as GeneratedVideo[]

  if (videos.length === 0) {
    throw new Error("No videos were generated. Try a different prompt.")
  }

  return {
    jobId: data.jobId || "",
    videos,
    remainingCredits: data.remainingCredits,
  }
}
