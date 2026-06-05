/**
 * Workflow Store — localStorage CRUD for workflow management
 * Max 3 workflows per user
 */

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

const STORAGE_KEY = "jenna_workflows"
const MAX_WORKFLOWS = 3

// ─── ID Generator ───
function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = "wf_"
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ─── CRUD ───

export function getWorkflows(): WorkflowData[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getWorkflow(id: string): WorkflowData | null {
  return getWorkflows().find(w => w.id === id) || null
}

export function canCreateWorkflow(): boolean {
  return getWorkflows().length < MAX_WORKFLOWS
}

export function getWorkflowCount(): number {
  return getWorkflows().length
}

export function createWorkflow(name: string, template?: string): WorkflowData {
  const workflows = getWorkflows()
  if (workflows.length >= MAX_WORKFLOWS) {
    throw new Error(`Maksimal ${MAX_WORKFLOWS} workflow`)
  }

  const now = new Date().toISOString()
  const id = generateId()

  const { nodes, edges } = getTemplateData(template)

  const workflow: WorkflowData = {
    id,
    name,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  }

  workflows.push(workflow)
  saveAll(workflows)
  return workflow
}

export function updateWorkflow(id: string, data: Partial<WorkflowData>): void {
  const workflows = getWorkflows()
  const idx = workflows.findIndex(w => w.id === id)
  if (idx === -1) throw new Error("Workflow tidak ditemukan")

  workflows[idx] = {
    ...workflows[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  saveAll(workflows)
}

export function deleteWorkflow(id: string): void {
  const workflows = getWorkflows().filter(w => w.id !== id)
  saveAll(workflows)
}

export function duplicateWorkflow(id: string): WorkflowData {
  const workflows = getWorkflows()
  if (workflows.length >= MAX_WORKFLOWS) {
    throw new Error(`Maksimal ${MAX_WORKFLOWS} workflow`)
  }

  const source = workflows.find(w => w.id === id)
  if (!source) throw new Error("Workflow tidak ditemukan")

  const now = new Date().toISOString()
  const duplicate: WorkflowData = {
    ...JSON.parse(JSON.stringify(source)),
    id: generateId(),
    name: `${source.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  }

  workflows.push(duplicate)
  saveAll(workflows)
  return duplicate
}

// ─── Helpers ───

function saveAll(workflows: WorkflowData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows))
}

/* ═══════════════════════════════════════════════════════
   TEMPLATE DEFINITIONS — Rich pre-built workflow templates
   Each template has nodes with pre-filled prompts and proper connections.
   ═══════════════════════════════════════════════════════ */

export interface TemplateInfo {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
}

function getTemplateData(template?: string): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  switch (template) {

    /* ═══════ FASHION ═══════ */

    case "image-to-video":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 100 }, data: { prompt: "" } },
          { id: "n2", type: "imageGenNode", position: { x: 320, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 1 } },
          { id: "n3", type: "videoGenNode", position: { x: 640, y: 100 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "5s" } },
          { id: "n4", type: "outputNode", position: { x: 960, y: 100 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e3", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "product-review":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 100 }, data: { prompt: "Foto produk profesional dengan background studio putih" } },
          { id: "n2", type: "imageGenNode", position: { x: 320, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 640, y: 0 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "5s" } },
          { id: "n4", type: "galleryNode", position: { x: 960, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 960, y: 200 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e3", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "gamis-promo":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic fashion photography. A beautiful hijab-wearing woman standing gracefully, modeling a flowing elegant gamis dress in soft pastel color. She is smiling confidently at camera, one hand gently touching hijab edge. Full body shot, soft diffused natural lighting, shallow depth of field, high-end fashion catalog quality. Portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "hijab-styling":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic fashion portrait. A beautiful woman wearing an elegant hijab in rich jewel tone color, styled in modern draping technique. Close-up half-body shot, warm golden hour lighting, looking softly at camera with gentle smile. The hijab fabric has subtle shimmer texture. Photorealistic, high-end fashion magazine quality, 4K, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "kaos-pria-urban":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic street fashion photography. A stylish young man wearing a casual premium cotton t-shirt, standing confidently in an urban city environment with graffiti wall background. Half-body shot, golden hour lighting, slightly tilted head, one hand in jeans pocket. Cool relaxed expression. Photorealistic, streetwear catalog quality, 4K detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "kemeja-pria-formal":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic professional fashion photography. A handsome man wearing a crisp fitted dress shirt in light blue, standing in a modern office with floor-to-ceiling windows. Smart-casual look with sleeves slightly rolled up. Three-quarter body shot, professional studio lighting, confident posture. Photorealistic, premium menswear catalog quality, sharp 4K detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "sepatu-sneakers":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic product photography. A pair of premium sneakers displayed on a clean concrete surface with dramatic side lighting creating beautiful shadows. Close-up hero shot showing the shoe's texture, stitching detail, and sole design. Moody urban aesthetic with bokeh city lights in background. Photorealistic, high-end sneaker brand quality, sharp 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "tas-handbag":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic luxury product photography. A stylish woman holding an elegant leather handbag, walking on a marble floor in a high-end shopping mall. The bag is the focal point — showing texture, hardware, and craftsmanship. Three-quarter body shot with shallow depth of field focusing on the bag. Warm ambient lighting, fashion editorial quality, photorealistic, 4K sharp detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    /* ═══════ AKSESORIS ═══════ */

    case "jam-tangan-luxury":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic luxury watch photography. A man's wrist wearing an elegant premium watch with detailed dial and metal bracelet. Close-up macro shot showing the watch face details, hands, and bezel. Dark moody background with dramatic rim lighting highlighting the metallic surfaces. Water droplets on the watch crystal for a premium feel. Photorealistic, Swiss watchmaker catalog quality, extreme 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "kacamata-trendy":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic fashion photography. A stylish young person wearing trendy sunglasses, half-body portrait with golden hour sunlight creating beautiful lens flare through the sunglasses. Relaxed cool expression, slightly tilted head. Beach or rooftop background with warm tones. The sunglasses frame and lens quality are the focal point. Photorealistic, designer eyewear campaign quality, sharp 4K detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "5s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    /* ═══════ BEAUTY ═══════ */

    case "parfum-luxury":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic luxury perfume photography. An elegant glass perfume bottle on a reflective dark marble surface, surrounded by scattered rose petals and golden light particles. Dramatic studio lighting with a deep purple and gold color palette. The bottle catches light creating beautiful caustic reflections. Mist/fog effect in background. Photorealistic, high-end fragrance ad quality, extreme macro 4K detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "skincare-routine":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic beauty product photography. A set of skincare products (cleanser, toner, serum, moisturizer) arranged aesthetically on a white marble bathroom counter with fresh green leaves and water droplets. Soft natural window light creating a clean, fresh atmosphere. Each bottle label is visible showing premium minimalist design. Photorealistic, Korean beauty brand aesthetic, clean 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "makeup-tutorial":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic beauty portrait. A beautiful woman applying makeup, close-up shot showing the lipstick/eyeshadow application process. Perfect skin, dewy finish makeup look. Ring light reflection visible in eyes. Professional vanity mirror and makeup tools visible in background, blurred. Warm soft lighting, beauty influencer aesthetic. Photorealistic, beauty brand campaign quality, 4K skin detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    /* ═══════ FOOD & BEVERAGE ═══════ */

    case "snack-lebaran":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic food photography. A beautiful arrangement of traditional Indonesian Eid cookies (nastar, kastengel, putri salju, lidah kucing) on elegant golden plates and tiered stands. Festive Ramadan/Eid decoration with crescent moon ornaments and warm fairy lights. Overhead flat-lay shot with rich warm tones. Photorealistic, premium bakery catalog quality, appetizing 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "coffee-shop":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic coffee photography. A perfectly crafted latte art in a ceramic cup on a wooden table in a cozy cafe setting. Steam rising from the cup, with coffee beans scattered artistically around. Warm morning light streaming through the cafe window. Shallow depth of field with bokeh background showing cafe interior. Photorealistic, specialty coffee brand quality, mouth-watering 4K detail, square 1:1." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "1:1", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "5s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "restaurant-menu":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic food photography. A beautifully plated gourmet dish on a white ceramic plate in an upscale restaurant setting. The food has vibrant colors with artistic sauce drizzle and microgreen garnish. Dark moody background with warm accent lighting. Side angle shot showing depth and texture of the dish. Photorealistic, Michelin star restaurant quality, appetite-inducing 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    /* ═══════ TECH & GADGET ═══════ */

    case "smartphone-review":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic tech product photography. A sleek modern smartphone floating at a slight angle against a gradient dark background with colorful light streaks. The phone screen shows a vibrant wallpaper with vivid colors. Dramatic studio lighting highlighting the phone's glass back and camera module. Light reflections on the metal frame edges. Photorealistic, Apple/Samsung ad campaign quality, extreme 4K detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "laptop-workspace":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic tech lifestyle photography. A premium laptop open on a clean minimalist desk setup with mechanical keyboard, ultrawide monitor, and desk plant. Warm ambient desk lighting with LED strip glow behind the monitor. The laptop screen shows a creative design workspace. Modern home office aesthetic with concrete wall background. Photorealistic, tech brand lifestyle shot quality, crisp 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "8s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "earbuds-wireless":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic product photography. Premium wireless earbuds floating out of their charging case against a dark gradient background. Dynamic lighting with cyan and purple accent lights creating a futuristic atmosphere. The earbuds show detailed texture — matte finish, silicone tips, and tiny LED indicators. Water splash particles frozen in motion around them. Photorealistic, premium audio brand ad quality, extreme macro 4K detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "5s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    /* ═══════ REAL ESTATE & INTERIOR ═══════ */

    case "property-tour":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic architectural photography. A luxurious modern living room interior with high ceilings, floor-to-ceiling windows showing a city skyline view. Premium furniture, marble flooring, and designer lighting fixtures. Warm golden hour light flooding through the windows creating beautiful shadows. Wide-angle shot showing the full room grandeur. Photorealistic, luxury real estate listing quality, architectural 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "furniture-showcase":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic interior design photography. A beautiful Scandinavian-style living room with a designer sofa as the centerpiece, surrounded by complementary decor — wooden coffee table, potted monstera plant, woven rug, and minimalist wall art. Soft natural daylight from large windows, creating a cozy inviting atmosphere. Three-quarter room view with focus on the furniture arrangement. Photorealistic, IKEA catalog quality, warm 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "8s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    /* ═══════ AUTOMOTIVE ═══════ */

    case "car-showcase":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic automotive photography. A sleek luxury sports car in metallic finish parked on a wet reflective surface at night. Dramatic neon city lights reflecting on the car's body panels. Low angle three-quarter front view showing the aggressive front design, LED headlights glowing. Motion blur lights in background suggesting speed. Photorealistic, premium automotive brand campaign quality, extreme 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "motor-adventure":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic motorcycle photography. A rugged adventure motorcycle parked on a mountain cliff edge with breathtaking valley and misty mountain range panorama view behind it. Early morning golden hour light, dramatic clouds. The motorcycle is dusty showing it has been on an adventure. Wide angle shot emphasizing the epic landscape and the freedom of riding. Photorealistic, adventure motorcycle magazine quality, cinematic 4K detail, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "8s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    /* ═══════ SOCIAL MEDIA ═══════ */

    case "instagram-carousel":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 0 }, data: { prompt: "Clean modern Instagram carousel slide design. Bold typography on a gradient background (deep violet to electric blue). Professional business/marketing tip with clean layout, geometric shapes as accents, and a small author photo placeholder. Minimal text-heavy design with clear visual hierarchy. Portrait format 9:16, social media optimized, crisp clean edges." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "promptNode", position: { x: 0, y: 250 }, data: { prompt: "Clean modern Instagram carousel slide design, second slide. Same gradient style (deep violet to electric blue). Infographic-style layout with numbered points, icons, and key statistics. Consistent visual language with previous slide. Portrait format 9:16." } },
          { id: "n4", type: "imageGenNode", position: { x: 360, y: 250 }, data: { model: "imagen-4", aspectRatio: "9:16", count: 4 } },
          { id: "n5", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n6", type: "galleryNode", position: { x: 700, y: 250 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n3", target: "n4", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n5", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e4", source: "n4", target: "n6", sourceHandle: "selectedImage", targetHandle: "media" },
        ],
      }

    case "tiktok-hook":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic TikTok thumbnail style. A person with an exaggerated shocked/surprised expression, eyes wide open, mouth in O shape, pointing at something off-screen. Bold and energetic vibe, colorful background with pop art elements. Close-up face shot with dramatic lighting. Text-free — the expression tells the story. Photorealistic, viral TikTok content quality, vibrant 4K, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "5s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "youtube-thumbnail":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic YouTube thumbnail style. A dramatic split-screen composition — left side shows a person with excited expression pointing right, right side shows a glowing/epic reveal moment. Bold dramatic lighting with warm and cool contrast. High saturation colors, cinematic depth of field. The composition demands clicking. Photorealistic, top YouTuber thumbnail quality, punchy 4K, landscape 16:9." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "16:9", count: 4 } },
          { id: "n3", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n4", type: "outputNode", position: { x: 700, y: 200 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e3", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
        ],
      }

    /* ═══════ HEALTH & FITNESS ═══════ */

    case "fitness-motivation":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic fitness photography. An athletic person mid-workout in a premium gym — doing a dynamic exercise like battle ropes or kettlebell swing. Dramatic low-angle shot with motion blur on the movement. Moody dark gym background with focused spotlight on the athlete. Sweat droplets visible, muscles engaged, intense determined expression. Photorealistic, Nike/Under Armour campaign quality, powerful 4K detail, portrait 9:16." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "8s" } },
          { id: "n4", type: "galleryNode", position: { x: 700, y: 0 }, data: {} },
          { id: "n5", type: "outputNode", position: { x: 700, y: 240 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n2", target: "n4", sourceHandle: "selectedImage", targetHandle: "media" },
          { id: "e5", source: "n3", target: "n5", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    case "healthy-food":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 80 }, data: { prompt: "Ultra-realistic food photography. A colorful healthy meal prep bowl — quinoa, grilled chicken, avocado, cherry tomatoes, roasted vegetables, and microgreens. Bright natural lighting on a marble countertop, top-down flat lay shot. Fresh and vibrant colors, each ingredient perfectly arranged. Small herb garnish and sesame seed sprinkle. Photorealistic, health food brand quality, appetizing 4K detail, square 1:1." } },
          { id: "n2", type: "imageGenNode", position: { x: 360, y: 0 }, data: { model: "imagen-4", aspectRatio: "1:1", count: 4 } },
          { id: "n3", type: "videoGenNode", position: { x: 360, y: 240 }, data: { model: "veo-3.1-lite-low-priority", aspectRatio: "9:16", duration: "5s" } },
          { id: "n4", type: "outputNode", position: { x: 700, y: 120 }, data: {} },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e2", source: "n1", target: "n3", sourceHandle: "prompt", targetHandle: "prompt" },
          { id: "e3", source: "n2", target: "n3", sourceHandle: "selectedImage", targetHandle: "startImage" },
          { id: "e4", source: "n3", target: "n4", sourceHandle: "selectedVideo", targetHandle: "media" },
        ],
      }

    default:
      return { nodes: [], edges: [] }
  }
}

/* ═══════════════════════════════════════════════════════
   TEMPLATE REGISTRY — Displayed in the create dialog
   ═══════════════════════════════════════════════════════ */

export const TEMPLATES: TemplateInfo[] = [
  // ── Umum ──
  { id: "blank", name: "Kosong", description: "Canvas kosong, buat workflow dari awal", icon: "📄", color: "slate", category: "Umum" },
  { id: "image-to-video", name: "Image to Video", description: "Generate gambar → jadikan video", icon: "🎬", color: "violet", category: "Umum" },
  { id: "product-review", name: "Product Review", description: "Foto produk → video review", icon: "📦", color: "blue", category: "Umum" },

  // ── Fashion Wanita ──
  { id: "gamis-promo", name: "Gamis Promotion", description: "Busana muslim wanita — gamis elegan dengan video cinematic", icon: "👗", color: "violet", category: "Fashion Wanita" },
  { id: "hijab-styling", name: "Hijab Styling", description: "Hijab & kerudung — showcase styling modern", icon: "🧕", color: "pink", category: "Fashion Wanita" },

  // ── Fashion Pria ──
  { id: "kaos-pria-urban", name: "Kaos Pria Urban", description: "Streetwear casual — urban style kekinian", icon: "👕", color: "emerald", category: "Fashion Pria" },
  { id: "kemeja-pria-formal", name: "Kemeja Formal", description: "Smart-casual — kemeja pria profesional", icon: "👔", color: "indigo", category: "Fashion Pria" },

  // ── Footwear ──
  { id: "sepatu-sneakers", name: "Sneakers", description: "Sneakers & sepatu — hero shot dramatic", icon: "👟", color: "blue", category: "Footwear" },

  // ── Aksesoris ──
  { id: "tas-handbag", name: "Tas & Handbag", description: "Bag showcase — lifestyle editorial", icon: "👜", color: "amber", category: "Aksesoris" },
  { id: "jam-tangan-luxury", name: "Jam Tangan", description: "Watch — premium luxury close-up", icon: "⌚", color: "slate", category: "Aksesoris" },
  { id: "kacamata-trendy", name: "Kacamata", description: "Eyewear — trendy lifestyle shot", icon: "🕶️", color: "cyan", category: "Aksesoris" },

  // ── Beauty ──
  { id: "parfum-luxury", name: "Parfum", description: "Fragrance — luxury sensual presentation", icon: "🌸", color: "rose", category: "Beauty" },
  { id: "skincare-routine", name: "Skincare", description: "Skincare products — clean fresh aesthetic", icon: "✨", color: "emerald", category: "Beauty" },
  { id: "makeup-tutorial", name: "Makeup", description: "Makeup application — beauty influencer style", icon: "💄", color: "pink", category: "Beauty" },

  // ── Food & Beverage ──
  { id: "snack-lebaran", name: "Snack Lebaran", description: "Kue & snack — festive appetizing display", icon: "🍪", color: "orange", category: "Food & Beverage" },
  { id: "coffee-shop", name: "Coffee Shop", description: "Kopi & latte art — cozy cafe aesthetic", icon: "☕", color: "amber", category: "Food & Beverage" },
  { id: "restaurant-menu", name: "Menu Restoran", description: "Fine dining — gourmet food photography", icon: "🍽️", color: "rose", category: "Food & Beverage" },

  // ── Tech & Gadget ──
  { id: "smartphone-review", name: "Smartphone", description: "Phone — dramatic product reveal", icon: "📱", color: "violet", category: "Tech & Gadget" },
  { id: "laptop-workspace", name: "Laptop & Setup", description: "Workspace — modern tech lifestyle", icon: "💻", color: "blue", category: "Tech & Gadget" },
  { id: "earbuds-wireless", name: "Earbuds", description: "Audio gear — futuristic floating shot", icon: "🎧", color: "cyan", category: "Tech & Gadget" },

  // ── Real Estate ──
  { id: "property-tour", name: "Property Tour", description: "Interior luxury — wide-angle room showcase", icon: "🏠", color: "amber", category: "Real Estate" },
  { id: "furniture-showcase", name: "Furniture", description: "Interior design — Scandinavian living room", icon: "🛋️", color: "emerald", category: "Real Estate" },

  // ── Automotive ──
  { id: "car-showcase", name: "Mobil", description: "Sports car — cinematic night shot", icon: "🏎️", color: "slate", category: "Automotive" },
  { id: "motor-adventure", name: "Motor Adventure", description: "Motorcycle — epic landscape adventure", icon: "🏍️", color: "orange", category: "Automotive" },

  // ── Social Media ──
  { id: "instagram-carousel", name: "IG Carousel", description: "Instagram slide — bold gradient design", icon: "📸", color: "pink", category: "Social Media" },
  { id: "tiktok-hook", name: "TikTok Hook", description: "TikTok thumbnail — viral reaction style", icon: "🎵", color: "rose", category: "Social Media" },
  { id: "youtube-thumbnail", name: "YT Thumbnail", description: "YouTube thumbnail — click-bait dramatic", icon: "▶️", color: "red", category: "Social Media" },

  // ── Health & Fitness ──
  { id: "fitness-motivation", name: "Fitness", description: "Workout — dramatic athletic shot", icon: "💪", color: "emerald", category: "Health & Fitness" },
  { id: "healthy-food", name: "Healthy Food", description: "Meal prep — colorful nutrition bowl", icon: "🥗", color: "green", category: "Health & Fitness" },
]

/* ─── Helper: Get unique categories ─── */
export function getTemplateCategories(): string[] {
  return [...new Set(TEMPLATES.filter(t => t.id !== "blank").map(t => t.category))]
}

export { MAX_WORKFLOWS }
