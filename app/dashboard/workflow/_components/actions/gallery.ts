/**
 * Shared gallery save action — used by ImageGenNode, VideoGenNode, GalleryNode
 */
export interface GallerySaveOptions {
  url: string
  prompt?: string
  model?: string
  aspectRatio?: string
  type?: "image" | "video"
}

export async function saveToGallery(options: GallerySaveOptions): Promise<void> {
  const { url, prompt = "Workflow auto-save", model, aspectRatio, type } = options
  const isVideo = type === "video" || url.includes("video") || url.includes(".mp4") || url.includes("mode=inline")
  await fetch("/api/gallery/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      prompt,
      model,
      aspectRatio,
      type: isVideo ? "video" : "image",
    }),
  })
}

export function isVideoUrl(url: string): boolean {
  return url.includes("video") || url.includes(".mp4") || url.includes("mode=inline")
}
