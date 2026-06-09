"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Loader2Icon, CheckCircle2Icon, AlertCircleIcon, XIcon, CopyIcon, ClipboardPasteIcon, MoreHorizontalIcon } from "lucide-react"
import { NodeLoadingOverlay, getNodeLoadingLabel } from "./nodes/node-loading-overlay"


/* ─── Port Colors ─── */
export const PORT_COLORS: Record<string, string> = {
  prompt: "#f472b6",
  string: "#f472b6",
  image: "#34d399",
  startImage: "#34d399",
  selectedImage: "#34d399",
  images: "#34d399",
  references: "#34d399",
  referenceImage: "#34d399",
  mediaGenerationId: "#34d399",
  video: "#06b6d4",
  selectedVideo: "#06b6d4",
  videos: "#06b6d4",
  media: "#34d399",
  audio: "#f59e0b",
  poseData: "#f59e0b",
  cameraParams: "#f59e0b",
}

export function getPortColor(handle: string): string {
  if (!handle) return "var(--border)"
  if (PORT_COLORS[handle]) return PORT_COLORS[handle]
  
  const lid = handle.toLowerCase()
  if (lid.includes("image")) return PORT_COLORS.image
  if (lid.includes("video")) return PORT_COLORS.video
  if (lid.includes("prompt")) return PORT_COLORS.prompt
  
  return "#8b5cf6"
}

/** Fetch a URL and convert to a File, for uploading connected reference images */
export async function urlToFile(url: string, filename = "reference.png"): Promise<File> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || "image/png" })
}

/* ─── Base Node Wrapper — Clean card design ─── */
export function NodeShell({ label, icon, status, nodeType, nodeId, headerActions, selected, children }: {
  label: React.ReactNode
  icon: string
  status?: string
  /** Used to pick the correct Lottie loading label */
  nodeType?: string
  nodeId?: string
  headerActions?: React.ReactNode
  selected?: boolean
  children: React.ReactNode
}) {
  const isRunning = status === "running"

  return (
    <div className={cn(
      "workflow-node relative min-w-[280px] max-w-[340px] rounded-2xl border bg-card transition-all",
      selected 
        ? "border-violet-500/80 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30" 
        : (!status ? "border-border/60 shadow-sm hover:border-border hover:shadow-md" : "shadow-sm"),
      isRunning && "ring-2 ring-violet-400/60 shadow-violet-500/20 shadow-lg border-violet-500/50",
      status === "done" && "ring-1 ring-emerald-500/40 border-emerald-500/50",
      status === "error" && "ring-1 ring-red-500/40 border-red-500/50"
    )}>
      {/* Lottie loading overlay — shown when node is running */}
      {isRunning && (
        <NodeLoadingOverlay
          label={getNodeLoadingLabel(nodeType)}
          size="md"
        />
      )}
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold text-foreground flex-1">{label}</span>
        {isRunning && <Loader2Icon className="h-3.5 w-3.5 text-violet-400 animate-spin" />}
        {status === "done" && <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-400" />}
        {status === "error" && <AlertCircleIcon className="h-3.5 w-3.5 text-red-400" />}
        {headerActions}
      </div>
      {/* Body */}
      <div className="px-3.5 pb-3 text-xs">
        {children}
      </div>
    </div>
  )
}

/* ─── Close Button (positioned top-right outside node) ─── */
export function NodeCloseBtn({ onClick }: { onClick?: () => void }) {
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
export function HandleIcon({ icon: IconComp, side, top, title }: {
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
        pointerEvents: "none",
        ...(side === "left" ? { left: -14 } : { right: -14 }),
      }}
      title={title}
    >
      <IconComp className="h-3.5 w-3.5" />
    </div>
  )
}
