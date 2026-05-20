"use client"

import { useState, useCallback, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { cn } from "@/lib/utils"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  ArrowLeftIcon,
  PlayIcon,
  SaveIcon,
  Trash2Icon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  GripVerticalIcon,
  Maximize2Icon,
  Minimize2Icon,
  CoinsIcon,
  SparklesIcon,
  XCircleIcon,
  DownloadIcon,
  FolderPlusIcon,
  XIcon,
  BotIcon,
  SendIcon,
  PanelRightCloseIcon,
  ScanEyeIcon,
  PencilRulerIcon,
  ZapIcon,
} from "lucide-react"
import { generateImages, type GeneratedImage, generateVideos, type GeneratedVideo } from "@/lib/api/google-flow"
import { downloadImage, downloadVideo } from "@/lib/download"
import {
  getWorkflow,
  updateWorkflow,
  type WorkflowData,
} from "../_components/workflow-store"

/* ═══════════════════════════════════════════════════════
   Custom Node Components
   ═══════════════════════════════════════════════════════ */

/* ─── Port Colors ─── */
const PORT_COLORS: Record<string, string> = {
  prompt: "#8b5cf6",
  string: "#8b5cf6",
  image: "#3b82f6",
  startImage: "#3b82f6",
  selectedImage: "#3b82f6",
  images: "#3b82f6",
  references: "#3b82f6",
  video: "#06b6d4",
  selectedVideo: "#06b6d4",
  videos: "#06b6d4",
  media: "#10b981",
}

function getPortColor(handle: string): string {
  return PORT_COLORS[handle] || "#8b5cf6"
}

/* ─── Base Node Wrapper ─── */
function NodeShell({ label, icon, status, children }: {
  label: string
  icon: string
  status?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      "workflow-node min-w-[240px] rounded-xl border bg-card/90 backdrop-blur-md shadow-md transition-all",
      status === "running" && "ring-2 ring-violet-500/50 shadow-violet-500/20 shadow-lg",
      status === "done" && "ring-1 ring-emerald-500/40",
      status === "error" && "ring-1 ring-red-500/40",
      !status && "border-border hover:border-violet-500/30"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30 rounded-t-xl">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-foreground flex-1">{label}</span>
        {status === "running" && <Loader2Icon className="h-3.5 w-3.5 text-violet-400 animate-spin" />}
        {status === "done" && <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-400" />}
        {status === "error" && <AlertCircleIcon className="h-3.5 w-3.5 text-red-400" />}
        <GripVerticalIcon className="h-3 w-3 text-muted-foreground/40 cursor-grab" />
      </div>
      {/* Body */}
      <div className="px-3 py-2.5 text-xs">
        {children}
      </div>
    </div>
  )
}

/* ─── Import Handle from react-flow ─── */
import { Handle, Position, useNodeId, useNodes, useEdges } from "@xyflow/react"

/* ─── Prompt Node ─── */
function PromptNodeComponent({ data, id: nodeId }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const nodeData = data as Record<string, unknown>
  return (
    <NodeShell label="Prompt" icon="📝" status={nodeData.status as string}>
      <textarea
        value={(nodeData.prompt as string) || ""}
        onChange={e => updateNodeData(nodeId, { prompt: e.target.value })}
        placeholder="Tulis prompt di sini..."
        rows={3}
        className="w-full rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
        style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)" }}
      />
    </NodeShell>
  )
}

/* ─── Helper: get connected value by handle ─── */
function useConnectedValue(targetHandle: string, sourceHandle?: string): unknown {
  const nodeId = useNodeId()
  const nodes = useNodes()
  const edges = useEdges()
  if (!nodeId) return null
  const incomingEdge = edges.find(e => e.target === nodeId && e.targetHandle === targetHandle)
  if (!incomingEdge) return null
  const sourceNode = nodes.find(n => n.id === incomingEdge.source)
  if (!sourceNode) return null
  const key = sourceHandle || incomingEdge.sourceHandle || targetHandle
  return (sourceNode.data as Record<string, unknown>)[key] ?? null
}

function useConnectedPrompt(): string | null {
  return useConnectedValue("prompt") as string | null
}

