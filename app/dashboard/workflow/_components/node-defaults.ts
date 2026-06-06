/**
 * Shared workflow node defaults — single source of truth for all model IDs,
 * aspect ratios, and other config values used across node components.
 */

export const IMAGE_MODELS = [
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "nano-banana-2", label: "Nano Banana 2" },
  { value: "imagen-4", label: "Imagen 4" },
] as const

export type ImageModel = (typeof IMAGE_MODELS)[number]["value"]

export const VIDEO_MODELS = [
  { value: "veo-3.1-lite-low-priority", label: "Veo 3.1 Lite" },
] as const

export type VideoModel = (typeof VIDEO_MODELS)[number]["value"]

export const IMAGE_ASPECT_RATIOS = ["9:16", "1:1", "16:9", "4:3", "3:4"] as const
export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16"] as const

export const DEFAULTS = {
  imageModel: "nano-banana-pro" as ImageModel,
  videoModel: "veo-3.1-lite-low-priority" as VideoModel,
  imageAspectRatio: "9:16",
  videoAspectRatio: "16:9",
  imageCount: 4,
  videoDuration: "8s",
} as const

/** Map aspect ratio string → UseAPI landscape/portrait param */
export function toVideoAspect(ar: string): "landscape" | "portrait" {
  return ar === "9:16" ? "portrait" : "landscape"
}

/** Map duration string → UseAPI numeric seconds param */
export function toDurationSeconds(dur: string): 4 | 8 {
  return dur === "5s" ? 4 : 8
}
