/**
 * Workflow Runner — Client-side pipeline executor
 * 
 * Executes workflow nodes in topological order (dependency-first).
 * Propagates outputs between nodes via edges.
 * Supports abort via AbortSignal.
 */

import type { Node, Edge } from "@xyflow/react"
import { generateImages, uploadImageAsset, uploadImageFromUrl, generateVideos } from "@/lib/api/google-flow"

/* ─── Types ─── */

export interface RunProgress {
  nodeId: string
  status: "running" | "done" | "error" | "skipped"
  message?: string
  output?: Record<string, unknown>
}

export type OnProgress = (progress: RunProgress) => void

export interface RunResult {
  success: boolean
  errors: string[]
  completedNodes: number
  totalNodes: number
}

/* ─── Topological Sort (Kahn's Algorithm) ─── */

function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  const nodeIds = new Set(nodes.map(n => n.id))
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjList.set(id, [])
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjList.get(edge.source)!.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }
  }

  // Start with nodes that have no incoming edges
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(current)
    for (const neighbor of adjList.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  // If sorted doesn't contain all nodes, there's a cycle
  // Add remaining nodes anyway (they'll be skipped/errored)
  for (const id of nodeIds) {
    if (!sorted.includes(id)) sorted.push(id)
  }

  return sorted
}

/* ─── Get upstream data for a node ─── */

function getUpstreamData(
  nodeId: string,
  edges: Edge[],
  nodeOutputs: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}

  for (const edge of edges) {
    if (edge.target === nodeId && edge.sourceHandle && edge.targetHandle) {
      const sourceOutput = nodeOutputs.get(edge.source)
      if (sourceOutput) {
        inputs[edge.targetHandle] = sourceOutput[edge.sourceHandle]

        // Auto-propagate _uploadEmail from any connected upstream node.
        // This ensures videoGenNode always uses the same Google account as imageGenNode
        // without needing a dedicated edge, preventing "startImage incorrect format" errors.
        if (sourceOutput._uploadEmail && !inputs._uploadEmail) {
          inputs._uploadEmail = sourceOutput._uploadEmail
        }
      }
    }
  }

  return inputs
}


/* ─── Node Executors ─── */

async function executePromptNode(
  node: Node,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const prompt = (node.data as Record<string, unknown>).prompt as string || ""
  return { prompt }
}

async function executeImageGenNode(
  node: Node,
  inputs: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  const nd = node.data as Record<string, unknown>
  const prompt = (inputs.prompt as string) || (nd._localPrompt as string) || (nd.prompt as string) || ""
  
  if (!prompt.trim()) {
    throw new Error("Prompt kosong")
  }

  if (signal?.aborted) throw new Error("Dibatalkan")

  // Collect reference IDs from node's own uploaded references (via UI)
  const refPreviews = nd._refPreviews as { uploaded?: { mediaGenerationId: string } }[] || []
  const localRefs = refPreviews
    .filter(r => r.uploaded?.mediaGenerationId)
    .map(r => r.uploaded!.mediaGenerationId)

  // Also collect references connected via edge (URL → upload → mediaGenerationId)
  let email = (nd._uploadEmail as string) || undefined
  const connectedRefUrls: string[] = []
  if (inputs.references) {
    const raw = inputs.references
    const urls = Array.isArray(raw) ? (raw as string[]) : [raw as string]
    urls.forEach(u => { if (u) connectedRefUrls.push(u) })
  }

  const connectedRefs: string[] = []
  for (const url of connectedRefUrls) {
    if (signal?.aborted) throw new Error("Dibatalkan")
    try {
      const uploaded = await uploadImageFromUrl(url, email)
      if (!email) email = uploaded.email
      connectedRefs.push(uploaded.mediaGenerationId)
    } catch { /* skip failed refs */ }
  }

  const refs = [...localRefs, ...connectedRefs]

  const result = await generateImages({
    prompt: prompt.trim(),
    model: ((nd.model as string) || "nano-banana-2") as "nano-banana-2",
    aspectRatio: ((nd.aspectRatio as string) || "9:16") as "9:16",
    count: (nd.count as number) || 1,
    ...(refs.length > 0 ? { references: refs, email } : {}),
  })

  return {
    status: "done",
    _generatedImages: result.images,
    _selectedIdx: 0,
    selectedImage: result.images[0]?.url || "",
    images: result.images.map(i => i.url),
    // Pass email downstream so videoGenNode uses the same Google account
    _uploadEmail: email || "",
  }
}

