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
  MousePointer2Icon,
  HandIcon,
  FileTextIcon,
  ImageIcon,
  VideoIcon,
  RefreshCwIcon,
  UploadIcon,
  LayoutGridIcon,
  ScissorsIcon,
  UserIcon,
  SlidersHorizontalIcon,
  MicIcon,
  Volume2Icon,
  ChevronDownIcon,
  LockIcon,
  CopyIcon,
  MoreHorizontalIcon,
  CameraIcon,
  MonitorIcon,
  ClipboardPasteIcon,
} from "lucide-react"
import { generateImages, uploadImageAsset, type GeneratedImage, type UploadAssetResult, generateVideos, type GeneratedVideo } from "@/lib/api/google-flow"
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
  audio: "#f59e0b",
  poseData: "#f59e0b",
  cameraParams: "#f59e0b",
}

function getPortColor(handle: string): string {
  return PORT_COLORS[handle] || "#8b5cf6"
}

/* ─── Base Node Wrapper — Clean card design ─── */
function NodeShell({ label, icon, status, nodeId, onDelete, children }: {
  label: string
  icon: string
  status?: string
  nodeId?: string
  onDelete?: () => void
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      "workflow-node min-w-[280px] max-w-[340px] rounded-2xl border bg-card shadow-sm transition-all",
      status === "running" && "ring-2 ring-blue-400/50 shadow-blue-500/10 shadow-lg",
      status === "done" && "ring-1 ring-emerald-500/40",
      status === "error" && "ring-1 ring-red-500/40",
      !status && "border-border/60 hover:shadow-md"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-foreground flex-1">{label}</span>
        {status === "running" && <Loader2Icon className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
        {status === "done" && <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-400" />}
        {status === "error" && <AlertCircleIcon className="h-3.5 w-3.5 text-red-400" />}
      </div>
      {/* Body */}
      <div className="px-3.5 pb-3 text-xs">
        {children}
      </div>
      {/* Bottom action bar */}
      <div className="flex items-center justify-center gap-0.5 pb-2">
        <div className="flex items-center gap-1 rounded-full bg-muted/50 border border-border/40 px-2 py-1">
          <button className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition" title="Copy">
            <CopyIcon className="h-3 w-3" />
          </button>
          <button className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition" title="Paste">
            <ClipboardPasteIcon className="h-3 w-3" />
          </button>
          <button className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition" title="More">
            <MoreHorizontalIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Close Button (positioned top-right outside node) ─── */
function NodeCloseBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border/60 shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition"
      title="Hapus node"
    >
      <XIcon className="h-3.5 w-3.5" />
    </button>
  )
}

/* ─── Decorative handle icon (visual only, positioned next to actual Handle) ─── */
function HandleIcon({ icon: IconComp, side, top, title }: {
  icon: React.ComponentType<{ className?: string }>
  side: "left" | "right"
  top?: string
  title?: string
}) {
  return (
    <div
      className="absolute flex items-center justify-center h-7 w-7 rounded-full bg-card border border-border/60 shadow-sm text-muted-foreground z-[5]"
      style={{
        top: top || "50%",
        transform: "translateY(-50%)",
        ...(side === "left" ? { left: -14 } : { right: -14 }),
      }}
      title={title}
    >
      <IconComp className="h-3.5 w-3.5" />
    </div>
  )
}

/* ─── Import Handle from react-flow ─── */
import { Handle, Position, useNodeId, useNodes, useEdges } from "@xyflow/react"

/* ─── Prompt Node ─── */
function PromptNodeComponent({ data, id: nodeId }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const nodeData = data as Record<string, unknown>
  const promptText = (nodeData.prompt as string) || ""
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Prompt" icon="📝" status={nodeData.status as string} nodeId={nodeId}>
        <textarea
          value={promptText}
          onChange={e => updateNodeData(nodeId, { prompt: e.target.value })}
          placeholder='Try &quot;A beautiful female animated character with a happy vibe.&quot;'
          rows={4}
          maxLength={10000}
          className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground/50">{promptText.length}/10000</span>
        </div>
        {/* Source handle on right */}
        <HandleIcon icon={FileTextIcon} side="right" title="Output: Prompt text" />
        <Handle type="source" position={Position.Right} id="prompt"
          style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)" }} />
      </NodeShell>
    </div>
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
  const { updateNodeData, deleteElements } = useReactFlow()

  // Reference images state
  const [refImages, setRefImages] = useState<{ file?: File; preview: string; uploading: boolean; uploaded?: UploadAssetResult; error?: boolean }[]>(
    (nodeData._refPreviews as { preview: string; uploaded?: UploadAssetResult }[] || []).map(r => ({ ...r, uploading: false }))
  )
  const [uploadEmail, setUploadEmail] = useState<string | null>((nodeData._uploadEmail as string) || null)
  const refInputRef = useRef<HTMLInputElement>(null)

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
      // Collect uploaded reference IDs
      const refs = refImages
        .filter(r => r.uploaded?.mediaGenerationId)
        .map(r => r.uploaded!.mediaGenerationId)

      const result = await generateImages({
        prompt: activePrompt.trim(),
        model: ((nodeData.model as string) || "nano-banana-2") as "nano-banana-2",
        aspectRatio: ((nodeData.aspectRatio as string) || "9:16") as "9:16",
        count: (nodeData.count as number) || 1,
        ...(refs.length > 0 ? { references: refs, email: uploadEmail || undefined } : {}),
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
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Image Generate" icon="🖼️" status={nodeData.status as string} nodeId={nodeId}>
        {/* Decorative handle icons */}
        <HandleIcon icon={FileTextIcon} side="left" top="30%" title="Input: Prompt" />
        <HandleIcon icon={ImageIcon} side="left" top="55%" title="Input: Reference Images" />
        <HandleIcon icon={LayoutGridIcon} side="right" top="40%" title="Output: Generated Image" />
        {/* Actual handles */}
        <Handle type="target" position={Position.Left} id="prompt"
          style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)", top: "30%" }} />
        <Handle type="target" position={Position.Left} id="references"
          style={{ background: getPortColor("references"), width: 10, height: 10, border: "2px solid var(--background)", top: "55%" }} />
        <Handle type="source" position={Position.Right} id="selectedImage"
          style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)", top: "40%" }} />

        {/* Preview area */}
        <div
          className={cn(
            "relative w-full aspect-[4/3] rounded-xl border bg-muted/20 overflow-hidden mb-2",
            generatedImages.length > 0 ? "border-blue-400/30" : "border-border"
          )}
          onClick={() => generatedImages.length > 0 && setPreviewIdx(selectedIdx)}
        >
          {generatedImages.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImages[selectedIdx]?.url} alt="Generated" className="w-full h-full object-cover" />
              {generatedImages.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
                  {generatedImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); handleSelect(idx) }}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        idx === selectedIdx ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2Icon className="h-6 w-6 text-blue-400 animate-spin" />
              <p className="text-[10px] text-muted-foreground">Generating...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground/40">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Reference images section */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              Ref Image {refImages.length > 0 && `(${refImages.length})`}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); refInputRef.current?.click() }}
              disabled={isGenerating || refImages.length >= 10}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition disabled:opacity-30"
              title="Upload reference image (PNG, JPG, WebP, max 20MB)"
            >
              <UploadIcon className="h-3 w-3" /> Tambah
            </button>
          </div>
          {refImages.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {refImages.map((ref, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ref.preview}
                    alt={`Ref ${idx + 1}`}
                    className={cn(
                      "h-10 w-10 rounded-lg object-cover border",
                      ref.uploading ? "border-amber-400/50 opacity-60" : ref.error ? "border-red-400/50" : "border-border"
                    )}
                  />
                  {ref.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2Icon className="h-3 w-3 text-amber-400 animate-spin" />
                    </div>
                  )}
                  {ref.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg">
                      <XCircleIcon className="h-3 w-3 text-red-400" />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const updated = refImages.filter((_, i) => i !== idx)
                      setRefImages(updated)
                      updateNodeData(nodeId, { _refPreviews: updated.filter(r => !r.error).map(r => ({ preview: r.preview, uploaded: r.uploaded })) })
                    }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground shadow-sm"
                    title="Hapus referensi"
                  >
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); refInputRef.current?.click() }}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 py-2 text-[10px] text-muted-foreground/60 hover:text-muted-foreground hover:border-border transition disabled:opacity-30"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Klik untuk upload referensi
            </button>
          )}
          {/* Hidden file input */}
          <input
            ref={refInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || [])
              if (files.length === 0) return
              e.target.value = ""

              for (const file of files) {
                if (refImages.length >= 10) break
                const preview = URL.createObjectURL(file)
                setRefImages(prev => [...prev, { file, preview, uploading: true }])

                try {
                  const result = await uploadImageAsset(file, uploadEmail || undefined)
                  if (!uploadEmail) setUploadEmail(result.email)
                  setRefImages(prev => {
                    const updated = prev.map(r => r.preview === preview ? { ...r, uploading: false, uploaded: result } : r)
                    updateNodeData(nodeId, {
                      _refPreviews: updated.map(r => ({ preview: r.preview, uploaded: r.uploaded })),
                      _uploadEmail: result.email,
                    })
                    return updated
                  })
                } catch (err) {
                  console.error("Ref upload failed:", err)
                  setRefImages(prev => prev.map(r => r.preview === preview ? { ...r, uploading: false, error: true } : r))
                }
              }
            }}
          />
        </div>

        {/* Inline prompt + generate button */}
        <div className="relative">
          <input
            type="text"
            value={connectedPrompt || localPrompt}
            onChange={e => { if (!connectedPrompt) { setLocalPrompt(e.target.value); updateNodeData(nodeId, { _localPrompt: e.target.value }) } }}
            placeholder={connectedPrompt ? "Prompt dari node..." : "Describe the image you want to generate..."}
            disabled={isGenerating}
            readOnly={!!connectedPrompt}
            className="w-full rounded-xl border border-border bg-muted/20 pl-3 pr-9 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:opacity-50"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-30"
            title="Generate"
          >
            {isGenerating ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PlayIcon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5 mt-1.5">
            <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400 leading-tight">{error}</p>
          </div>
        )}
      </NodeShell>

      {/* Settings bar below node */}
      <div className="flex items-center justify-center mt-1.5">
        <div className="flex items-center gap-2 rounded-full bg-card border border-border/50 shadow-sm px-3 py-1.5">
          <select
            value={(nodeData.model as string) || "nano-banana-2"}
            onChange={e => updateNodeData(nodeId, { model: e.target.value })}
            disabled={isGenerating}
            className="bg-transparent text-xs font-medium text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            <option value="imagen-4">Imagen 4</option>
            <option value="nano-banana-2">Nano Banana 2</option>
            <option value="nano-banana-pro">Nano Banana Pro</option>
          </select>
          <div className="h-4 w-px bg-border/50" />
          <div className="flex items-center gap-1">
            <MonitorIcon className="h-3 w-3 text-muted-foreground" />
            <select
              value={(nodeData.aspectRatio as string) || "16:9"}
              onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })}
              disabled={isGenerating}
              className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
          </div>
          <div className="h-4 w-px bg-border/50" />
          <button className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition" title="More options">
            <MoreHorizontalIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    {/* Preview Popup */}
    {previewImage && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewIdx(null)}>
        <div className="relative flex flex-col items-center gap-3 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
          <button onClick={() => setPreviewIdx(null)} className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition shadow-lg">
            <XIcon className="h-3.5 w-3.5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImage.url} alt="Preview" className="w-full rounded-xl object-contain shadow-2xl max-h-[60vh]" />
          <div className="flex items-center gap-2">
            <button onClick={() => { handleSelect(previewIdx!); setPreviewIdx(null) }} className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition active:scale-95">
              <CheckCircle2Icon className="h-3.5 w-3.5" /> Pilih
            </button>
            <button onClick={() => handleDownload(previewImage.url, previewIdx!)} className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95">
              <DownloadIcon className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={() => handleSaveToGallery(previewImage.url)} disabled={savingGallery} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50">
              {savingGallery ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <FolderPlusIcon className="h-3.5 w-3.5" />} Gallery
            </button>
          </div>
          {generatedImages.length > 1 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button onClick={() => setPreviewIdx(Math.max(0, previewIdx! - 1))} disabled={previewIdx === 0} className="px-2 py-1 rounded hover:bg-card/80 transition disabled:opacity-30">← Sebelumnya</button>
              <span>{previewIdx! + 1} / {generatedImages.length}</span>
              <button onClick={() => setPreviewIdx(Math.min(generatedImages.length - 1, previewIdx! + 1))} disabled={previewIdx === generatedImages.length - 1} className="px-2 py-1 rounded hover:bg-card/80 transition disabled:opacity-30">Selanjutnya →</button>
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
  const { updateNodeData, deleteElements } = useReactFlow()
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
        model: ((nd.model as string) || "veo-3.1-lite-low-priority") as "veo-3.1-lite-low-priority",
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
        body: JSON.stringify({ url: rawVideoUrl, prompt: activePrompt, model: (nd.model as string) || "veo-3.1-lite-low-priority", type: "video" }) })
    } catch { /* silent */ }
    setSavingGallery(false)
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <>
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Video Generate" icon="🎬" status={nd.status as string} nodeId={nodeId}>
        {/* Decorative handle icons */}
        <HandleIcon icon={FileTextIcon} side="left" top="25%" title="Input: Prompt" />
        <HandleIcon icon={ImageIcon} side="left" top="45%" title="Input: Start Image" />
        <HandleIcon icon={LayoutGridIcon} side="right" top="40%" title="Output: Generated Video" />
        {/* Actual handles */}
        <Handle type="target" position={Position.Left} id="prompt"
          style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)", top: "25%" }} />
        <Handle type="target" position={Position.Left} id="startImage"
          style={{ background: getPortColor("startImage"), width: 10, height: 10, border: "2px solid var(--background)", top: "45%" }} />
        <Handle type="source" position={Position.Right} id="selectedVideo"
          style={{ background: getPortColor("selectedVideo"), width: 10, height: 10, border: "2px solid var(--background)", top: "40%" }} />

        {/* Preview area */}
        <div
          className={cn(
            "relative w-full aspect-video rounded-xl border bg-muted/20 overflow-hidden mb-2",
            generatedVideoUrl ? "border-blue-400/30" : "border-border"
          )}
          onClick={() => generatedVideoUrl && setPreviewOpen(true)}
        >
          {generatedVideoUrl && !isGenerating ? (
            <>
              <video src={generatedVideoUrl} className="w-full h-full object-cover" muted />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <PlayIcon className="h-8 w-8 text-white drop-shadow" />
              </div>
            </>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2Icon className="h-6 w-6 text-cyan-400 animate-spin" />
              <p className="text-[10px] text-muted-foreground">Generating {fmtTime(elapsed)}</p>
              <div className="w-2/3 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse" style={{ width: `${Math.min(95, elapsed * 0.8)}%`, transition: "width 1s" }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground/40">
              <VideoIcon className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Connected start image indicator */}
        {connectedImage && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-2 py-1 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={connectedImage} alt="Start" className="h-6 w-6 rounded object-cover border border-border" />
            <p className="text-[10px] text-muted-foreground">Start image</p>
          </div>
        )}

        {/* Inline prompt + generate button */}
        <div className="relative">
          <input
            type="text"
            value={connectedPrompt || localPrompt}
            onChange={e => { if (!connectedPrompt) { setLocalPrompt(e.target.value); updateNodeData(nodeId, { _localPrompt: e.target.value }) } }}
            placeholder={connectedPrompt ? "Prompt dari node..." : "Connect a prompt to generate video..."}
            disabled={isGenerating}
            readOnly={!!connectedPrompt}
            className="w-full rounded-xl border border-border bg-muted/20 pl-3 pr-9 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:opacity-50"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-30"
            title="Generate Video"
          >
            {isGenerating ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PlayIcon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5 mt-1.5">
            <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400 leading-tight">{error}</p>
          </div>
        )}
      </NodeShell>

      {/* Settings bar below node */}
      <div className="flex items-center justify-center mt-1.5">
        <div className="flex items-center gap-2 rounded-full bg-card border border-border/50 shadow-sm px-3 py-1.5">
          <div className="flex items-center gap-1">
            <MonitorIcon className="h-3 w-3 text-muted-foreground" />
            <select
              value={(nd.aspectRatio as string) || "16:9"}
              onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })}
              disabled={isGenerating}
              className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
          </div>
          <div className="h-4 w-px bg-border/50" />
          {/* Resolution toggle */}
          <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
            <button
              onClick={() => updateNodeData(nodeId, { duration: "5s" })}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-medium transition",
                (nd.duration as string) === "5s" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >720p</button>
            <button
              onClick={() => updateNodeData(nodeId, { duration: "8s" })}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-medium transition",
                (nd.duration as string) !== "5s" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >1080p</button>
          </div>
          <div className="h-4 w-px bg-border/50" />
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition" title="Start Frame">
            <ScanEyeIcon className="h-3 w-3" /> Start Frame
          </button>
          <div className="h-4 w-px bg-border/50" />
          <button className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition" title="More options">
            <MoreHorizontalIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    {/* Video Preview Popup */}
    {previewOpen && generatedVideoUrl && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
        <div className="relative flex flex-col items-center gap-3 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
          <button onClick={() => setPreviewOpen(false)} className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition shadow-lg">
            <XIcon className="h-3.5 w-3.5" />
          </button>
          <video src={generatedVideoUrl} controls autoPlay className="w-full rounded-xl shadow-2xl max-h-[60vh]" />
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95">
              <DownloadIcon className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={handleSaveGallery} disabled={savingGallery} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50">
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

/* ─── Extend Video Node ─── */
function ExtendVideoNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connectedVideo = useConnectedValue("video") as string | null
  const resultUrl = nd._resultUrl as string | undefined

  const handleExtend = async () => {
    if (!connectedVideo) { setError("Hubungkan video terlebih dahulu"); return }
    setIsProcessing(true); setError(null)
    updateNodeData(nodeId, { status: "running" })
    try {
      const video = document.createElement("video")
      video.crossOrigin = "anonymous"; video.src = connectedVideo
      await new Promise<void>((res, rej) => { video.onloadedmetadata = () => res(); video.onerror = () => rej(new Error("Gagal load video")) })
      video.currentTime = Math.max(0, video.duration - 0.1)
      await new Promise<void>(res => { video.onseeked = () => res() })
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0)
      const blob = await (await fetch(canvas.toDataURL("image/jpeg", 0.9))).blob()
      const file = new File([blob], "last-frame.jpg", { type: "image/jpeg" })
      const { uploadImageAsset: upload } = await import("@/lib/api/google-flow")
      const asset = await upload(file)
      const prompt = (nd._extendPrompt as string) || "Continue the video naturally with smooth motion"
      const result = await generateVideos({ prompt, model: "veo-3.1-lite-low-priority", aspectRatio: "landscape", duration: ((nd.extendDuration as string) === "5s" ? 4 : 8) as 4 | 8, startImage: asset.mediaGenerationId, email: asset.email })
      const videoUrl = result.videos[0]?.url || ""
      updateNodeData(nodeId, { status: "done", selectedVideo: videoUrl, _resultUrl: videoUrl })
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal extend video"); updateNodeData(nodeId, { status: "error" })
    } finally { setIsProcessing(false) }
  }

  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Extend Video" icon="🔄" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={VideoIcon} side="left" title="Input: Video" />
        <Handle type="target" position={Position.Left} id="video" style={{ background: getPortColor("video"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={LayoutGridIcon} side="right" title="Output: Extended Video" />
        <Handle type="source" position={Position.Right} id="selectedVideo" style={{ background: getPortColor("selectedVideo"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="relative w-full aspect-video rounded-xl border border-border bg-muted/20 overflow-hidden mb-2">
          {resultUrl ? <video src={resultUrl} className="w-full h-full object-cover" muted controls /> : isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full gap-2"><Loader2Icon className="h-6 w-6 text-cyan-400 animate-spin" /><p className="text-[10px] text-muted-foreground">Extending...</p></div>
          ) : (<div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground/40"><RefreshCwIcon className="h-6 w-6" /><p className="text-[10px]">{connectedVideo ? "Ready" : "Connect video"}</p></div>)}
        </div>
        <textarea value={(nd._extendPrompt as string) || ""} onChange={e => updateNodeData(nodeId, { _extendPrompt: e.target.value })} placeholder="Deskripsi kelanjutan video..." rows={2} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none mb-2" />
        <div className="flex items-center gap-2 mb-1">
          <select value={(nd.extendDuration as string) || "8s"} onChange={e => updateNodeData(nodeId, { extendDuration: e.target.value })} className="flex-1 rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none"><option value="5s">+5 detik</option><option value="8s">+8 detik</option></select>
          <button onClick={handleExtend} disabled={isProcessing || !connectedVideo} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95">{isProcessing ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <PlayIcon className="h-3 w-3" />} Extend</button>
        </div>
        {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      </NodeShell>
    </div>
  )
}

/* ─── Upload Node ─── */
function UploadNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>((nd._preview as string) || null)
  const [fileType, setFileType] = useState<"image" | "video">((nd._fileType as "image" | "video") || "image")
  const handleFile = (file: File) => {
    const isVideo = file.type.startsWith("video/"); const url = URL.createObjectURL(file)
    setPreview(url); setFileType(isVideo ? "video" : "image")
    updateNodeData(nodeId, { status: "done", selectedImage: isVideo ? undefined : url, selectedVideo: isVideo ? url : undefined, _preview: url, _fileType: isVideo ? "video" : "image" })
  }
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Upload" icon="⬆️" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={ImageIcon} side="right" top="40%" title="Output: Image" />
        <Handle type="source" position={Position.Right} id="selectedImage" style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)", top: "40%" }} />
        <Handle type="source" position={Position.Right} id="selectedVideo" style={{ background: getPortColor("selectedVideo"), width: 10, height: 10, border: "2px solid var(--background)", top: "70%" }} />
        <div onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }} onDragOver={e => { e.preventDefault(); e.stopPropagation() }} onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className={cn("relative w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition hover:border-blue-400/50", preview ? "border-border aspect-[4/3]" : "border-border/60 py-6")}>
          {preview ? (fileType === "video" ? <video src={preview} className="w-full h-full object-cover" muted /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Upload" className="w-full h-full object-cover" />) : (
            <div className="flex flex-col items-center justify-center gap-2"><UploadIcon className="h-6 w-6 text-muted-foreground/40" /><p className="text-[10px] text-muted-foreground text-center">Klik atau drag & drop<br/>gambar / video</p></div>
          )}
        </div>
        {preview && <button onClick={(e) => { e.stopPropagation(); setPreview(null); updateNodeData(nodeId, { status: undefined, selectedImage: undefined, selectedVideo: undefined, _preview: null }) }} className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground hover:text-foreground transition"><XIcon className="h-3 w-3" /> Hapus</button>}
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />
      </NodeShell>
    </div>
  )
}

/* ─── Image Grid Node ─── */
function ImageGridNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isProcessing, setIsProcessing] = useState(false)
  const connectedImages = useConnectedValue("images") as string[] | string | null
  const imgArr = Array.isArray(connectedImages) ? connectedImages : connectedImages ? [connectedImages] : []
  const layout = (nd.layout as string) || "2x2"
  const resultUrl = nd._gridResult as string | undefined
  const handleCompose = async () => {
    if (imgArr.length === 0) return; setIsProcessing(true); updateNodeData(nodeId, { status: "running" })
    try {
      const cols = layout === "1x4" ? 4 : layout === "3x3" ? 3 : 2
      const rows = layout === "1x4" ? 1 : layout === "3x3" ? 3 : 2
      const cellW = 512, cellH = 512, canvas = document.createElement("canvas")
      canvas.width = cellW * cols; canvas.height = cellH * rows; const ctx = canvas.getContext("2d")!
      const images = await Promise.all(imgArr.slice(0, cols * rows).map(url => new Promise<HTMLImageElement>((res, rej) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => res(img); img.onerror = () => rej(new Error("Load failed")); img.src = url })))
      images.forEach((img, i) => { ctx.drawImage(img, (i % cols) * cellW, Math.floor(i / cols) * cellH, cellW, cellH) })
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
      updateNodeData(nodeId, { status: "done", selectedImage: dataUrl, _gridResult: dataUrl })
    } catch { updateNodeData(nodeId, { status: "error" }) } finally { setIsProcessing(false) }
  }
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Image Grid" icon="⊞" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={ImageIcon} side="left" title="Input: Images" /><Handle type="target" position={Position.Left} id="images" style={{ background: getPortColor("images"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={LayoutGridIcon} side="right" title="Output: Grid" /><Handle type="source" position={Position.Right} id="selectedImage" style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="relative w-full aspect-square rounded-xl border border-border bg-muted/20 overflow-hidden mb-2">
          {resultUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={resultUrl} alt="Grid" className="w-full h-full object-cover" /> : (
            <div className="grid gap-0.5 h-full p-2" style={{ gridTemplateColumns: `repeat(${layout === "1x4" ? 4 : layout === "3x3" ? 3 : 2}, 1fr)` }}>
              {Array.from({ length: layout === "1x4" ? 4 : layout === "3x3" ? 9 : 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center overflow-hidden">
                  {imgArr[i] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={imgArr[i]} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-3 w-3 text-muted-foreground/20" />}
                </div>))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={layout} onChange={e => updateNodeData(nodeId, { layout: e.target.value })} className="flex-1 rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none"><option value="2x2">2×2 Grid</option><option value="3x3">3×3 Grid</option><option value="1x4">1×4 Strip</option></select>
          <button onClick={handleCompose} disabled={isProcessing || imgArr.length === 0} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95">{isProcessing ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <LayoutGridIcon className="h-3 w-3" />} Compose</button>
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Extract Frame Node ─── */
function ExtractFrameNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedVideo = useConnectedValue("video") as string | null
  const [timestamp, setTimestamp] = useState((nd._timestamp as number) || 0)
  const [duration, setDuration] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const frameUrl = nd._frameUrl as string | undefined
  const handleExtract = async () => {
    if (!connectedVideo) return; setIsExtracting(true); updateNodeData(nodeId, { status: "running" })
    try {
      const video = document.createElement("video"); video.crossOrigin = "anonymous"; video.src = connectedVideo
      await new Promise<void>((res, rej) => { video.onloadedmetadata = () => { setDuration(video.duration); res() }; video.onerror = () => rej(new Error("Gagal load video")) })
      video.currentTime = Math.min(timestamp, video.duration)
      await new Promise<void>(res => { video.onseeked = () => res() })
      const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL("image/png")
      updateNodeData(nodeId, { status: "done", selectedImage: dataUrl, _frameUrl: dataUrl, _timestamp: timestamp })
    } catch { updateNodeData(nodeId, { status: "error" }) } finally { setIsExtracting(false) }
  }
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Extract Frame" icon="🎞️" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={VideoIcon} side="left" title="Input: Video" /><Handle type="target" position={Position.Left} id="video" style={{ background: getPortColor("video"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={ImageIcon} side="right" title="Output: Frame" /><Handle type="source" position={Position.Right} id="selectedImage" style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="relative w-full aspect-video rounded-xl border border-border bg-muted/20 overflow-hidden mb-2">
          {frameUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={frameUrl} alt="Frame" className="w-full h-full object-cover" /> : (
            <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground/40"><ScissorsIcon className="h-6 w-6" /><p className="text-[10px]">{connectedVideo ? "Set timestamp" : "Connect video"}</p></div>)}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground w-8">{timestamp.toFixed(1)}s</span><input type="range" min={0} max={Math.max(duration, 1)} step={0.1} value={timestamp} onChange={e => setTimestamp(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" /><span className="text-[10px] text-muted-foreground/50">{duration.toFixed(1)}s</span></div>
          <button onClick={handleExtract} disabled={isExtracting || !connectedVideo} className="w-full flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95">{isExtracting ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <ScissorsIcon className="h-3 w-3" />} Extract Frame</button>
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Pose Node ─── */
function PoseNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>((nd._posePreview as string) || null)
  const connectedImage = useConnectedValue("image") as string | null
  const activeImage = preview || connectedImage
  const poses = [{ id: "standing", label: "Berdiri", prompt: "standing pose, full body" }, { id: "sitting", label: "Duduk", prompt: "sitting pose, relaxed" }, { id: "walking", label: "Berjalan", prompt: "walking pose, mid-stride" }, { id: "action", label: "Action", prompt: "dynamic action pose" }, { id: "custom", label: "Custom", prompt: "" }]
  const selectedPose = (nd.poseType as string) || "standing"
  const posePrompt = poses.find(p => p.id === selectedPose)?.prompt || ""
  const handleFile = (file: File) => { const url = URL.createObjectURL(file); setPreview(url); updateNodeData(nodeId, { status: "done", _posePreview: url, poseData: url, posePrompt }) }
  useEffect(() => { if (activeImage) updateNodeData(nodeId, { status: "done", poseData: activeImage, posePrompt })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPose, activeImage])
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Pose Control" icon="🧍" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={ImageIcon} side="left" title="Input: Image" /><Handle type="target" position={Position.Left} id="image" style={{ background: getPortColor("image"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={UserIcon} side="right" title="Output: Pose" /><Handle type="source" position={Position.Right} id="poseData" style={{ background: getPortColor("poseData"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div onClick={(e) => { e.stopPropagation(); if (!activeImage) fileRef.current?.click() }} className="relative w-full aspect-[3/4] rounded-xl border border-border bg-muted/20 overflow-hidden mb-2 cursor-pointer">
          {activeImage ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={activeImage} alt="Pose" className="w-full h-full object-cover" /> : (<div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground/40"><UserIcon className="h-8 w-8" /><p className="text-[10px]">Upload pose image</p></div>)}
        </div>
        <select value={selectedPose} onChange={e => updateNodeData(nodeId, { poseType: e.target.value })} className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none mb-1">{poses.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
        {activeImage && <button onClick={(e) => { e.stopPropagation(); setPreview(null); updateNodeData(nodeId, { status: undefined, poseData: undefined, _posePreview: null }) }} className="w-full flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground hover:text-foreground transition"><XIcon className="h-3 w-3" /> Reset</button>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />
      </NodeShell>
    </div>
  )
}

/* ─── Camera Control Node ─── */
function CameraControlNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const movements = [{ id: "pan-lr", label: "Pan Left → Right", prompt: "camera panning smoothly from left to right" }, { id: "pan-rl", label: "Pan Right → Left", prompt: "camera panning smoothly from right to left" }, { id: "dolly-in", label: "Dolly In", prompt: "camera slowly dollying in toward the subject" }, { id: "dolly-out", label: "Dolly Out", prompt: "camera slowly dollying out from the subject" }, { id: "orbit", label: "Orbit 360°", prompt: "camera orbiting 360 degrees around the subject" }, { id: "zoom-in", label: "Zoom In", prompt: "camera zooming in on the subject" }, { id: "tilt-up", label: "Tilt Up", prompt: "camera tilting upward" }, { id: "crane", label: "Crane Shot", prompt: "cinematic crane shot rising above the scene" }, { id: "static", label: "Static", prompt: "static camera, no movement" }]
  const speeds = [{ id: "slow", label: "Lambat", mod: "very slowly" }, { id: "normal", label: "Normal", mod: "" }, { id: "fast", label: "Cepat", mod: "quickly" }]
  const movement = (nd.movement as string) || "pan-lr"; const speed = (nd.speed as string) || "normal"
  const movObj = movements.find(m => m.id === movement)!; const spdObj = speeds.find(s => s.id === speed)!
  const cameraPrompt = `${movObj.prompt}${spdObj.mod ? `, ${spdObj.mod}` : ""}`
  useEffect(() => { updateNodeData(nodeId, { cameraParams: cameraPrompt, status: "done" })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movement, speed])
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Camera Control" icon="🎥" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={SlidersHorizontalIcon} side="right" title="Output: Camera Prompt" /><Handle type="source" position={Position.Right} id="cameraParams" style={{ background: getPortColor("cameraParams"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="space-y-2">
          <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Gerakan Kamera</label>
            <select value={movement} onChange={e => updateNodeData(nodeId, { movement: e.target.value })} className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none">{movements.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
          <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Kecepatan</label>
            <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">{speeds.map(s => (
              <button key={s.id} onClick={() => updateNodeData(nodeId, { speed: s.id })} className={cn("flex-1 px-2 py-1 rounded-full text-[10px] font-medium transition", speed === s.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>{s.label}</button>
            ))}</div></div>
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-2 py-1.5"><p className="text-[10px] text-muted-foreground mb-0.5">Output:</p><p className="text-[10px] text-foreground/70 italic">&quot;{cameraPrompt}&quot;</p></div>
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Voice Node ─── */
function VoiceNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>((nd._audioUrl as string) || null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream); chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: "audio/webm" }); const url = URL.createObjectURL(blob); setAudioUrl(url); updateNodeData(nodeId, { audio: url, _audioUrl: url, status: "done" }); stream.getTracks().forEach(t => t.stop()) }
      recorder.start(); mediaRef.current = recorder; setIsRecording(true); setRecordDuration(0)
      recTimerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000)
    } catch { /* mic denied */ }
  }
  const stopRecording = () => { mediaRef.current?.stop(); setIsRecording(false); if (recTimerRef.current) clearInterval(recTimerRef.current) }
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Voice" icon="🎙️" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={MicIcon} side="right" title="Output: Audio" /><Handle type="source" position={Position.Right} id="audio" style={{ background: getPortColor("audio"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="flex flex-col items-center gap-3 py-2">
          <button onClick={isRecording ? stopRecording : startRecording} className={cn("flex h-14 w-14 items-center justify-center rounded-full transition-all", isRecording ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30" : "bg-muted/50 border-2 border-border text-muted-foreground hover:text-foreground hover:border-blue-400/50")} title={isRecording ? "Stop" : "Record"}>
            {isRecording ? <div className="h-4 w-4 rounded-sm bg-white" /> : <MicIcon className="h-6 w-6" />}
          </button>
          {isRecording && <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /><span className="text-xs text-red-400 font-mono">{Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, "0")}</span></div>}
          {audioUrl && !isRecording && <audio src={audioUrl} controls className="w-full h-8" />}
          <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition"><UploadIcon className="h-3 w-3" /> Upload audio</button>
        </div>
        {audioUrl && <button onClick={() => { setAudioUrl(null); updateNodeData(nodeId, { audio: undefined, _audioUrl: null, status: undefined }) }} className="w-full flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground hover:text-foreground transition mt-1"><XIcon className="h-3 w-3" /> Reset</button>}
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setAudioUrl(url); updateNodeData(nodeId, { audio: url, _audioUrl: url, status: "done" }) }; e.target.value = "" }} />
      </NodeShell>
    </div>
  )
}

