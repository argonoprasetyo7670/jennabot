"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Loader2Icon, CheckCircle2Icon, AlertCircleIcon, XIcon, CopyIcon, ClipboardPasteIcon, MoreHorizontalIcon } from "lucide-react"
import { NodeLoadingOverlay, getNodeLoadingLabel } from "./nodes/node-loading-overlay"


/* ─── Port Colors ─── */
export const PORT_COLORS: Record<string, string> = {
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

export function getPortColor(handle: string): string {
  return PORT_COLORS[handle] || "#8b5cf6"
}

/** Fetch a URL and convert to a File, for uploading connected reference images */
export async function urlToFile(url: string, filename = "reference.png"): Promise<File> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || "image/png" })
}

/* ─── Base Node Wrapper — Clean card design ─── */
export function NodeShell({ label, icon, status, nodeType, nodeId, children }: {
  label: string
  icon: string
  status?: string
  /** Used to pick the correct Lottie loading label */
  nodeType?: string
  nodeId?: string
  children: React.ReactNode
}) {
  const isRunning = status === "running"

  return (
    <div className={cn(
      "workflow-node relative min-w-[280px] max-w-[340px] rounded-2xl border bg-card shadow-sm transition-all",
      isRunning && "ring-2 ring-violet-400/60 shadow-violet-500/20 shadow-lg",
      status === "done" && "ring-1 ring-emerald-500/40",
      status === "error" && "ring-1 ring-red-500/40",
      !status && "border-border/60 hover:shadow-md"
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
