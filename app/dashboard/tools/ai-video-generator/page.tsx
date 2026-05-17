"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  SendIcon,
  PlusIcon,
  Loader2Icon,
  DownloadIcon,
  XIcon,
  EyeIcon,
  ImagePlusIcon,
  UploadIcon,
  ImageIcon,
  VideoIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { useGenerationQueue, CREDIT_COST_VIDEO } from "@/contexts/generation-queue"
import type { VideoAspectRatio, VideoDuration, GeneratedVideo } from "@/lib/api/google-flow"

/* ─── Constants ─── */
const MODEL_ID = "veo-3.1-fast" as const
const MODEL_NAME = "Veo 3.1 Fast"
const ASPECT_RATIOS: VideoAspectRatio[] = ["landscape", "portrait"]
const VIDEO_COUNTS = [1, 2, 3, 4]
const DURATIONS: VideoDuration[] = [4, 6, 8]

interface ReferenceImage {
  file?: File
  preview: string
  galleryUrl?: string
  fromGallery?: boolean
}

interface GalleryItem {
  id: string
  gcsUrl: string
  mediaGenerationId?: string
  prompt?: string
}

export default function AIVideoGeneratorPage() {
  const [selectedRatio, setSelectedRatio] = useState(0) // landscape
  const [selectedCount, setSelectedCount] = useState(0) // 1
  const [selectedDuration, setSelectedDuration] = useState(2) // 8s
  const [showSettings, setShowSettings] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showGalleryPicker, setShowGalleryPicker] = useState(false)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)

  const { jobs, submitVideoJob } = useGenerationQueue()

  // Track the active job
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : null
  const isGenerating = activeJob?.status === "uploading" || activeJob?.status === "generating"
  const generatedVideos = activeJob?.status === "done" ? activeJob.videos : []
  const error = activeJob?.status === "error" ? activeJob.error : null

  const creditCost = (VIDEO_COUNTS[selectedCount] || 1) * CREDIT_COST_VIDEO

  // Close settings popup on outside click
  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showSettings])

  // Close plus menu on outside click
  useEffect(() => {
    if (!showPlusMenu) return
    const handleClick = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showPlusMenu])

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return
    setShowSettings(false)

    const refs = referenceImages.map((ref) => ({
      file: ref.file,
      galleryUrl: ref.galleryUrl,
    }))

    const jobId = submitVideoJob(
      {
        prompt: prompt.trim(),
        model: MODEL_ID,
        aspectRatio: ASPECT_RATIOS[selectedRatio],
        duration: DURATIONS[selectedDuration],
        count: VIDEO_COUNTS[selectedCount],
      },
      refs.length > 0 ? refs : undefined
    )

    setActiveJobId(jobId)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxRefs = 3
    const remaining = maxRefs - referenceImages.length
    const newRefs: ReferenceImage[] = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setReferenceImages((prev) => [...prev, ...newRefs])
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowPlusMenu(false)
  }

  const removeReference = (index: number) => {
    setReferenceImages((prev) => {
      const updated = [...prev]
      if (!updated[index].fromGallery) URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  /** Download via server proxy */
  const handleDownload = async (url: string, filename: string) => {
    try {
      const proxyUrl = `/api/ai/video-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
      const res = await fetch(proxyUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, "_blank")
    }
  }

  const fetchGallery = useCallback(async () => {
    setGalleryLoading(true)
    try {
      const res = await fetch("/api/gallery")
      const data = await res.json()
      if (res.ok) setGalleryItems(data.items || [])
    } catch { /* ignore */ } finally {
      setGalleryLoading(false)
    }
  }, [])

  const openGalleryPicker = () => {
    setShowPlusMenu(false)
    setShowGalleryPicker(true)
    fetchGallery()
  }

  const selectGalleryItem = (item: GalleryItem) => {
    if (referenceImages.length >= 3) return
    setReferenceImages((prev) => [
      ...prev,
      { preview: item.gcsUrl, galleryUrl: item.gcsUrl, fromGallery: true },
    ])
    setShowGalleryPicker(false)
  }

  const isEmpty = generatedVideos.length === 0 && !isGenerating

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Tools", href: "/dashboard" },
        { label: "AI Video Generator" },
      ]} />

      {/* ── Main Canvas ── */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 pb-40">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2 animate-fade-up">
            <div className="relative">
              <LottieLoading size={140} />
              <div className="absolute -inset-4 rounded-full bg-violet-500/8 blur-2xl -z-10 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/70">
                {activeJob?.progress || "Sedang membuat video..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Menggunakan {MODEL_NAME} • 60-180 detik</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 animate-fade-up">
            <div className="text-muted-foreground/30">
              <VideoIcon className="h-16 w-16" strokeWidth={1} />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Mulai membuat video AI</p>
          </div>
        ) : (
          <div className="w-full max-w-5xl grid gap-4 p-4" style={{
            gridTemplateColumns: generatedVideos.length === 1 ? "1fr" : "repeat(2, 1fr)",
          }}>
            {generatedVideos.map((vid, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-muted/30 animate-fade-up">
                <div className="relative aspect-video cursor-pointer" onClick={() => setPreviewVideo(vid)}>
                  <video
                    src={vid.url}
                    className="w-full h-full object-contain bg-background"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    {vid.seed !== undefined ? `Seed: ${vid.seed}` : `Video ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPreviewVideo(vid)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Preview">
                      <EyeIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                    <button onClick={() => handleDownload(vid.url, `generated-video-${i + 1}.mp4`)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Download">
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button onClick={() => alert("Video akan disimpan ke Gallery (coming soon)")} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Simpan ke Gallery">
                      <ImagePlusIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Gallery</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-md">
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
              <span className="flex-1">{error}</span>
              <button onClick={() => setActiveJobId(null)} className="shrink-0 text-red-400/60 hover:text-red-400">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Prompt Bar ── */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="flex justify-center pb-2">
          <span className="text-[11px] text-muted-foreground">
            Pembuatan akan menggunakan <span className="text-foreground/60 underline underline-offset-2">{creditCost} poin</span>
          </span>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-4">
          {referenceImages.length > 0 && (
            <div className="flex gap-2 mb-2 px-1 overflow-x-auto pb-1">
              {referenceImages.map((ref, i) => (
                <div key={i} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                  <Image src={ref.preview} alt={`Ref ${i + 1}`} fill className="object-cover" unoptimized />
                  <button onClick={() => removeReference(i)} className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[8px] shadow-sm">
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                  {ref.fromGallery && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-center">
                      <span className="text-[7px] text-white/70">Gallery</span>
                    </div>
                  )}
                </div>
              ))}
              {referenceImages.length < 3 && (
                <button onClick={() => setShowPlusMenu(true)} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40 transition hover:border-border hover:text-muted-foreground">
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/95 p-2 pl-3 backdrop-blur-xl shadow-2xl">
            <div className="relative" ref={plusMenuRef}>
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                <PlusIcon className="h-5 w-5" />
              </button>
              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                  <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <UploadIcon className="h-4 w-4" />
                    <span>Upload dari device</span>
                  </button>
                  <button onClick={openGalleryPicker} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>Pilih dari Gallery</span>
                  </button>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleFileUpload} />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Deskripsikan video yang ingin Anda buat..."
              rows={1}
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              style={{ lineHeight: "1.5" }}
            />

            <div className="mb-1 flex shrink-0 items-center gap-1.5">
              <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className="hidden sm:flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1.5 text-[10px] text-muted-foreground cursor-pointer transition-all hover:bg-muted">
                  <span>⚡</span>
                  <span className="font-medium">{MODEL_NAME}</span>
                  <span className="ml-0.5 rounded bg-muted px-1 py-0.5 text-[9px]">{DURATIONS[selectedDuration]}s</span>
                </button>

                {showSettings && (
                  <div ref={settingsRef} className="absolute bottom-full right-0 mb-2 w-[320px] z-50">
                    <div className="rounded-2xl border border-border bg-card/95 p-3 backdrop-blur-xl shadow-2xl">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Rasio Aspek</p>
                      <div className="flex gap-1.5 mb-3">
                        {ASPECT_RATIOS.map((ratio, i) => (
                          <button key={ratio} onClick={() => setSelectedRatio(i)} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2 text-[10px] font-medium transition-all", selectedRatio === i ? "border-border bg-muted text-foreground" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            <span className="block rounded-[2px] border border-current opacity-60" style={{ width: ratio === "landscape" ? 18 : 10, height: ratio === "landscape" ? 10 : 18 }} />
                            <span className="capitalize">{ratio}</span>
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Durasi Video</p>
                      <div className="flex gap-1.5 mb-3">
                        {DURATIONS.map((dur, i) => (
                          <button key={dur} onClick={() => setSelectedDuration(i)} className={cn("flex flex-1 items-center justify-center rounded-lg border py-2 text-xs font-medium transition-all", selectedDuration === i ? "border-border bg-muted text-foreground" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            {dur}s
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Jumlah Video</p>
                      <div className="flex gap-1.5 mb-3">
                        {VIDEO_COUNTS.map((count, i) => (
                          <button key={count} onClick={() => setSelectedCount(i)} className={cn("flex flex-1 items-center justify-center rounded-lg border py-2 text-xs font-medium transition-all", selectedCount === i ? "border-border bg-muted text-foreground" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            x{count}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Model</p>
                      <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2.5 text-xs font-medium text-foreground/70">
                        <span>⚡</span>
                        <span>{MODEL_NAME}</span>
                        <span className="ml-auto text-[9px] text-muted-foreground/50">{CREDIT_COST_VIDEO} credits/video</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-all", prompt.trim() && !isGenerating ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40" : "bg-muted text-muted-foreground/40 cursor-not-allowed")}>
                {isGenerating ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview Dialog ── */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <video
              src={previewVideo.url}
              className="max-h-[80vh] w-full rounded-2xl object-contain bg-muted/30"
              controls
              autoPlay
              playsInline
            />
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => handleDownload(previewVideo.url, "generated-video.mp4")} className="flex h-10 items-center gap-2 rounded-xl bg-muted/80 px-4 text-sm text-foreground backdrop-blur-sm transition hover:bg-muted border border-border">
                <DownloadIcon className="h-4 w-4" /> Download
              </button>
              <button onClick={() => setPreviewVideo(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/80 text-foreground backdrop-blur-sm transition hover:bg-muted border border-border">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Picker Dialog ── */}
      {showGalleryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowGalleryPicker(false)}>
          <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-border bg-card p-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Pilih dari Gallery</h3>
              <button onClick={() => setShowGalleryPicker(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {galleryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            ) : galleryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada gambar di gallery</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[60vh] pr-1">
                {galleryItems.map((item) => (
                  <button key={item.id} onClick={() => selectGalleryItem(item)} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/30 transition hover:border-violet-500/50 hover:ring-2 hover:ring-violet-500/20">
                    <Image src={item.gcsUrl} alt={item.prompt || "Gallery"} fill className="object-cover" unoptimized />
                    {item.prompt && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                        <p className="text-[9px] text-white/70 line-clamp-2">{item.prompt}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
