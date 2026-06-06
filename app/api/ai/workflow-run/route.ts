/**
 * POST /api/ai/workflow-run
 * Server-side workflow pipeline executor.
 * 
 * Accepts nodes + edges from the client, executes them in topological order,
 * and streams real-time status updates via a polling job store.
 * 
 * Flow:
 *   1. POST → validate, create job, return jobId immediately
 *   2. Background execution starts (Next.js waitUntil / fire-and-forget)
 *   3. GET ?jobId=xxx → returns current status + node progress
 * 
 * Credit deduction is handled by the individual API routes (image-generate, video-generate).
 * This route only does a pre-check to avoid starting if credits are insufficient.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/* ─── In-Memory Job Store ─── */

export type NodeRunStatus = "idle" | "running" | "done" | "error" | "skipped"

export interface NodeProgress {
  nodeId: string
  status: NodeRunStatus
  message?: string
  output?: Record<string, unknown>
}

export interface WorkflowJob {
  jobId: string
  userId: string
  status: "queued" | "running" | "done" | "error" | "cancelled"
  nodeProgress: Record<string, NodeProgress>
  errors: string[]
  startedAt: number
  completedAt?: number
  totalNodes: number
  completedNodes: number
}

// Global job store (survives between poll calls within the same server process)
const jobStore = new Map<string, WorkflowJob>()

// Clean up jobs older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000
  for (const [id, job] of jobStore) {
    if (job.startedAt < cutoff) jobStore.delete(id)
  }
}, 5 * 60_000)

/* ─── Topological Sort ─── */

interface SimpleNode { id: string; type?: string; data: Record<string, unknown> }
interface SimpleEdge { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }

function topologicalSort(nodes: SimpleNode[], edges: SimpleEdge[]): string[] {
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

  // Add any remaining (cycle members) at end
  for (const id of nodeIds) {
    if (!sorted.includes(id)) sorted.push(id)
  }

  return sorted
}

/* ─── Get upstream data for a node from outputs map ─── */

function getUpstreamData(
  nodeId: string,
  edges: SimpleEdge[],
  nodeOutputs: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}
  const refsAcc: string[] = [] // accumulate multiple references → array

  for (const edge of edges) {
    if (edge.target === nodeId && edge.sourceHandle && edge.targetHandle) {
      const sourceOut = nodeOutputs.get(edge.source)
      if (!sourceOut) continue

      const value = sourceOut[edge.sourceHandle]
      if (value === undefined || value === null || value === "") continue

      // References from upload nodes — collect into array (multiple edges all target "references")
      if (edge.targetHandle === "references") {
        if (Array.isArray(value)) refsAcc.push(...(value as string[]))
        else refsAcc.push(value as string)
        continue
      }

      inputs[edge.targetHandle] = value

      // Auto-propagate _uploadEmail and _selectedMediaId from any connected upstream node.
      // This ensures videoGenNode always uses the same Google account without a dedicated edge.
      if (sourceOut._uploadEmail && !inputs._uploadEmail) {
        inputs._uploadEmail = sourceOut._uploadEmail
      }
      if (sourceOut._selectedMediaId && !inputs._selectedMediaId) {
        inputs._selectedMediaId = sourceOut._selectedMediaId
      }
    }
  }

  if (refsAcc.length > 0) inputs.references = refsAcc
  return inputs
}


/* ─── Individual node executors ─── */

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"

async function callImageGenerate(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = process.env.USEAPI_TOKEN!
  const res = await fetch(`${USEAPI_BASE}/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok) throw new Error((data.error as string) || `Image API error ${res.status}`)
  return data
}

async function callVideoGenerate(body: Record<string, unknown>): Promise<string> {
  // Returns UseAPI jobId — caller polls for completion
  const token = process.env.USEAPI_TOKEN!
  const res = await fetch(`${USEAPI_BASE}/videos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, async: true }),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok) throw new Error((data.error as string) || `Video API error ${res.status}`)
  const jobId = (data.jobid || data.jobId) as string
  if (!jobId) throw new Error("No jobId returned from video API")
  return jobId
}