async function executeVideoGenNode(
  node: Node,
  inputs: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  const nd = node.data as Record<string, unknown>
  const prompt = (inputs.prompt as string) || (nd._localPrompt as string) || ""
  let startImageId = (inputs.startImage as string) || undefined

  // Email passed from upstream imageGenNode (same Google account required)
  const upstreamEmail = (inputs._uploadEmail as string) || (nd._uploadEmail as string) || undefined
  let videoEmail = upstreamEmail

  if (!prompt.trim()) {
    throw new Error("Prompt kosong")
  }

  if (signal?.aborted) throw new Error("Dibatalkan")

  // If startImage is a URL (from imageGenNode output), upload it to get mediaGenerationId.
  // CRITICAL: Use the same email as imageGenNode to stay on the same Google account.
  if (startImageId && (startImageId.startsWith("http") || startImageId.startsWith("/api/ai/image-download"))) {
    try {
      const uploaded = await uploadImageFromUrl(startImageId, videoEmail)
      startImageId = uploaded.mediaGenerationId
      if (!videoEmail) videoEmail = uploaded.email
    } catch (err) {
      console.error("[videoGen] startImage upload failed:", err)
      throw new Error("Gagal upload start image. Coba lagi.")
    }
  }

  if (signal?.aborted) throw new Error("Dibatalkan")

  const arMap: Record<string, "landscape" | "portrait"> = { "16:9": "landscape", "9:16": "portrait" }
  const durMap: Record<string, number> = { "5s": 4, "8s": 8 }

  const result = await generateVideos({
    prompt: prompt.trim(),
    model: ((nd.model as string) || "veo-3.1-lite-low-priority") as "veo-3.1-lite-low-priority",
    aspectRatio: arMap[(nd.aspectRatio as string) || "16:9"] || "landscape",
    duration: (durMap[(nd.duration as string) || "8s"] || 8) as 8,
    startImage: startImageId,
    ...(videoEmail ? { email: videoEmail } : {}),
  })

  const vid = result.videos[0]
  return {
    status: "done",
    _videoUrl: vid?.url || "",
    _rawVideoUrl: vid?.rawUrl || "",
    selectedVideo: vid?.url || "",
    videos: result.videos.map(v => v.url),
  }
}

async function executeGalleryNode(
  node: Node,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const mediaUrl = (inputs.media as string) || ""
  if (!mediaUrl) {
    return { status: "done" } // Nothing to save
  }

  const isVideo = mediaUrl.includes("video") || mediaUrl.includes(".mp4") || mediaUrl.includes("mode=inline")

  await fetch("/api/gallery/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: mediaUrl,
      prompt: "Workflow auto-save",
      type: isVideo ? "video" : "image",
    }),
  })

  return { status: "done", media: mediaUrl }
}

async function executeOutputNode(
  _node: Node,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const media = (inputs.media as string) || ""
  return { status: "done", media }
}

async function executeUploadNode(
  node: Node,
  _inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Upload node is already loaded with data — just pass through
  const nd = node.data as Record<string, unknown>
  return {
    status: "done",
    selectedImage: nd.selectedImage || nd._preview,
    selectedVideo: nd.selectedVideo,
  }
}

async function executeExtendVideoNode(
  node: Node,
  inputs: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  const nd = node.data as Record<string, unknown>
  const videoUrl = (inputs.video as string) || (inputs.selectedVideo as string)
  if (!videoUrl) throw new Error("Tidak ada video untuk di-extend")
  if (signal?.aborted) throw new Error("Dibatalkan")

  // Extract last frame
  const video = document.createElement("video")
  video.crossOrigin = "anonymous"
  video.src = videoUrl
  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res()
    video.onerror = () => rej(new Error("Gagal load video"))
  })
  video.currentTime = Math.max(0, video.duration - 0.1)
  await new Promise<void>(res => { video.onseeked = () => res() })
  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext("2d")!.drawImage(video, 0, 0)
  const blob = await (await fetch(canvas.toDataURL("image/jpeg", 0.9))).blob()
  const file = new File([blob], "last-frame.jpg", { type: "image/jpeg" })
  const asset = await uploadImageAsset(file)

  const prompt = (nd._extendPrompt as string) || "Continue the video naturally with smooth motion"
  const durMap: Record<string, number> = { "5s": 4, "8s": 8 }
  const result = await generateVideos({
    prompt,
    model: "veo-3.1-lite-low-priority",
    aspectRatio: "landscape",
    duration: (durMap[(nd.extendDuration as string) || "8s"] || 8) as 4 | 8,
    startImage: asset.mediaGenerationId,
    email: asset.email,
  })

  const vid = result.videos[0]
  return {
    status: "done",
    selectedVideo: vid?.url || "",
    _resultUrl: vid?.url || "",
  }
}

