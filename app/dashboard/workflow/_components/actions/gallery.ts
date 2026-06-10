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

export async function saveToGallery(options: GallerySaveOptions): Promise<{ gcsUrl: string; item: any }> {
  const { url, prompt = "Workflow auto-save", model, aspectRatio, type } = options
  const isVideo = type === "video" || url.includes("video") || url.includes(".mp4") || url.includes("mode=inline")
  const res = await fetch("/api/gallery/save", {
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
  if (!res.ok) throw new Error("Failed to save to gallery")
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return { gcsUrl: data.item?.gcsUrl || url, item: data.item }
}

export function isVideoUrl(url: string): boolean {
  return url.includes("video") || url.includes(".mp4") || url.includes("mode=inline")
}
