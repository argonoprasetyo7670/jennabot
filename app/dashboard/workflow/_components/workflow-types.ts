/**
 * workflow-types.ts
 * Shared types & interfaces for the workflow system.
 */

// ─── Core Data Structures ───────────────────────────────────────────────────

export interface WorkflowData {
  id: string
  name: string
  description?: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  viewport: { x: number; y: number; zoom: number }
  createdAt: string
  updatedAt: string
}

export interface SerializedNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface SerializedEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

// ─── Template Types ──────────────────────────────────────────────────────────

export interface TemplateRef {
  id: string
  label: string
  icon: string
  description: string
}

export interface TemplateInfo {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  requiredRefs?: TemplateRef[]
}

// ─── Template Builder Types ──────────────────────────────────────────────────

export type AspectRatio   = "16:9" | "4:3" | "1:1" | "3:4" | "9:16"
export type VideoDuration = "5s" | "8s" | "10s"
export type VideoModel    = "veo-3.1-lite-low-priority" | "veo-3.1-flash-low-priority"
export type ImageModel    = "nano-banana-pro" | "nano-banana-2" | "imagen-4"

/**
 * Config for the standard dual-prompt template layout:
 *   [n1: image prompt] → [n2: imageGen] → [n3: videoGen] ← [nv: video prompt]
 * Output nodes appended after n3.
 */
export interface DualPromptConfig {
  /** Prompt describing the composition/references for image generation */
  imagePrompt: string
  /** Prompt describing motion & camera direction for video generation */
  videoPrompt: string
  /** Aspect ratio for the generated image */
  imageAspect: AspectRatio
  /** Image generation model */
  imageModel?: ImageModel
  /** Number of images to generate */
  imageCount?: number
  /** Aspect ratio for the generated video */
  videoAspect: AspectRatio
  /** Video duration */
  videoDuration: VideoDuration
  /** Video generation model */
  videoModel?: VideoModel
  /**
   * Output node configuration:
   * - "gallery+output"  → galleryNode (n4) + outputNode (n5)
   * - "output-only"     → outputNode (n4) only
   * - "gallery-only"    → galleryNode (n4) only
   */
  outputs: "gallery+output" | "output-only" | "gallery-only"
}