/* ─── Image Generate Node ─── */
function ImageGenNodeComponent({ data, id: nodeId }: NodeProps) {
  const nodeData = data as Record<string, unknown>
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPrompt, setLocalPrompt] = useState((nodeData._localPrompt as string) || "")
  const { updateNodeData } = useReactFlow()

  const connectedPrompt = useConnectedPrompt()
  const generatedImages = (nodeData._generatedImages as GeneratedImage[]) || []
  const selectedIdx = (nodeData._selectedIdx as number) ?? 0

  const activePrompt = connectedPrompt || localPrompt

  const handleGenerate = async () => {
    if (!activePrompt?.trim()) {
      setError("Prompt kosong. Tulis prompt atau hubungkan Prompt Node.")
      return
    }
    setIsGenerating(true)
    setError(null)
    updateNodeData(nodeId, { status: "running" })

    try {
      const result = await generateImages({
        prompt: activePrompt.trim(),
        model: ((nodeData.model as string) || "nano-banana-2") as "nano-banana-2",
        aspectRatio: ((nodeData.aspectRatio as string) || "9:16") as "9:16",
        count: (nodeData.count as number) || 1,
      })
      updateNodeData(nodeId, {
        status: "done",
        _generatedImages: result.images,
        _selectedIdx: 0,
        selectedImage: result.images[0]?.url || "",
        images: result.images.map(i => i.url),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal generate gambar"
      setError(msg)
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelect = (idx: number) => {
    updateNodeData(nodeId, {
      _selectedIdx: idx,
      selectedImage: generatedImages[idx]?.url || "",
    })
  }

  // Preview lightbox
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [savingGallery, setSavingGallery] = useState(false)

  const handleDownload = async (url: string, idx: number) => {
    try {
      await downloadImage(url, `workflow-image-${idx + 1}.png`)
    } catch { /* silent */ }
  }

  const handleSaveToGallery = async (url: string) => {
    setSavingGallery(true)
    try {
      await fetch("/api/gallery/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          prompt: activePrompt,
          model: (nodeData.model as string) || "nano-banana-2",
          aspectRatio: (nodeData.aspectRatio as string) || "9:16",
        }),
      })
    } catch { /* silent */ }
    setSavingGallery(false)
  }

  const previewImage = previewIdx !== null ? generatedImages[previewIdx] : null

  return (
    <>
    <NodeShell label="Image Generate" icon="🖼️" status={nodeData.status as string}>
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)", top: "30%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="references"
        style={{ background: getPortColor("references"), width: 10, height: 10, border: "2px solid var(--background)", top: "70%" }}
      />

      <div className="space-y-2">
        {/* Model + Settings */}
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Model</label>
          <select
            value={(nodeData.model as string) || "nano-banana-2"}
            onChange={e => updateNodeData(nodeId, { model: e.target.value })}
            disabled={isGenerating}
            className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
          >
            <option value="imagen-4">Imagen 4</option>
            <option value="nano-banana-2">Nano Banana 2</option>
            <option value="nano-banana-pro">Nano Banana Pro</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Ratio</label>
            <select
              value={(nodeData.aspectRatio as string) || "9:16"}
              onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })}
              disabled={isGenerating}
              className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
            >
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
          </div>
          <div className="w-16">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Jumlah</label>
            <select
              value={(nodeData.count as number) || 1}
              onChange={e => updateNodeData(nodeId, { count: Number(e.target.value) })}
              disabled={isGenerating}
              className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
        </div>

        {/* Prompt: show textarea if no connected prompt */}
        {!connectedPrompt && (
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Prompt (manual)</label>
            <textarea
              value={localPrompt}
              onChange={e => { setLocalPrompt(e.target.value); updateNodeData(nodeId, { _localPrompt: e.target.value }) }}
              placeholder="Atau hubungkan Prompt Node..."
              rows={2}
              disabled={isGenerating}
              className="w-full rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none disabled:opacity-50"
            />
          </div>
        )}
        {connectedPrompt && (
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Prompt (dari node)</p>
            <p className="text-[11px] text-foreground/80 line-clamp-2">{connectedPrompt}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all active:scale-[0.98]",
            isGenerating
              ? "bg-violet-500/20 text-violet-300 cursor-wait"
              : "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm hover:shadow-md hover:shadow-violet-500/20"
          )}
        >
          {isGenerating ? (
            <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Generating...</>
          ) : (
            <><SparklesIcon className="h-3.5 w-3.5" /> Generate</>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5">
            <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400 leading-tight">{error}</p>
          </div>
        )}

        {/* Generated Images Grid — compact thumbnails */}
        {generatedImages.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">
              {generatedImages.length} gambar — klik untuk preview
            </p>
            <div className="grid grid-cols-4 gap-1">
              {generatedImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setPreviewIdx(idx)}
                  className={cn(
                    "relative rounded-md overflow-hidden border cursor-pointer transition-all hover:opacity-80 active:scale-95",
                    idx === selectedIdx
                      ? "border-violet-500 ring-1 ring-violet-500/30"
                      : "border-border/50"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`${idx + 1}`} className="w-full h-12 object-cover" />
                  {idx === selectedIdx && (
                    <div className="absolute top-0.5 right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-violet-500">
                      <CheckCircle2Icon className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="selectedImage"
        style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)", top: "40%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="images"
        style={{ background: getPortColor("images"), width: 10, height: 10, border: "2px solid var(--background)", top: "70%" }}
      />
    </NodeShell>

    {/* Preview Popup */}
    {previewImage && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewIdx(null)}>
        <div className="relative flex flex-col items-center gap-3 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
          {/* Close */}
          <button onClick={() => setPreviewIdx(null)} className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition shadow-lg">
            <XIcon className="h-3.5 w-3.5" />
          </button>

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImage.url} alt="Preview" className="w-full rounded-xl object-contain shadow-2xl max-h-[60vh]" />

          {/* Actions bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { handleSelect(previewIdx!); setPreviewIdx(null) }}
              className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white hover:bg-violet-600 transition active:scale-95"
            >
              <CheckCircle2Icon className="h-3.5 w-3.5" /> Pilih sebagai output
            </button>
            <button
              onClick={() => handleDownload(previewImage.url, previewIdx!)}
              className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95"
            >
              <DownloadIcon className="h-3.5 w-3.5" /> Download
            </button>
            <button
              onClick={() => handleSaveToGallery(previewImage.url)}
              disabled={savingGallery}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
            >
              {savingGallery ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <FolderPlusIcon className="h-3.5 w-3.5" />}
              Gallery
            </button>
          </div>

          {/* Nav arrows if multiple images */}
          {generatedImages.length > 1 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button
                onClick={() => setPreviewIdx(Math.max(0, previewIdx! - 1))}
                disabled={previewIdx === 0}
                className="px-2 py-1 rounded hover:bg-card/80 transition disabled:opacity-30"
              >← Sebelumnya</button>
              <span>{previewIdx! + 1} / {generatedImages.length}</span>
              <button
                onClick={() => setPreviewIdx(Math.min(generatedImages.length - 1, previewIdx! + 1))}
                disabled={previewIdx === generatedImages.length - 1}
                className="px-2 py-1 rounded hover:bg-card/80 transition disabled:opacity-30"
              >Selanjutnya →</button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}

/* ─── Video Generate Node ─── */
function VideoGenNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData } = useReactFlow()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [localPrompt, setLocalPrompt] = useState((nd._localPrompt as string) || "")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [savingGallery, setSavingGallery] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connectedPrompt = useConnectedPrompt()
  const connectedImage = useConnectedValue("startImage") as string | null
  const activePrompt = connectedPrompt || localPrompt
  const generatedVideoUrl = nd._videoUrl as string | undefined
  const rawVideoUrl = nd._rawVideoUrl as string | undefined

  const handleGenerate = async () => {
    if (!activePrompt?.trim()) { setError("Prompt kosong."); return }
    setIsGenerating(true); setError(null); setElapsed(0)
    updateNodeData(nodeId, { status: "running", _videoUrl: undefined, _rawVideoUrl: undefined })

    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const arMap: Record<string, "landscape" | "portrait"> = { "16:9": "landscape", "9:16": "portrait" }
      const durMap: Record<string, number> = { "5s": 4, "8s": 8 }
      const result = await generateVideos({
        prompt: activePrompt.trim(),
        model: ((nd.model as string) || "veo-3.1-fast") as "veo-3.1-fast",
        aspectRatio: arMap[(nd.aspectRatio as string) || "16:9"] || "landscape",
        duration: (durMap[(nd.duration as string) || "8s"] || 8) as 8,
        startImage: connectedImage || undefined,
      })
      const vid = result.videos[0]
      updateNodeData(nodeId, {
        status: "done",
        _videoUrl: vid?.url || "",
        _rawVideoUrl: vid?.rawUrl || "",
        selectedVideo: vid?.url || "",
        videos: result.videos.map(v => v.url),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate video")
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsGenerating(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleDownload = async () => {
    const url = rawVideoUrl || generatedVideoUrl
    if (!url) return
    try {
      await downloadVideo(url, "workflow-video.mp4")
    } catch { /* silent */ }
  }

  const handleSaveGallery = async () => {
    if (!rawVideoUrl) return
    setSavingGallery(true)
    try {
      await fetch("/api/gallery/save", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rawVideoUrl, prompt: activePrompt, model: (nd.model as string) || "veo-3.1-fast", type: "video" }) })
    } catch { /* silent */ }
    setSavingGallery(false)
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <>
    <NodeShell label="Video Generate" icon="🎬" status={nd.status as string}>
      <Handle type="target" position={Position.Left} id="prompt"
        style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)", top: "30%" }} />
      <Handle type="target" position={Position.Left} id="startImage"
        style={{ background: getPortColor("startImage"), width: 10, height: 10, border: "2px solid var(--background)", top: "70%" }} />

      <div className="space-y-2">
        {/* Settings */}
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Model</label>
          <select value={(nd.model as string) || "veo-3.1-fast"} onChange={e => updateNodeData(nodeId, { model: e.target.value })} disabled={isGenerating}
            className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50">
            <option value="veo-3.1-fast">Veo 3.1 Fast</option>
            <option value="veo-3.1">Veo 3.1</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Ratio</label>
            <select value={(nd.aspectRatio as string) || "16:9"} onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })} disabled={isGenerating}
              className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50">
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Durasi</label>
            <select value={(nd.duration as string) || "8s"} onChange={e => updateNodeData(nodeId, { duration: e.target.value })} disabled={isGenerating}
              className="w-full rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50">
              <option value="5s">5 detik</option>
              <option value="8s">8 detik</option>
            </select>
          </div>
        </div>

        {/* Connected inputs info */}
        {connectedPrompt && (
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Prompt (dari node)</p>
            <p className="text-[11px] text-foreground/80 line-clamp-2">{connectedPrompt}</p>
          </div>
        )}
        {!connectedPrompt && (
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Prompt (manual)</label>
            <textarea value={localPrompt} onChange={e => { setLocalPrompt(e.target.value); updateNodeData(nodeId, { _localPrompt: e.target.value }) }}
              placeholder="Atau hubungkan Prompt Node..." rows={2} disabled={isGenerating}
              className="w-full rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none disabled:opacity-50" />
          </div>
        )}
        {connectedImage && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={connectedImage} alt="Start" className="h-8 w-8 rounded object-cover border border-border" />
            <p className="text-[10px] text-muted-foreground">Start image terhubung</p>
          </div>
        )}

        {/* Generate */}
        <button onClick={handleGenerate} disabled={isGenerating}
          className={cn("w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all active:scale-[0.98]",
            isGenerating ? "bg-cyan-500/20 text-cyan-300 cursor-wait" : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm hover:shadow-md hover:shadow-cyan-500/20")}>
          {isGenerating ? (<><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Generating {fmtTime(elapsed)}</>) : (<><SparklesIcon className="h-3.5 w-3.5" /> Generate Video</>)}
        </button>

        {/* Progress bar while generating */}
        {isGenerating && (
          <div className="space-y-1">
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse" style={{ width: `${Math.min(95, elapsed * 0.8)}%`, transition: "width 1s" }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Video generation biasanya 1-3 menit...</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5">
            <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400 leading-tight">{error}</p>
          </div>
        )}

        {/* Video Result Thumbnail */}
        {generatedVideoUrl && !isGenerating && (
          <div onClick={() => setPreviewOpen(true)}
            className="rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80 transition relative">
            <video src={generatedVideoUrl} className="w-full h-20 object-cover" muted />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <PlayIcon className="h-6 w-6 text-white drop-shadow" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center py-1">Klik untuk preview</p>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="selectedVideo"
        style={{ background: getPortColor("selectedVideo"), width: 10, height: 10, border: "2px solid var(--background)", top: "40%" }} />
      <Handle type="source" position={Position.Right} id="videos"
        style={{ background: getPortColor("videos"), width: 10, height: 10, border: "2px solid var(--background)", top: "70%" }} />
    </NodeShell>

    {/* Video Preview Popup */}
    {previewOpen && generatedVideoUrl && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
        <div className="relative flex flex-col items-center gap-3 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
          <button onClick={() => setPreviewOpen(false)} className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition shadow-lg">
            <XIcon className="h-3.5 w-3.5" />
          </button>
          <video src={generatedVideoUrl} controls autoPlay className="w-full rounded-xl shadow-2xl max-h-[60vh]" />
          <div className="flex items-center gap-2">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95">
              <DownloadIcon className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={handleSaveGallery} disabled={savingGallery}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50">
              {savingGallery ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <FolderPlusIcon className="h-3.5 w-3.5" />} Gallery
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

/* ─── Gallery (Save) Node ─── */
function GalleryNodeComponent({ data }: NodeProps) {
  return (
    <NodeShell label="Save to Gallery" icon="💾" status={data.status as string}>
      <Handle
        type="target"
        position={Position.Left}
        id="media"
        style={{ background: getPortColor("media"), width: 10, height: 10, border: "2px solid var(--background)" }}
      />
      <div className="text-center py-2">
        <p className="text-muted-foreground text-[11px]">
          {data.status === "done" ? "✅ Tersimpan di Gallery" : "Simpan hasil ke Gallery"}
        </p>
      </div>
    </NodeShell>
  )
}

/* ─── Output / Preview Node ─── */
function OutputNodeComponent({ data }: NodeProps) {
  const mediaUrl = data.media as string | undefined
  return (
    <NodeShell label="Output" icon="👁️" status={data.status as string}>
      <Handle
        type="target"
        position={Position.Left}
        id="media"
        style={{ background: getPortColor("media"), width: 10, height: 10, border: "2px solid var(--background)" }}
      />
      <div className="text-center py-2">
        {mediaUrl ? (
          <div className="rounded-lg overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl} alt="Output" className="w-full h-auto max-h-40 object-cover" />
          </div>
        ) : (
          <p className="text-muted-foreground text-[11px]">Preview hasil akhir</p>
        )}
      </div>
    </NodeShell>
  )
}

/* ─── Node Type Registry ─── */
const nodeTypes: NodeTypes = {
  promptNode: PromptNodeComponent,
  imageGenNode: ImageGenNodeComponent,
  videoGenNode: VideoGenNodeComponent,
  galleryNode: GalleryNodeComponent,
  outputNode: OutputNodeComponent,
}

/* ─── Palette items ─── */
const PALETTE_ITEMS = [
  { type: "promptNode", label: "Prompt", icon: "📝", desc: "Input teks" },
  { type: "imageGenNode", label: "Image Gen", icon: "🖼️", desc: "Generate gambar" },
  { type: "videoGenNode", label: "Video Gen", icon: "🎬", desc: "Generate video" },
  { type: "galleryNode", label: "Save", icon: "💾", desc: "Simpan ke gallery" },
  { type: "outputNode", label: "Output", icon: "👁️", desc: "Preview hasil" },
]

/* ═══════════════════════════════════════════════════════
   Main Editor Page
   ═══════════════════════════════════════════════════════ */

export default function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentStarted, setAgentStarted] = useState(false)
  const [agentMessages, setAgentMessages] = useState<{ role: "user" | "agent"; text: string }[]>([])
  const [agentInput, setAgentInput] = useState("")
  const [agentThinking, setAgentThinking] = useState(false)
  const agentEndRef = useRef<HTMLDivElement>(null)

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<{ getViewport: () => { x: number; y: number; zoom: number } } | null>(null)

  // Auto-scroll agent chat
  useEffect(() => {
    agentEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [agentMessages, agentThinking])

  // Apply agent actions to canvas
  const applyAgentActions = useCallback((actions: Record<string, unknown>[]) => {
    if (!actions?.length) return
    let actionsApplied = 0

    for (const action of actions) {
      switch (action.type) {
        case "clearCanvas":
          setNodes([])
          setEdges([])
          actionsApplied++
          break

        case "addNode": {
          const pos = action.position as { x: number; y: number } || { x: 100, y: 250 }
          const newNode: Node = {
            id: action.id as string || `n_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            type: action.nodeType as string,
            position: pos,
            data: (action.data as Record<string, unknown>) || {},
          }
          setNodes(nds => [...nds, newNode])
          actionsApplied++
          break
        }

        case "addEdge": {
          const newEdge: Edge = {
            id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            source: action.source as string,
            target: action.target as string,
            sourceHandle: action.sourceHandle as string,
            targetHandle: action.targetHandle as string,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            style: { stroke: getPortColor(action.sourceHandle as string || ""), strokeWidth: 2 },
          }
          setEdges(eds => [...eds, newEdge])
          actionsApplied++
          break
        }

        case "removeNode":
          setNodes(nds => nds.filter(n => n.id !== action.id))
          setEdges(eds => eds.filter(e => e.source !== action.id && e.target !== action.id))
          actionsApplied++
          break

        case "updateNode":
          setNodes(nds => nds.map(n =>
            n.id === action.id
              ? { ...n, data: { ...n.data, ...(action.data as Record<string, unknown>) } }
              : n
          ))
          actionsApplied++
          break
      }
    }

    return actionsApplied
  }, [setNodes, setEdges])

  // Send message to agent API
  const sendAgentMessage = useCallback(async (userText: string) => {
    const newMsgs = [...agentMessages, { role: "user" as const, text: userText }]
    setAgentMessages(newMsgs)
    setAgentThinking(true)

    try {
      const canvas = {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
        edges: edges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      }

      const res = await fetch("/api/ai/workflow-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, canvas }),
      })

      if (!res.ok) throw new Error("Agent error")
      const data = await res.json()

      // Apply actions to canvas
      const actions = data.actions as Record<string, unknown>[] || []
      const applied = actions.length > 0 ? applyAgentActions(actions) : 0

      // Build reply with action summary
      let reply = data.reply || "Siap!"
      if (applied && applied > 0) {
        reply += `\n\n✅ ${applied} perubahan diterapkan ke canvas.`
      }

      setAgentMessages(prev => [...prev, { role: "agent", text: reply }])
    } catch {
      setAgentMessages(prev => [...prev, { role: "agent", text: "⚠️ Gagal menghubungi agent. Coba lagi nanti." }])
    } finally {
      setAgentThinking(false)
    }
  }, [agentMessages, nodes, edges, applyAgentActions])

  // Load workflow
  useEffect(() => {
    const wf = getWorkflow(id)
    if (!wf) {
      router.replace("/dashboard/workflow")
      return
    }
    setWorkflow(wf)
    setNodes(wf.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })))
    setEdges(wf.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { stroke: getPortColor(e.sourceHandle), strokeWidth: 2 },
    })))
    setLoaded(true)
  }, [id, router, setNodes, setEdges])

  // Connect edges
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      id: `e_${Date.now()}`,
      ...connection,
      source: connection.source!,
      target: connection.target!,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { stroke: getPortColor(connection.sourceHandle || ""), strokeWidth: 2 },
    }
    setEdges(eds => addEdge(newEdge, eds))
  }, [setEdges])

  // Save
  const handleSave = useCallback(() => {
    if (!workflow) return
    setSaving(true)
    const viewport = rfInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }

    updateWorkflow(workflow.id, {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type!,
        position: n.position,
        data: n.data as Record<string, unknown>,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || "",
        targetHandle: e.targetHandle || "",
      })),
      viewport,
    })

    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 300)
  }, [workflow, nodes, edges, rfInstance])

  // Clear canvas
  const handleClear = () => {
    setNodes([])
    setEdges([])
  }

  // Drag & drop from palette
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData("application/reactflow")
    if (!type) return

    const bounds = reactFlowWrapper.current?.getBoundingClientRect()
    if (!bounds) return

    const position = {
      x: e.clientX - bounds.left - 120,
      y: e.clientY - bounds.top - 30,
    }

    const defaultData: Record<string, Record<string, unknown>> = {
      promptNode: { prompt: "" },
      imageGenNode: { model: "nano-banana-2", aspectRatio: "9:16", count: 1 },
      videoGenNode: { model: "veo-3.1-fast", aspectRatio: "16:9", duration: "5s" },
      galleryNode: {},
      outputNode: {},
    }

    const newNode: Node = {
      id: `n_${Date.now()}`,
      type,
      position,
      data: defaultData[type] || {},
    }

    setNodes(nds => [...nds, newNode])
  }, [setNodes])

  // Credit estimation
  const estimatedCredits = nodes.reduce((sum, n) => {
    if (n.type === "imageGenNode") return sum + 5 * ((n.data as Record<string, unknown>).count as number || 1)
    if (n.type === "videoGenNode") return sum + 20
    return sum
  }, 0)

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col bg-background transition-all duration-300",
      isFullscreen ? "fixed inset-0 z-50" : "h-[calc(100vh-0px)]"
    )}>
      {/* Header — hidden in fullscreen */}
      {!isFullscreen && (
        <DashboardHeader breadcrumbs={[
          { label: "Jenna Bot Pro", href: "/dashboard" },
          { label: "Workflow Builder", href: "/dashboard/workflow" },
          { label: workflow?.name || "Editor" },
        ]} />
      )}

      {/* ─── Main: Canvas + Toolbar + Bottom Palette ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/30 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => isFullscreen ? setIsFullscreen(false) : router.push("/dashboard/workflow")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              {isFullscreen ? "Keluar Fullscreen" : "Kembali"}
            </button>
            <span className="text-xs text-muted-foreground/40">|</span>
            <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{workflow?.name}</span>
            {estimatedCredits > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[10px] font-medium text-violet-400 ml-1">
                <CoinsIcon className="h-3 w-3" />
                {estimatedCredits} kredit
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { /* TODO: run workflow */ }}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:shadow-md hover:shadow-violet-500/20 transition-all active:scale-95"
            >
              <PlayIcon className="h-3.5 w-3.5" />
              Run
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                saved
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              {saving ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle2Icon className="h-3.5 w-3.5" />
              ) : (
                <SaveIcon className="h-3.5 w-3.5" />
              )}
              {saved ? "Tersimpan" : "Simpan"}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition"
              title="Bersihkan canvas"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-muted-foreground/20">|</span>
            <button
              onClick={() => setIsFullscreen(f => !f)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title={isFullscreen ? "Keluar fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2Icon className="h-3.5 w-3.5" /> : <Maximize2Icon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setAgentOpen(a => !a)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition",
                agentOpen
                  ? "bg-violet-500/15 text-violet-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Workflow Agent"
            >
              {agentOpen ? <PanelRightCloseIcon className="h-3.5 w-3.5" /> : <BotIcon className="h-3.5 w-3.5" />}
              Agent
            </button>
          </div>
        </div>

        {/* ─── Canvas + Agent Layout ─── */}
        <div className="flex-1 flex overflow-hidden">
          {/* ReactFlow Canvas */}
          <div ref={reactFlowWrapper} className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={(instance: { getViewport: () => { x: number; y: number; zoom: number } }) => setRfInstance(instance)}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[16, 16]}
              defaultEdgeOptions={{
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
              }}
              proOptions={{ hideAttribution: true }}
              className="workflow-canvas"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
              <Controls showInteractive={false} className="workflow-controls" />
              <MiniMap nodeColor={() => "#8b5cf6"} maskColor="rgba(0,0,0,0.3)" className="workflow-minimap" />
              {nodes.length === 0 && (
                <Panel position="top-center">
                  <div className="mt-32 text-center animate-fade-up">
                    <p className="text-sm text-muted-foreground/50 mb-1">Drag node dari panel bawah ke canvas</p>
                    <p className="text-xs text-muted-foreground/30">Hubungkan port antar node untuk membuat alur kerja</p>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>

          {/* ─── Workflow Agent Sidebar ─── */}
          {agentOpen && (
            <div className="w-[320px] shrink-0 border-l border-border bg-card/50 backdrop-blur-md flex flex-col">
              {/* Agent Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/15">
                    <BotIcon className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Workflow Agent</p>
                    <p className="text-[10px] text-muted-foreground">AI Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[9px] font-medium text-violet-400">BETA</span>
                  <button onClick={() => setAgentOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition">
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {!agentStarted ? (
                /* Welcome State */
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                  <div className="space-y-4 max-w-[250px]">
                    {/* Capability chips */}
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                        <ScanEyeIcon className="h-3 w-3" /> Canvas
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-[10px] font-medium text-violet-400">
                        <PencilRulerIcon className="h-3 w-3" /> Prepare edits
                      </span>
                    </div>
                    <div className="flex justify-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                        <ZapIcon className="h-3 w-3" /> Output
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground leading-snug">
                      AI assistant yang langsung menyusun workflow di canvas kamu.
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Cukup deskripsikan kebutuhan, agent akan membuat node, menghubungkan, dan mengonfigurasi semuanya.
                    </p>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => { setAgentStarted(true); setAgentMessages([{ role: "agent", text: `Halo! Saya Workflow Agent. Saya bisa bantu:\n\n\u2022 \ud83d\udcd6 Baca canvas kamu & analisis alur\n\u2022 \ud83d\udd27 Siapkan template workflow\n\u2022 \u26a1 Bantu konfigurasi node\n\nMau mulai dari mana?` }]) }}
                        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:shadow-md hover:shadow-violet-500/20 transition-all active:scale-[0.98]"
                      >
                        Mulai Agent
                      </button>
                      <button
                        onClick={() => { setAgentStarted(true) }}
                        className="w-full rounded-xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
                      >
                        Langsung ke chat
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat State */
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    {agentMessages.map((msg, i) => (
                      <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap",
                          msg.role === "user"
                            ? "bg-violet-500 text-white rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {agentThinking && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={agentEndRef} />
                  </div>

                  {/* Quick Actions */}
                  <div className="px-3 pb-1 flex flex-wrap gap-1">
                    {[
                      { label: "Baca canvas", icon: ScanEyeIcon, msg: "Baca dan analisis canvas saya sekarang" },
                      { label: "Image → Video", icon: PencilRulerIcon, msg: "Buatkan workflow: Prompt → Image Generate → Video Generate → Output" },
                      { label: "Batch gambar", icon: ZapIcon, msg: "Buatkan workflow batch generate 4 gambar dengan nano-banana-2 lalu simpan ke gallery" },
                    ].map(q => (
                      <button key={q.label} onClick={() => sendAgentMessage(q.msg)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition"
                      >
                        <q.icon className="h-3 w-3" /> {q.label}
                      </button>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="px-3 py-2 border-t border-border">
                    <div className="flex items-end gap-1.5">
                      <textarea
                        value={agentInput}
                        onChange={e => setAgentInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            if (!agentInput.trim() || agentThinking) return
                            const msg = agentInput.trim()
                            setAgentInput("")
                            sendAgentMessage(msg)
                          }
                        }}
                        placeholder="Ketik perintah..."
                        rows={1}
                        className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
                      />
                      <button
                        onClick={() => {
                          if (!agentInput.trim() || agentThinking) return
                          const msg = agentInput.trim()
                          setAgentInput("")
                          sendAgentMessage(msg)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition shrink-0 active:scale-95"
                      >
                        <SendIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Bottom: Node Palette ─── */}
        <div className="shrink-0 border-t border-border bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-2 shrink-0">Node</p>
            {PALETTE_ITEMS.map(item => (
              <div
                key={item.type}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData("application/reactflow", item.type)
                  e.dataTransfer.effectAllowed = "move"
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing border border-transparent hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group shrink-0"
              >
                <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                <div>
                  <p className="text-xs font-medium text-foreground leading-tight">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
