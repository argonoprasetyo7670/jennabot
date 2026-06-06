"use client"

import { useRef } from "react"
import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import {
  FileTextIcon, ImageIcon, LayoutGridIcon, Loader2Icon, PlayIcon,
  XCircleIcon, XIcon, UploadIcon, CheckCircle2Icon, DownloadIcon,
  FolderPlusIcon, MonitorIcon, MoreHorizontalIcon, HashIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NodeShell, NodeCloseBtn, HandleIcon, getPortColor } from "../node-shell"
import { useConnectedPrompt, useAllConnectedValues } from "../use-connected-value"
import { useImageGenerateNode } from "../hooks/use-image-generate-node"
import { IMAGE_MODELS, IMAGE_ASPECT_RATIOS, DEFAULTS } from "../node-defaults"

export function ImageGenNodeComponent({ data, id: nodeId }: NodeProps) {
  const nodeData = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const refInputRef = useRef<HTMLInputElement>(null!)

  const connectedPrompt = useConnectedPrompt()

  // Collect ALL reference connections (model + background + product upload nodes)
  const allRefMediaIds = useAllConnectedValues("references", "mediaGenerationId")
  const allRefEmails = useAllConnectedValues("references", "_uploadEmail")

  // Flatten to arrays — filter out null/empty values
  const connectedRefIds = allRefMediaIds
    .map(r => r.value as string)
    .filter(Boolean)
  const connectedRefEmail = (allRefEmails.find(r => r.value)?.value as string) || null

  const activePrompt = connectedPrompt || (nodeData._localPrompt as string) || ""

  const {
    isGenerating, error, localPrompt, refImages, previewIdx, savingGallery,
    generatedImages, selectedIdx,
    setLocalPrompt, setPreviewIdx,
    handleGenerate, handleSelect, handleDownload, handleSaveToGallery,
    handleUploadRef, handleRemoveRef,
  } = useImageGenerateNode(nodeId, nodeData, activePrompt, connectedRefIds, connectedRefEmail)

  const previewImage = previewIdx !== null ? generatedImages[previewIdx] : null

  // Map aspect ratio string → Tailwind aspect class
  const ar = (nodeData.aspectRatio as string) || DEFAULTS.imageAspectRatio
  const arClass: Record<string, string> = {
    "1:1":  "aspect-square",
    "4:3":  "aspect-[4/3]",
    "3:4":  "aspect-[3/4]",
    "16:9": "aspect-video",
    "9:16": "aspect-[9/16]",
  }
  const previewAspect = arClass[ar] || "aspect-[9/16]"

  return (
    <>
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Image Generate" icon="🖼️" nodeType="imageGenNode" status={(nodeData._runStatus || nodeData.status) as string} nodeId={nodeId}>
        {/* Handles */}
        <HandleIcon icon={FileTextIcon} side="left" top="30%" title="Input: Prompt" />
        <HandleIcon icon={ImageIcon} side="left" top="55%" title="Input: Reference Images" />
        <HandleIcon icon={LayoutGridIcon} side="right" top="40%" title="Output: Generated Image" />
        <Handle type="target" position={Position.Left} id="prompt" style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)", top: "30%" }} />
        <Handle type="target" position={Position.Left} id="references" style={{ background: getPortColor("references"), width: 10, height: 10, border: "2px solid var(--background)", top: "55%" }} />
        <Handle type="source" position={Position.Right} id="selectedImage" style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)", top: "40%" }} />

        {/* Preview */}
        <div
          className={cn("relative w-full rounded-xl border bg-muted/20 overflow-hidden mb-2 cursor-pointer", previewAspect, generatedImages.length > 0 ? "border-blue-400/30" : "border-border")}
          onClick={() => generatedImages.length > 0 && setPreviewIdx(selectedIdx)}
        >
          {generatedImages.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImages[selectedIdx]?.url} alt="Generated" className="w-full h-full object-cover" />
              {generatedImages.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
                  {generatedImages.map((_, idx) => (
                    <button key={idx} onClick={e => { e.stopPropagation(); handleSelect(idx) }}
                      className={cn("h-1.5 rounded-full transition-all", idx === selectedIdx ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80")} />
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
              <span className="text-[10px] text-muted-foreground/30">{ar}</span>
            </div>
          )}
        </div>

        {/* Reference images */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              Ref Image {refImages.length > 0 && `(${refImages.length})`}
            </span>
            <button
              onClick={e => { e.stopPropagation(); e.preventDefault(); refInputRef.current?.click() }}
              disabled={isGenerating || refImages.length >= 10}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition disabled:opacity-30"
            >
              <UploadIcon className="h-3 w-3" /> Tambah
            </button>
          </div>
          {refImages.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {refImages.map((ref, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.preview} alt={`Ref ${idx + 1}`} className={cn("h-10 w-10 rounded-lg object-cover border", ref.uploading ? "border-amber-400/50 opacity-60" : ref.error ? "border-red-400/50" : "border-border")} />
                  {ref.uploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2Icon className="h-3 w-3 text-amber-400 animate-spin" /></div>}
                  {ref.error && <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg"><XCircleIcon className="h-3 w-3 text-red-400" /></div>}
                  <button onClick={e => { e.stopPropagation(); handleRemoveRef(idx) }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground shadow-sm">
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); e.preventDefault(); refInputRef.current?.click() }} disabled={isGenerating}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 py-2 text-[10px] text-muted-foreground/60 hover:text-muted-foreground hover:border-border transition disabled:opacity-30">
              <ImageIcon className="h-3.5 w-3.5" /> Klik untuk upload referensi
            </button>
          )}
          <input
            ref={refInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
            onChange={async e => { if (e.target.files) { await handleUploadRef(e.target.files); e.target.value = "" } }}
          />
        </div>

        {/* Prompt input */}
        <div className="relative">
          <input type="text"
            value={connectedPrompt || localPrompt}
            onChange={e => { if (!connectedPrompt) setLocalPrompt(e.target.value) }}
            placeholder={connectedPrompt ? "Prompt dari node..." : "Describe the image..."}
            disabled={isGenerating} readOnly={!!connectedPrompt}
            className="w-full rounded-xl border border-border bg-muted/20 pl-3 pr-9 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:opacity-50" />
          <button onClick={handleGenerate} disabled={isGenerating}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-30">
            {isGenerating ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PlayIcon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5 mt-1.5">
            <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400 leading-tight">{error}</p>
          </div>
        )}
      </NodeShell>

      {/* Settings bar */}
      <div className="flex items-center justify-center mt-1.5">
        <div className="flex items-center gap-2 rounded-full bg-card border border-border/50 shadow-sm px-3 py-1.5">
          <select
            value={(nodeData.model as string) || DEFAULTS.imageModel}
            onChange={e => updateNodeData(nodeId, { model: e.target.value })}
            disabled={isGenerating}
            className="bg-transparent text-xs font-medium text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {IMAGE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <div className="h-4 w-px bg-border/50" />
          <div className="flex items-center gap-1">
            <MonitorIcon className="h-3 w-3 text-muted-foreground" />
            <select
              value={(nodeData.aspectRatio as string) || DEFAULTS.imageAspectRatio}
              onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })}
              disabled={isGenerating}
              className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {IMAGE_ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
          <div className="h-4 w-px bg-border/50" />
          <div className="flex items-center gap-1">
            <HashIcon className="h-3 w-3 text-muted-foreground" />
            <select
              value={(nodeData.count as number) || DEFAULTS.imageCount}
              onChange={e => updateNodeData(nodeId, { count: Number(e.target.value) })}
              disabled={isGenerating}
              className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              <option value={1}>×1</option><option value={2}>×2</option><option value={4}>×4</option>
            </select>
          </div>
          <div className="h-4 w-px bg-border/50" />
          <button className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition">
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
