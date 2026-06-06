"use client"

import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import {
  FileTextIcon, ImageIcon, VideoIcon, LayoutGridIcon, Loader2Icon, PlayIcon,
  XCircleIcon, XIcon, FolderPlusIcon, MonitorIcon, MoreHorizontalIcon, ScanEyeIcon, DownloadIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NodeShell, NodeCloseBtn, HandleIcon, getPortColor } from "../node-shell"
import { useConnectedPrompt, useConnectedValue } from "../use-connected-value"
import { useVideoGenerateNode } from "../hooks/use-video-generate-node"
import { VIDEO_ASPECT_RATIOS, DEFAULTS } from "../node-defaults"

export function VideoGenNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()

  const connectedPrompt = useConnectedPrompt()
  const connectedImage = useConnectedValue("startImage") as string | null   // display URL
  const connectedMediaId = useConnectedValue("startImage", "_selectedMediaId") as string | null // mediaGenerationId
  const connectedEmail = useConnectedValue("startImage", "_selectedEmail") as string | null
  const activePrompt = connectedPrompt || (nd._localPrompt as string) || ""

  const {
    isGenerating, error, localPrompt, elapsed, previewOpen, savingGallery,
    generatedVideoUrl, rawVideoUrl,
    setLocalPrompt, setPreviewOpen,
    handleGenerate, handleDownload, handleSaveGallery, fmtTime,
  } = useVideoGenerateNode(nodeId, nd, activePrompt, connectedImage, connectedMediaId, connectedEmail)

  return (
    <>
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Video Generate" icon="🎬" nodeType="videoGenNode" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        {/* Handles */}
        <HandleIcon icon={FileTextIcon} side="left" top="25%" title="Input: Prompt" />
        <HandleIcon icon={ImageIcon} side="left" top="45%" title="Input: Start Image" />
        <HandleIcon icon={LayoutGridIcon} side="right" top="40%" title="Output: Generated Video" />
        <Handle type="target" position={Position.Left} id="prompt" style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)", top: "25%" }} />
        <Handle type="target" position={Position.Left} id="startImage" style={{ background: getPortColor("startImage"), width: 10, height: 10, border: "2px solid var(--background)", top: "45%" }} />
        <Handle type="source" position={Position.Right} id="selectedVideo" style={{ background: getPortColor("selectedVideo"), width: 10, height: 10, border: "2px solid var(--background)", top: "40%" }} />

        {/* Preview */}
        <div
          className={cn("relative w-full aspect-video rounded-xl border bg-muted/20 overflow-hidden mb-2 cursor-pointer", generatedVideoUrl ? "border-blue-400/30" : "border-border")}
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
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse"
                  style={{ width: `${Math.min(95, elapsed * 0.8)}%`, transition: "width 1s" }} />
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

        {/* Prompt input */}
        <div className="relative">
          <input type="text"
            value={connectedPrompt || localPrompt}
            onChange={e => { if (!connectedPrompt) setLocalPrompt(e.target.value) }}
            placeholder={connectedPrompt ? "Prompt dari node..." : "Describe the video..."}
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
          <div className="flex items-center gap-1">
            <MonitorIcon className="h-3 w-3 text-muted-foreground" />
            <select
              value={(nd.aspectRatio as string) || DEFAULTS.videoAspectRatio}
              onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })}
              disabled={isGenerating}
              className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {VIDEO_ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
          <div className="h-4 w-px bg-border/50" />
          <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
            {(["5s", "8s"] as const).map(d => (
              <button key={d} onClick={() => updateNodeData(nodeId, { duration: d })}
                className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-medium transition",
                  (nd.duration as string) === d ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {d === "5s" ? "720p" : "1080p"}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-border/50" />
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
            <ScanEyeIcon className="h-3 w-3" /> Start Frame
          </button>
          <div className="h-4 w-px bg-border/50" />
          <button className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition">
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