/* ─── Pass-through executor for nodes without async work ─── */

async function executePassthroughNode(
  node: Node,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const nd = node.data as Record<string, unknown>
  return {
    status: "done",
    ...inputs,
    // Preserve existing node data outputs
    poseData: nd.poseData,
    posePrompt: nd.posePrompt,
    cameraParams: nd.cameraParams,
    audio: nd.audio,
    selectedImage: nd.selectedImage || inputs.selectedImage || inputs.image,
    selectedVideo: nd.selectedVideo || inputs.selectedVideo || inputs.video,
  }
}

/* ─── Main Runner ─── */

export async function runWorkflow(
  nodes: Node[],
  edges: Edge[],
  onProgress: OnProgress,
  signal?: AbortSignal
): Promise<RunResult> {
  const errors: string[] = []
  let completedNodes = 0
  const executionOrder = topologicalSort(nodes, edges)
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const nodeOutputs = new Map<string, Record<string, unknown>>()
  const failedNodes = new Set<string>()

  for (const nodeId of executionOrder) {
    if (signal?.aborted) {
      errors.push("Workflow dibatalkan oleh user")
      break
    }

    const node = nodeMap.get(nodeId)
    if (!node) continue

    // Check if any upstream node failed
    const upstreamEdges = edges.filter(e => e.target === nodeId)
    const hasFailedUpstream = upstreamEdges.some(e => failedNodes.has(e.source))
    if (hasFailedUpstream) {
      failedNodes.add(nodeId)
      onProgress({ nodeId, status: "skipped", message: "Node upstream gagal" })
      continue
    }

    // Get upstream data
    const inputs = getUpstreamData(nodeId, edges, nodeOutputs)

    // Report running
    onProgress({ nodeId, status: "running" })

    try {
      let output: Record<string, unknown>

      switch (node.type) {
        case "promptNode":
          output = await executePromptNode(node, inputs)
          break
        case "imageGenNode":
          output = await executeImageGenNode(node, inputs, signal)
          break
        case "videoGenNode":
          output = await executeVideoGenNode(node, inputs, signal)
          break
        case "galleryNode":
          output = await executeGalleryNode(node, inputs)
          break
        case "outputNode":
          output = await executeOutputNode(node, inputs)
          break
        case "uploadNode":
          output = await executeUploadNode(node, inputs)
          break
        case "extendVideoNode":
          output = await executeExtendVideoNode(node, inputs, signal)
          break
        default:
          // Pose, Camera, Voice, TTS, ImageGrid, ExtractFrame
          output = await executePassthroughNode(node, inputs)
          break
      }

      nodeOutputs.set(nodeId, output)
      completedNodes++
      onProgress({ nodeId, status: "done", output })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal"
      errors.push(`${node.type?.replace("Node", "")}: ${msg}`)
      failedNodes.add(nodeId)
      onProgress({ nodeId, status: "error", message: msg })
    }
  }

  return {
    success: errors.length === 0,
    errors,
    completedNodes,
    totalNodes: nodes.length,
  }
}

/* ─── Credit Estimation ─── */

export function estimateWorkflowCredits(nodes: Node[]): number {
  return nodes.reduce((sum, n) => {
    const nd = n.data as Record<string, unknown>
    if (n.type === "imageGenNode") return sum + 1 * ((nd.count as number) || 1)
    if (n.type === "videoGenNode") return sum + 5
    if (n.type === "extendVideoNode") return sum + 5
    return sum
  }, 0)
}
