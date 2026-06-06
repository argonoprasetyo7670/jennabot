/**
 * template-builder.ts
 * Factory helpers for building workflow template nodes & edges.
 *
 * Standard dual-prompt layout:
 *   [u_model] ─┐
 *   [u_bg]    ─┼─(references)→ [n2: imageGen] ←(prompt)─ [n1: image prompt]
 *   [u_product]┘                      │
 *                          (selectedImage→startImage)
 *                                     ↓
 *                           [n3: videoGen] ←(prompt)─ [nv: video prompt]
 */

import type {
  SerializedNode,
  SerializedEdge,
  DualPromptConfig,
  ImageModel,
  VideoModel,
} from "./workflow-types"

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_IMAGE_MODEL: ImageModel = "nano-banana-pro"
const DEFAULT_VIDEO_MODEL: VideoModel = "veo-3.1-lite-low-priority"
const DEFAULT_IMAGE_COUNT = 4

// ─── Standard upload nodes (injected into every template) ────────────────────

export const STD_UPLOAD_NODES: SerializedNode[] = [
  { id: "u_model",    type: "uploadNode", position: { x: -60, y: -60  }, data: { _label: "Model" } },
  { id: "u_bg",      type: "uploadNode", position: { x: -60, y: 200  }, data: { _label: "Background" } },
  { id: "u_product", type: "uploadNode", position: { x: -60, y: 460  }, data: { _label: "Produk" } },
]

// ─── Standard reference edges: 3 uploads → imageGenNode (n2) ─────────────────

export const STD_REF_EDGES: SerializedEdge[] = [
  { id: "e_m_img",  source: "u_model",   target: "n2", sourceHandle: "mediaGenerationId", targetHandle: "references" },
  { id: "e_b_img",  source: "u_bg",      target: "n2", sourceHandle: "mediaGenerationId", targetHandle: "references" },
  { id: "e_pr_img", source: "u_product", target: "n2", sourceHandle: "mediaGenerationId", targetHandle: "references" },
]

// ─── Core template builder ────────────────────────────────────────────────────

/**
 * Wraps raw nodes+edges with:
 * 1. Standard 3 upload nodes (u_model, u_bg, u_product)
 * 2. Reference edges connecting them to imageGenNode (n2)
 * 3. Optional preloaded node data injection
 *
 * IMPORTANT: imageGenNode MUST use id "n2" for refs to auto-wire.
 */
export function buildTemplate(
  nodes: SerializedNode[],
  edges: SerializedEdge[],
  preloadedNodes?: Record<string, Record<string, unknown>>
): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  const allNodes = [...STD_UPLOAD_NODES, ...nodes]
  const allEdges = [...STD_REF_EDGES, ...edges]

  const injected = preloadedNodes
    ? allNodes.map(n =>
        preloadedNodes[n.id] ? { ...n, data: { ...n.data, ...preloadedNodes[n.id] } } : n
      )
    : allNodes

  return { nodes: injected, edges: allEdges }
}

// ─── Dual-prompt template factory ────────────────────────────────────────────

/**
 * Builds the standard dual-prompt workflow:
 *   n1 (image prompt) → n2 (imageGen) → n3 (videoGen) ← nv (video prompt)
 * Returns raw { nodes, edges } — pass to buildTemplate() to add STD nodes.
 */
export function makeDualPromptTemplate(cfg: DualPromptConfig): {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
} {
  const imageModel = cfg.imageModel ?? DEFAULT_IMAGE_MODEL
  const videoModel = cfg.videoModel ?? DEFAULT_VIDEO_MODEL
  const imageCount = cfg.imageCount ?? DEFAULT_IMAGE_COUNT

  // Output nodes at x=1580
  const outputNodes: SerializedNode[] = []
  const outputEdges: SerializedEdge[] = []

  if (cfg.outputs === "gallery+output") {
    outputNodes.push(
      { id: "n4", type: "galleryNode", position: { x: 1580, y: -40 }, data: {} },
      { id: "n5", type: "outputNode",  position: { x: 1580, y: 200 }, data: {} }
    )
    outputEdges.push(
      { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
      { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" }
    )
  } else if (cfg.outputs === "output-only") {
    outputNodes.push(
      { id: "n4", type: "outputNode", position: { x: 1580, y: 120 }, data: {} }
    )
    outputEdges.push(
      { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" }
    )
  } else {
    // gallery-only
    outputNodes.push(
      { id: "n4", type: "galleryNode", position: { x: 1580, y: 120 }, data: {} }
    )
    outputEdges.push(
      { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" }
    )
  }

  const nodes: SerializedNode[] = [
    { id: "n1", type: "promptNode",  position: { x: 320, y: 30  }, data: { prompt: cfg.imagePrompt } },
    { id: "nv", type: "promptNode",  position: { x: 320, y: 430 }, data: { prompt: cfg.videoPrompt } },
    { id: "n2", type: "imageGenNode",position: { x: 780, y: 30  }, data: { model: imageModel, aspectRatio: cfg.imageAspect, count: imageCount } },
    { id: "n3", type: "videoGenNode",position: { x: 1200, y: 30 }, data: { model: videoModel, aspectRatio: cfg.videoAspect, duration: cfg.videoDuration } },
    ...outputNodes,
  ]

  const edges: SerializedEdge[] = [
    { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt",        targetHandle: "prompt"     },
    { id: "e2", source: "nv", target: "n3", sourceHandle: "prompt",        targetHandle: "prompt"     },
    { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
    ...outputEdges,
  ]

  return { nodes, edges }
}
