/**
 * Video Template page types
 */

/* ─── Reference Image Input ─── */
export type RefImage =
  | { kind: "file"; file: File; preview: string }
  | { kind: "gallery"; mediaGenerationId: string; preview: string }

/* ─── Scene Result ─── */
export interface SceneResult {
  scene: number
  name: string
  dialogue: string
  image?: { mediaGenerationId: string; fifeUrl: string }
  video?: { mediaGenerationId: string; fifeUrl: string; rawUrl?: string }
  status: "pending" | "generating-image" | "generating-video" | "completed" | "failed"
  error?: string
  imagePrompt?: string
  videoPrompt?: string
  isEditing?: boolean
  isEditingDialogue?: boolean
}

/* ─── Upload Status ─── */
export interface UploadedRef {
  modelId: string
  backgroundId: string
  productId: string
  email: string
}