async function pollVideoJob(useapiJobId: string, maxMs = 5 * 60_000): Promise<string> {
  const token = process.env.USEAPI_TOKEN!
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 5000))
    const res = await fetch(`${USEAPI_BASE}/jobs/${useapiJobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) continue
    const data = await res.json() as Record<string, unknown>
    const status = (data.status as string || "").toLowerCase()
    if (status === "failed") throw new Error("Video generation failed")
    if (status === "completed") {
      // Extract video URL from response
      const response = data.response as Record<string, unknown> | undefined
      const ops = (response?.operations || []) as Record<string, unknown>[]
      for (const op of ops) {
        const video = op.video as Record<string, unknown> | undefined
        const url = video?.fifeUrl as string | undefined
        if (url) return url
      }
      const media = (data.media || response?.media || []) as Record<string, unknown>[]
      const url = media[0]?.videoUrl as string | undefined
      if (url) return url
      throw new Error("No video URL in completed job")
    }
  }
  throw new Error("Video generation timed out")
}

async function executeNode(
  node: SimpleNode,
  inputs: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>> {
  const nd = node.data

  switch (node.type) {
    case "promptNode": {
      const prompt = (nd.prompt as string) || ""
      return { prompt }
    }

    case "imageGenNode": {
      const prompt = (inputs.prompt as string) || (nd._localPrompt as string) || (nd.prompt as string) || ""
      if (!prompt.trim()) throw new Error("Prompt kosong untuk Image Gen")

      const imageCount = (nd.count as number) || 1

      // Collect references from upstream upload nodes (via edges)
      const refIds = (inputs.references as string[]) || []
      const validRefs = refIds.filter(Boolean)

      // Email from upload nodes (for Google account pinning)
      const uploadEmail = (inputs._uploadEmail as string) || undefined

      const payload: Record<string, unknown> = {
        prompt: prompt.trim(),
        model: (nd.model as string) || "nano-banana-pro",
        aspectRatio: (nd.aspectRatio as string) || "9:16",
        count: imageCount,
      }

      if (validRefs.length > 0) {
        payload.references = validRefs
        if (uploadEmail) payload.email = uploadEmail
      }

      // Deduct credits before generation
      const creditCost = imageCount * 1
      await deductWorkflowCredits(userId, creditCost, "workflow-image", `Workflow: ${imageCount} image(s)`)

      const data = await callImageGenerate(payload)
      const media = (data.media || []) as Record<string, unknown>[]

      // Extract both the display URL (fifeUrl) and the stable mediaGenerationId
      interface ImageItem { url: string; mediaGenerationId?: string; email?: string }
      const images: ImageItem[] = media.map((m: Record<string, unknown>) => {
        const gen = (m.image as Record<string, unknown>)?.generatedImage as Record<string, unknown> | undefined
        if (!gen?.fifeUrl) return null

        // mediaGenerationId can be nested: { mediaGenerationId: { mediaGenerationId: "..." } }
        const rawMgId = gen.mediaGenerationId
        const resolvedMediaId: string =
          rawMgId && typeof rawMgId === "object"
            ? ((rawMgId as Record<string, unknown>).mediaGenerationId as string) || ""
            : (rawMgId as string) || ""

        return {
          url: gen.fifeUrl as string,
          mediaGenerationId: resolvedMediaId,
          email: (data.email as string) || uploadEmail || "",
        }
      }).filter(Boolean) as ImageItem[]

      const firstImage = images[0]
      return {
        status: "done",
        selectedImage: firstImage?.url || "",
        images: images.map(i => i.url),
        _generatedImages: images,
        // Key outputs for videoGenNode — avoids re-upload and ensures same account
        _selectedMediaId: firstImage?.mediaGenerationId || "",
        _uploadEmail: firstImage?.email || uploadEmail || "",
      }
    }

    case "videoGenNode": {
      const prompt = (inputs.prompt as string) || (nd._localPrompt as string) || ""
      if (!prompt.trim()) throw new Error("Prompt kosong untuk Video Gen")

      // Prefer _selectedMediaId (mediaGenerationId from imageGen) over raw URL.
      // CRITICAL: UseAPI requires mediaGenerationId, NOT a fifeUrl, for startImage.
      const selectedMediaId = (inputs._selectedMediaId as string) || ""
      const startImage = selectedMediaId || (inputs.startImage as string) || undefined

      // Email pinning — must use same Google account as upstream imageGen
      const email = (inputs._uploadEmail as string) || (nd._uploadEmail as string) || undefined

      const arMap: Record<string, string> = { "16:9": "landscape", "9:16": "portrait" }
      const durMap: Record<string, number> = { "5s": 4, "8s": 8 }

      const payload: Record<string, unknown> = {
        prompt: prompt.trim(),
        model: (nd.model as string) || "veo-3.1-lite-low-priority",
        aspectRatio: arMap[(nd.aspectRatio as string) || "16:9"] || "landscape",
        duration: durMap[(nd.duration as string) || "8s"] || 8,
        count: 1,
      }
      if (startImage) payload.startImage = startImage
      if (email) payload.email = email

      // Deduct credits before generation
      await deductWorkflowCredits(userId, 5, "workflow-video", "Workflow: video generation")

      const useapiJobId = await callVideoGenerate(payload)
      const videoUrl = await pollVideoJob(useapiJobId)
      const proxyUrl = `/api/ai/video-download?url=${encodeURIComponent(videoUrl)}&mode=inline`

      return {
        status: "done",
        selectedVideo: proxyUrl,
        _videoUrl: proxyUrl,
        _rawVideoUrl: videoUrl,
      }
    }

    case "galleryNode": {
      const mediaUrl = (inputs.media as string) || ""
      if (!mediaUrl) return { status: "done" }
      const isVideo = mediaUrl.includes("video") || mediaUrl.includes(".mp4") || mediaUrl.includes("mode=inline")
      // Note: gallery save requires client-side context (user session via cookie)
      // We store the URL in output so the client can save it after polling
      return { status: "done", media: mediaUrl, _needsGallerySave: true, _isVideo: isVideo }
    }

    case "outputNode": {
      const media = (inputs.media as string) || ""
      return { status: "done", media }
    }

    case "uploadNode": {
      // Return mediaGenerationId so downstream imageGenNode can use it as a reference.
      // The edge is: uploadNode.mediaGenerationId → imageGenNode.references
      return {
        status: "done",
        mediaGenerationId: nd.mediaGenerationId || nd._mediaGenerationId || "",
        selectedImage: nd.selectedImage || nd._preview || "",
        selectedVideo: nd.selectedVideo || "",
        _uploadEmail: (nd._uploadEmail as string) || "",
      }
    }

    case "extendVideoNode": {
      // Extend video requires browser canvas API for frame extraction
      // Return a flag so client executes this locally
      return { status: "done", _clientSide: true, _extendVideo: inputs.video || inputs.selectedVideo }
    }

    default: {
      // Pose, Camera, TTS, Voice, ImageGrid, ExtractFrame — pass through existing data
      return {
        status: "done",
        ...inputs,
        poseData: nd.poseData,
        posePrompt: nd.posePrompt,
        cameraParams: nd.cameraParams,
        audio: nd.audio,
        selectedImage: (nd.selectedImage || inputs.selectedImage || inputs.image) as string | undefined,
        selectedVideo: (nd.selectedVideo || inputs.selectedVideo || inputs.video) as string | undefined,
      }
    }
  }
}

/* ─── Credit helper for server-side deduction ─── */

async function deductWorkflowCredits(
  userId: string,
  amount: number,
  feature: string,
  description: string
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    const credits = await tx.user_credits.findUnique({ where: { userId } })
    const balance = credits?.balance ?? 0
    if (balance < amount) throw new Error(`Kredit tidak cukup: butuh ${amount}, saldo ${balance}`)
    const newBalance = balance - amount
    await tx.user_credits.update({ where: { userId }, data: { balance: newBalance, updatedAt: new Date() } })
    await tx.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: "deduct",
        amount: -amount,
        balance: newBalance,
        description,
        feature,
      },
    })
  })
}

/* ─── Background pipeline executor ─── */

async function runPipeline(
  jobId: string,
  nodes: SimpleNode[],
  edges: SimpleEdge[],
  userId: string
): Promise<void> {
  const job = jobStore.get(jobId)
  if (!job) return

  job.status = "running"
  const executionOrder = topologicalSort(nodes, edges)
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const nodeOutputs = new Map<string, Record<string, unknown>>()
  const failedNodes = new Set<string>()

  for (const nodeId of executionOrder) {
    const currentJob = jobStore.get(jobId)
    if (!currentJob || currentJob.status === "cancelled") break

    const node = nodeMap.get(nodeId)
    if (!node) continue

    // Check if upstream failed
    const upstreamEdges = edges.filter(e => e.target === nodeId)
    const hasFailedUpstream = upstreamEdges.some(e => failedNodes.has(e.source))
    if (hasFailedUpstream) {
      failedNodes.add(nodeId)
      job.nodeProgress[nodeId] = { nodeId, status: "skipped", message: "Node upstream gagal" }
      continue
    }

    const inputs = getUpstreamData(nodeId, edges, nodeOutputs)
    job.nodeProgress[nodeId] = { nodeId, status: "running" }

    try {
      const output = await executeNode(node, inputs, userId)
      nodeOutputs.set(nodeId, output)
      job.completedNodes++
      job.nodeProgress[nodeId] = { nodeId, status: "done", output }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal"
      job.errors.push(`${node.type?.replace("Node", "")}: ${msg}`)
      failedNodes.add(nodeId)
      job.nodeProgress[nodeId] = { nodeId, status: "error", message: msg }
    }
  }

  const finalJob = jobStore.get(jobId)
  if (finalJob && finalJob.status !== "cancelled") {
    finalJob.status = finalJob.errors.length === 0 ? "done" : "error"
    finalJob.completedAt = Date.now()
  }
}

/* ═══════════════════════════════════════════════════════
   POST /api/ai/workflow-run — Start a workflow job
   ═══════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.USEAPI_TOKEN
  if (!token) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  try {
    const { nodes, edges } = await req.json() as {
      nodes: SimpleNode[]
      edges: SimpleEdge[]
    }

    if (!nodes?.length) {
      return NextResponse.json({ error: "Workflow kosong" }, { status: 400 })
    }

    // Pre-check credits
    const imageNodes = nodes.filter(n => n.type === "imageGenNode")
    const videoNodes = nodes.filter(n => n.type === "videoGenNode" || n.type === "extendVideoNode")
    const estimatedCost = imageNodes.reduce((s, n) => s + ((n.data.count as number) || 1), 0) +
      videoNodes.length * 5

    if (estimatedCost > 0) {
      const credits = await prisma.user_credits.findUnique({ where: { userId: session.user.id } })
      const balance = credits?.balance ?? 0
      if (balance < estimatedCost) {
        return NextResponse.json(
          { error: `Kredit tidak cukup. Estimasi ${estimatedCost} kredit, saldo: ${balance}` },
          { status: 402 }
        )
      }
    }

    // Create job
    const jobId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const job: WorkflowJob = {
      jobId,
      userId: session.user.id,
      status: "queued",
      nodeProgress: {},
      errors: [],
      startedAt: Date.now(),
      totalNodes: nodes.length,
      completedNodes: 0,
    }

    // Initialize all node progress as idle
    for (const node of nodes) {
      job.nodeProgress[node.id] = { nodeId: node.id, status: "idle" }
    }

    jobStore.set(jobId, job)

    // Start pipeline in background (fire-and-forget)
    runPipeline(jobId, nodes, edges, session.user.id).catch(err => {
      console.error(`[workflow-run] Pipeline error for ${jobId}:`, err)
      const j = jobStore.get(jobId)
      if (j) {
        j.status = "error"
        j.errors.push(err instanceof Error ? err.message : "Unknown error")
        j.completedAt = Date.now()
      }
    })

    return NextResponse.json({ jobId, status: "queued" })
  } catch (error) {
    console.error("[workflow-run] Error:", error)
    return NextResponse.json({ error: "Failed to start workflow" }, { status: 500 })
  }
}

/* ═══════════════════════════════════════════════════════
   GET /api/ai/workflow-run?jobId=xxx — Poll job status
   ═══════════════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const jobId = req.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 })
  }

  const job = jobStore.get(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    jobId: job.jobId,
    status: job.status,
    nodeProgress: job.nodeProgress,
    errors: job.errors,
    completedNodes: job.completedNodes,
    totalNodes: job.totalNodes,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  })
}

/* ═══════════════════════════════════════════════════════
   DELETE /api/ai/workflow-run?jobId=xxx — Cancel job
   ═══════════════════════════════════════════════════════ */

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const jobId = req.nextUrl.searchParams.get("jobId")
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  const job = jobStore.get(jobId)
  if (job && job.userId === session.user.id) {
    job.status = "cancelled"
    job.completedAt = Date.now()
  }

  return NextResponse.json({ ok: true })
}

// Long timeout for pipeline execution
export const maxDuration = 300
