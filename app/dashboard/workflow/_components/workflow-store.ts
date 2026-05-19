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

function getTemplateData(template?: string): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  switch (template) {
    case "image-to-video":
      return {
        nodes: [
          { id: "n1", type: "promptNode", position: { x: 0, y: 100 }, data: { prompt: "" } },
          { id: "n2", type: "imageGenNode", position: { x: 320, y: 0 }, data: { model: "nano-banana-2", aspectRatio: "9:16", count: 1 } },
          { id: "n3", type: "videoGenNode", position: { x: 640, y: 100 }, data: { model: "veo-3.1-fast", aspectRatio: "16:9", duration: "5s" } },
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
          { id: "n3", type: "videoGenNode", position: { x: 640, y: 0 }, data: { model: "veo-3.1-fast", aspectRatio: "9:16", duration: "5s" } },
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

    default:
      return { nodes: [], edges: [] }
  }
}

export const TEMPLATES = [
  { id: "blank", name: "Kosong", description: "Canvas kosong, buat workflow dari awal", icon: "📄" },
  { id: "image-to-video", name: "Image to Video", description: "Generate gambar → jadikan video", icon: "🎬" },
  { id: "product-review", name: "Product Review", description: "Foto produk → video review", icon: "📦" },
] as const

export { MAX_WORKFLOWS }