/* ─── Text-to-Speech Node ─── */
function TTSNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedPrompt = useConnectedValue("prompt") as string | null
  const [localText, setLocalText] = useState((nd._ttsText as string) || "")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const activeText = connectedPrompt || localText
  const voices = [{ id: "id-female", label: "Female — Indonesia", lang: "id-ID" }, { id: "id-male", label: "Male — Indonesia", lang: "id-ID" }, { id: "en-female", label: "Female — English", lang: "en-US" }, { id: "en-male", label: "Male — English", lang: "en-US" }]
  const selectedVoice = (nd.voice as string) || "id-female"; const voiceObj = voices.find(v => v.id === selectedVoice)!
  const handleSpeak = () => {
    if (!activeText.trim()) return; window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(activeText); u.lang = voiceObj.lang; u.rate = 1.0
    const av = window.speechSynthesis.getVoices(); const match = av.find(v => v.lang.startsWith(voiceObj.lang.split("-")[0])); if (match) u.voice = match
    u.onstart = () => setIsSpeaking(true); u.onend = () => { setIsSpeaking(false); updateNodeData(nodeId, { status: "done", audio: `tts://${selectedVoice}`, _ttsText: activeText }) }
    window.speechSynthesis.speak(u)
  }
  useEffect(() => { if (activeText.trim()) updateNodeData(nodeId, { audio: `tts://${selectedVoice}`, _ttsText: activeText })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeText, selectedVoice])
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Text to Speech" icon="🗣️" status={nd.status as string} nodeId={nodeId}>
        <HandleIcon icon={FileTextIcon} side="left" title="Input: Text" /><Handle type="target" position={Position.Left} id="prompt" style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={Volume2Icon} side="right" title="Output: Audio" /><Handle type="source" position={Position.Right} id="audio" style={{ background: getPortColor("audio"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="space-y-2">
          <select value={selectedVoice} onChange={e => updateNodeData(nodeId, { voice: e.target.value })} className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none">{voices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
          <textarea value={connectedPrompt || localText} onChange={e => { if (!connectedPrompt) { setLocalText(e.target.value); updateNodeData(nodeId, { _ttsText: e.target.value }) } }} placeholder={connectedPrompt ? "Teks dari node..." : "Ketik teks..."} readOnly={!!connectedPrompt} rows={3} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none" />
          <button onClick={isSpeaking ? () => { window.speechSynthesis.cancel(); setIsSpeaking(false) } : handleSpeak} disabled={!activeText.trim()} className={cn("w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-40", isSpeaking ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm hover:shadow-md")}>
            {isSpeaking ? <><div className="h-3 w-3 rounded-sm bg-red-400" /> Stop</> : <><Volume2Icon className="h-3.5 w-3.5" /> Play Preview</>}
          </button>
          <p className="text-[10px] text-muted-foreground/50 text-center">{activeText.length} karakter</p>
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Node Type Registry ─── */
const nodeTypes: NodeTypes = {
  promptNode: PromptNodeComponent,
  imageGenNode: ImageGenNodeComponent,
  videoGenNode: VideoGenNodeComponent,
  galleryNode: GalleryNodeComponent,
  outputNode: OutputNodeComponent,
  extendVideoNode: ExtendVideoNodeComponent,
  uploadNode: UploadNodeComponent,
  imageGridNode: ImageGridNodeComponent,
  extractFrameNode: ExtractFrameNodeComponent,
  poseNode: PoseNodeComponent,
  cameraControlNode: CameraControlNodeComponent,
  voiceNode: VoiceNodeComponent,
  ttsNode: TTSNodeComponent,
}

/* ─── Palette items (icon-based for floating toolbar) ─── */
const PALETTE_ITEMS = [
  { type: "promptNode", label: "Prompt", Icon: FileTextIcon },
  { type: "imageGenNode", label: "Image", Icon: ImageIcon },
  { type: "videoGenNode", label: "Video", Icon: VideoIcon },
  { type: "extendVideoNode", label: "Extend", Icon: RefreshCwIcon },
  { type: "uploadNode", label: "Upload", Icon: UploadIcon },
  { type: "imageGridNode", label: "Image Grid", Icon: LayoutGridIcon },
  { type: "extractFrameNode", label: "Extract Frame", Icon: ScissorsIcon },
  { type: "poseNode", label: "Pose", Icon: UserIcon },
  { type: "cameraControlNode", label: "Camera", Icon: SlidersHorizontalIcon },
  { type: "voiceNode", label: "Voice", Icon: MicIcon },
  { type: "ttsNode", label: "TTS", Icon: Volume2Icon },
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
  const [activeTool, setActiveTool] = useState<"select" | "grab">("select")
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
      videoGenNode: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "5s" },
      galleryNode: {},
      outputNode: {},
      extendVideoNode: {},
      uploadNode: {},
      imageGridNode: {},
      extractFrameNode: {},
      poseNode: {},
      cameraControlNode: {},
      voiceNode: {},
      ttsNode: {},
    }

    const newNode: Node = {
      id: `n_${Date.now()}`,
      type,
      position,
      data: defaultData[type] || {},
    }

    setNodes(nds => [...nds, newNode])
  }, [setNodes])

  // Click-to-add: place node at center of visible canvas
  const addNodeAtCenter = useCallback((type: string) => {
    const wrapper = reactFlowWrapper.current
    if (!wrapper) return

    const bounds = wrapper.getBoundingClientRect()
    const viewport = rfInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }

    // Convert screen center to flow coordinates
    const centerX = (bounds.width / 2 - viewport.x) / viewport.zoom
    const centerY = (bounds.height / 2 - viewport.y) / viewport.zoom

    // Slight random offset to prevent stacking
    const offset = Math.random() * 60 - 30

    const defaultData: Record<string, Record<string, unknown>> = {
      promptNode: { prompt: "" },
      imageGenNode: { model: "nano-banana-2", aspectRatio: "9:16", count: 1 },
      videoGenNode: { model: "veo-3.1-lite-low-priority", aspectRatio: "16:9", duration: "5s" },
      galleryNode: {},
      outputNode: {},
      extendVideoNode: {},
      uploadNode: {},
      imageGridNode: {},
      extractFrameNode: {},
      poseNode: {},
      cameraControlNode: {},
      voiceNode: {},
      ttsNode: {},
    }

    const newNode: Node = {
      id: `n_${Date.now()}`,
      type,
      position: { x: centerX - 140 + offset, y: centerY - 80 + offset },
      data: defaultData[type] || {},
    }

    setNodes(nds => [...nds, newNode])
  }, [setNodes, rfInstance])

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
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/30 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => isFullscreen ? setIsFullscreen(false) : router.push("/dashboard/workflow")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title={isFullscreen ? "Keluar Fullscreen" : "Kembali"}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{workflow?.name}</span>
            {estimatedCredits > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                <CoinsIcon className="h-3 w-3" />
                {estimatedCredits}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { /* TODO: run workflow */ }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-violet-500/10 hover:text-violet-400 transition"
              title="Run Workflow"
            >
              <PlayIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                saved ? "text-emerald-400" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={saved ? "Tersimpan" : "Simpan"}
            >
              {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2Icon className="h-4 w-4" /> : <SaveIcon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleClear}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition"
              title="Bersihkan canvas"
            >
              <Trash2Icon className="h-4 w-4" />
            </button>
            <div className="h-5 w-px bg-border/50 mx-0.5" />
            <button
              onClick={() => setIsFullscreen(f => !f)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title={isFullscreen ? "Keluar fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2Icon className="h-4 w-4" /> : <Maximize2Icon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setAgentOpen(a => !a)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                agentOpen ? "bg-violet-500/15 text-violet-400" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Workflow Agent"
            >
              {agentOpen ? <PanelRightCloseIcon className="h-4 w-4" /> : <BotIcon className="h-4 w-4" />}
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
              panOnDrag={activeTool === "grab"}
              selectionOnDrag={activeTool === "select"}
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
                    <p className="text-sm text-muted-foreground/50 mb-1">Klik icon di toolbar bawah untuk menambah node</p>
                    <p className="text-xs text-muted-foreground/30">Atau drag icon ke canvas • Hubungkan port antar node</p>
                  </div>
                </Panel>
              )}
            </ReactFlow>

            {/* ─── Floating Bottom Toolbar ─── */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-xl px-2 py-1.5">
              {/* Tool Selector */}
              <div className="flex items-center gap-0.5 rounded-xl bg-muted/50 p-0.5">
                <button
                  onClick={() => setActiveTool("select")}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    activeTool === "select" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Select (V)"
                >
                  <MousePointer2Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveTool("grab")}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    activeTool === "grab" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grab (H)"
                >
                  <HandIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-border/60 mx-0.5" />

              {/* Node Palette */}
              <div className="flex items-center gap-0.5">
                {PALETTE_ITEMS.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", item.type)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onClick={() => addNodeAtCenter(item.type)}
                    className="relative flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all active:scale-90"
                    title={item.label}
                  >
                    <item.Icon className="h-4 w-4" />
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-border/60 mx-0.5" />

              {/* Canvas dropdown */}
              <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
                <span className="text-sm">ⓟ</span>
                <span className="text-xs font-medium">Canvas</span>
                <ChevronDownIcon className="h-3 w-3" />
              </button>
            </div>
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


      </div>
    </div>
  )
}
