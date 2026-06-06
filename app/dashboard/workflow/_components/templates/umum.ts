/**
 * templates/umum.ts
 * General-purpose templates: Image to Video, Product Review, Model + Produk
 */

import { makeDualPromptTemplate } from "../template-builder"
import type { SerializedNode, SerializedEdge } from "../workflow-types"

// ─── image-to-video ──────────────────────────────────────────────────────────

export const IMAGE_TO_VIDEO = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic photo. The exact person from the first reference image is wearing the product from the third reference image, in the scene from the second reference image. Preserve the model's face, skin tone, and likeness accurately. Professional photography, perfect lighting. Portrait 9:16.",
  videoPrompt:
    "The person in the image gently moves and looks toward the camera with a natural smile. Smooth cinematic camera pull-back revealing the full look. Soft bokeh background, 8-second professional video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

// ─── product-review ───────────────────────────────────────────────────────────

export const PRODUCT_REVIEW = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic product photography. The exact person from the first reference image is wearing and using the product shown in the third reference image. Place them in the scene from the second reference image. Preserve the model's face, skin tone, and body accurately. Natural expression, photorealistic lighting. Portrait 9:16.",
  videoPrompt:
    "The model naturally interacts with the product, turning slightly and gesturing with a smile. Camera slowly pushes in for a closer look. Smooth cinematic motion, 8-second professional product review video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

// ─── model-product-promo ─────────────────────────────────────────────────────

export const MODEL_PRODUCT_PROMO = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic fashion photo. The exact person from the first reference image is wearing the outfit/product shown in the third reference image, standing in front of the background from the second reference image. Preserve the model's face and likeness accurately. Full body shot, professional studio lighting, photorealistic, fashion magazine quality. Portrait 9:16.",
  videoPrompt:
    "The model confidently walks forward, outfit flowing elegantly. Camera slowly dollies back to reveal the full look. Smooth cinematic motion, fashion runway energy, 8-second promo video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

// ─── Special: instagram-carousel (2 image-gen nodes, no video) ───────────────

export const INSTAGRAM_CAROUSEL: { nodes: SerializedNode[]; edges: SerializedEdge[] } = {
  nodes: [
    { id: "n1", type: "promptNode",  position: { x: 320, y: 60  }, data: { prompt: "Clean modern Instagram carousel slide. The exact person from the first reference image appears in a stylish pose with the product from the third reference image, against the background from the second reference image. Bold typography overlay, gradient background (deep violet to electric blue). Portrait 9:16." } },
    { id: "n2", type: "imageGenNode",position: { x: 780, y: 60  }, data: { model: "nano-banana-pro", aspectRatio: "9:16", count: 4 } },
    { id: "n3", type: "promptNode",  position: { x: 320, y: 400 }, data: { prompt: "Second Instagram carousel slide. Same gradient style as the first slide. Infographic-style layout with numbered product benefits and icons. The person or product from the references shown in a detail close-up. Portrait 9:16." } },
    { id: "n4", type: "imageGenNode",position: { x: 780, y: 400 }, data: { model: "nano-banana-pro", aspectRatio: "9:16", count: 4 } },
    { id: "n5", type: "galleryNode", position: { x: 1200, y: 60  }, data: {} },
    { id: "n6", type: "galleryNode", position: { x: 1200, y: 400 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt",        targetHandle: "prompt" },
    { id: "e2", source: "n3", target: "n4", sourceHandle: "prompt",        targetHandle: "prompt" },
    { id: "e3", source: "n2", target: "n5", sourceHandle: "selectedImage", targetHandle: "media"  },
    { id: "e4", source: "n4", target: "n6", sourceHandle: "selectedImage", targetHandle: "media"  },
  ],
}

// ─── Special: youtube-thumbnail (image-gen only, no video) ───────────────────

export const YOUTUBE_THUMBNAIL: { nodes: SerializedNode[]; edges: SerializedEdge[] } = {
  nodes: [
    { id: "n1", type: "promptNode",  position: { x: 320, y: 200 }, data: { prompt: "Ultra-realistic YouTube thumbnail. The exact person from the first reference image has a dramatic excited expression pointing at the product from the third reference image, in the setting from the second reference image. Preserve their face accurately. Bold split-screen composition, dramatic lighting, high saturation. Top YouTuber thumbnail quality. Landscape 16:9." } },
    { id: "n2", type: "imageGenNode",position: { x: 780, y: 60  }, data: { model: "nano-banana-pro", aspectRatio: "16:9", count: 4 } },
    { id: "n3", type: "galleryNode", position: { x: 1200, y: -40 }, data: {} },
    { id: "n4", type: "outputNode",  position: { x: 1200, y: 200 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt",        targetHandle: "prompt" },
    { id: "e2", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "media"  },
    { id: "e3", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media"  },
  ],
}
