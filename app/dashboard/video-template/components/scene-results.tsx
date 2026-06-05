"use client"

/**
 * SceneResults — Right column: per-scene results with image/video preview,
 * regenerate actions, prompt editing, download, and save to gallery.
 */

import { useState } from "react"
import Image from "next/image"
import {
  Loader2Icon, RefreshCwIcon, DownloadIcon, BookmarkIcon, CheckIcon,
  ImageIcon, PlayIcon, XIcon, AlertCircleIcon, EditIcon, VideoIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { downloadImage, downloadVideo } from "@/lib/download"
import type { SceneResult } from "../types"

interface SceneResultsProps {
  results: SceneResult[]
  isGenerating: boolean
  onRegenerateScene: (index: number) => void
  onRegenerateVideoOnly: (index: number) => void
  onUpdateResult: (index: number, updates: Partial<SceneResult>) => void
  onReset: () => void
}

export function SceneResults({
  results, isGenerating,
  onRegenerateScene, onRegenerateVideoOnly,
  onUpdateResult, onReset,
}: SceneResultsProps) {
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string } | null>(null)
  const [savingStates, setSavingStates] = useState<Record<string, "idle" | "saving" | "saved">>({})

  const hasAnyResult = results.some((r) => r.image || r.video || r.status !== "pending")

  if (!hasAnyResult) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <VideoIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground/50">Hasil generate akan muncul di sini</p>
        </div>
      </div>
    )
  }

  const handleSaveToGallery = async (key: string, url: string, type: "image" | "video", prompt?: string) => {
    setSavingStates((p) => ({ ...p, [key]: "saving" }))
    try {
      await fetch("/api/gallery/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url, type, prompt,
          model: type === "image" ? "nano-banana-2" : "veo-3.1-lite-low-priority",
          aspectRatio: "9:16",
          sourceAction: "video-template",
        }),
      })
      setSavingStates((p) => ({ ...p, [key]: "saved" }))
    } catch {
      setSavingStates((p) => ({ ...p, [key]: "idle" }))
    }
  }

  const handleDownload = async (url: string, filename: string, type: "image" | "video") => {
    try {
      if (type === "video") await downloadVideo(url, filename)
      else await downloadImage(url, filename)
    } catch { window.open(url, "_blank") }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Hasil Generate</h3>
        {hasAnyResult && !isGenerating && (
          <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground transition">
            Reset
          </button>
        )}
      </div>

      {results.map((scene, i) => {
        const imgSaveKey = `img-${i}`
        const vidSaveKey = `vid-${i}`
        const imgSaveState = savingStates[imgSaveKey] || "idle"
        const vidSaveState = savingStates[vidSaveKey] || "idle"

        return (
          <div key={i} className={cn(
            "rounded-xl border p-3 transition-all",
            scene.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5"
              : scene.status === "failed" ? "border-red-500/30 bg-red-500/5"
              : scene.status === "generating-image" || scene.status === "generating-video" ? "border-violet-500/30 bg-violet-500/5"
              : "border-border/50 bg-card/20"
          )}>
            {/* Scene Header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground/60">
                  {scene.scene}
                </span>
                <span className="text-xs font-medium text-foreground/80">{scene.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {scene.status === "generating-image" && (
                  <span className="flex items-center gap-1 text-[10px] text-violet-400">
                    <Loader2Icon className="h-3 w-3 animate-spin" /> Gambar...
                  </span>
                )}
                {scene.status === "generating-video" && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400">
                    <Loader2Icon className="h-3 w-3 animate-spin" /> Video...
                  </span>
                )}
                {scene.status === "completed" && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckIcon className="h-3 w-3" /> Selesai
                  </span>
                )}
                {scene.status === "failed" && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400">
                    <AlertCircleIcon className="h-3 w-3" /> Gagal
                  </span>
                )}
              </div>
            </div>

            {/* Dialogue */}
            <p className="mb-2 text-[10px] italic text-muted-foreground/60 line-clamp-1">
              &quot;{scene.dialogue}&quot;
            </p>

            {/* Error */}
            {scene.error && (
              <div className="mb-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-[10px] text-red-400">
                {scene.error}
              </div>
            )}

            {/* Image + Video Preview */}
            {(scene.image || scene.video) && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                {/* Image */}
                {scene.image && (
                  <div className="space-y-1">
                    <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border/30">
                      <Image src={scene.image.fifeUrl} alt={`Scene ${scene.scene} image`} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex justify-center gap-0.5">
                      <button onClick={() => handleDownload(scene.image!.fifeUrl, `scene-${scene.scene}-image.jpg`, "image")}
                        className="rounded p-1 text-muted-foreground/50 hover:text-foreground transition" title="Download">
                        <DownloadIcon className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleSaveToGallery(imgSaveKey, scene.image!.fifeUrl, "image", scene.imagePrompt)}
                        disabled={imgSaveState !== "idle"}
                        className={cn("rounded p-1 transition", imgSaveState === "saved" ? "text-emerald-400" : "text-muted-foreground/50 hover:text-foreground")}
                        title="Save to Gallery">
                        {imgSaveState === "saved" ? <CheckIcon className="h-3 w-3" /> : imgSaveState === "saving" ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <BookmarkIcon className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Video */}
                {scene.video && (
                  <div className="space-y-1">
                    <div className="relative aspect-[9/16] cursor-pointer overflow-hidden rounded-lg border border-border/30"
                      onClick={() => setPreviewVideo({ url: scene.video!.fifeUrl, name: `Scene ${scene.scene}` })}>
                      <video src={scene.video.fifeUrl} className="h-full w-full object-cover" muted loop autoPlay playsInline crossOrigin="anonymous" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition">
                        <PlayIcon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex justify-center gap-0.5">
                      <button onClick={() => handleDownload(scene.video!.rawUrl || scene.video!.fifeUrl, `scene-${scene.scene}-video.mp4`, "video")}
                        className="rounded p-1 text-muted-foreground/50 hover:text-foreground transition" title="Download">
                        <DownloadIcon className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleSaveToGallery(vidSaveKey, scene.video!.fifeUrl, "video", scene.videoPrompt)}
                        disabled={vidSaveState !== "idle"}
                        className={cn("rounded p-1 transition", vidSaveState === "saved" ? "text-emerald-400" : "text-muted-foreground/50 hover:text-foreground")}
                        title="Save to Gallery">
                        {vidSaveState === "saved" ? <CheckIcon className="h-3 w-3" /> : vidSaveState === "saving" ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <BookmarkIcon className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Regenerate Actions */}
            {(scene.status === "completed" || scene.status === "failed") && !isGenerating && (
              <div className="flex gap-1">
                <button onClick={() => onRegenerateScene(i)}
                  className="flex items-center gap-1 rounded-lg border border-border/30 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition">
                  <RefreshCwIcon className="h-2.5 w-2.5" /> Semua
                </button>
                {scene.image && (
                  <button onClick={() => onRegenerateVideoOnly(i)}
                    className="flex items-center gap-1 rounded-lg border border-border/30 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition">
                    <RefreshCwIcon className="h-2.5 w-2.5" /> Video
                  </button>
                )}
                <button onClick={() => onUpdateResult(i, { isEditing: !scene.isEditing })}
                  className="flex items-center gap-1 rounded-lg border border-border/30 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition">
                  <EditIcon className="h-2.5 w-2.5" /> Prompt
                </button>
              </div>
            )}

            {/* Prompt Editor */}
            {scene.isEditing && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-[9px] font-medium text-muted-foreground">Image Prompt</label>
                  <textarea
                    value={scene.imagePrompt || ""}
                    onChange={(e) => onUpdateResult(i, { imagePrompt: e.target.value })}
                    rows={3}
                    className="mt-0.5 w-full resize-none rounded-lg border border-border/30 bg-background/50 px-2 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-medium text-muted-foreground">Video Prompt (JSON)</label>
                  <textarea
                    value={scene.videoPrompt || ""}
                    onChange={(e) => onUpdateResult(i, { videoPrompt: e.target.value })}
                    rows={3}
                    className="mt-0.5 w-full resize-none rounded-lg border border-border/30 bg-background/50 px-2 py-1.5 text-[10px] text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setPreviewVideo(null)}>
          <button onClick={() => setPreviewVideo(null)} className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition">
            <XIcon className="h-5 w-5" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <video src={previewVideo.url} className="max-h-[80vh] w-full rounded-2xl object-contain" controls autoPlay playsInline crossOrigin="anonymous" />
            <p className="mt-2 text-center text-sm text-white/60">{previewVideo.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}
