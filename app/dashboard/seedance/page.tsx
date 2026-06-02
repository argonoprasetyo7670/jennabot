"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  SendIcon, PlusIcon, ChevronDownIcon, Loader2Icon, DownloadIcon,
  XIcon, EyeIcon, ImagePlusIcon, UploadIcon, ImageIcon, VideoIcon,
  Settings2Icon, FilmIcon, PlayIcon, BookmarkIcon, CheckIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { useGenerationQueue, CREDIT_COST_RUNWAY, type GenerationJob } from "@/contexts/generation-queue"
import { downloadVideo } from "@/lib/download"
import {
  uploadRunwayAsset, generateRunwayVideo,
  type RunwayGeneratedVideo,
} from "@/lib/api/runway-flow"

/* ─── Constants ─── */
const MODEL_ID = "seedance-2" as const
const MODEL_NAME = "Seedance 2.0"
const MAX_IMAGE_REFS = 11
const MAX_VIDEO_REFS = 3

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"] as const
const RESOLUTIONS = ["480p", "720p", "1080p"] as const

interface ReferenceFile {
  file: File
  preview: string
  type: "image" | "video"
}

interface GalleryItem {
  id: string
  gcsUrl: string
  mediaGenerationId?: string
  prompt?: string
}

export default function SeedancePage() {
  const [prompt, setPrompt] = useState("")
  const [duration, setDuration] = useState(5)
  const [selectedRatio, setSelectedRatio] = useState(0) // 16:9
  const [selectedRes, setSelectedRes] = useState(1) // 720p
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<RunwayGeneratedVideo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewVideo, setPreviewVideo] = useState<RunwayGeneratedVideo | null>(null)
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)

  const { addCustomJob, updateJob } = useGenerationQueue()

  const imageCount = referenceFiles.filter((r) => r.type === "image").length
  const videoCount = referenceFiles.filter((r) => r.type === "video").length

  // Close popups on outside click
  useEffect(() => {
    if (!showSettings && !showPlusMenu) return
    const handleClick = (e: MouseEvent) => {
      if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false)
      if (showPlusMenu && plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setShowPlusMenu(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showSettings, showPlusMenu])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = MAX_IMAGE_REFS - imageCount
    const newRefs: ReferenceFile[] = files.slice(0, remaining).map((file) => ({
      file, preview: URL.createObjectURL(file), type: "image",
    }))
    setReferenceFiles((prev) => [...prev, ...newRefs])
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowPlusMenu(false)
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = MAX_VIDEO_REFS - videoCount
    const newRefs: ReferenceFile[] = files.slice(0, remaining).map((file) => ({
      file, preview: URL.createObjectURL(file), type: "video",
    }))
    setReferenceFiles((prev) => [...prev, ...newRefs])
    if (videoInputRef.current) videoInputRef.current.value = ""
    setShowPlusMenu(false)
  }

  const removeReference = (index: number) => {
    setReferenceFiles((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleGenerate = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setError(null)
    setGeneratedVideos([])
    setShowSettings(false)

    const jobId = `seedance-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    try {
      // Add to queue for bell notification
      const queueJob: GenerationJob = {
        id: jobId, type: "video", prompt: prompt || "Seedance 2.0",
        model: MODEL_NAME, status: "uploading", progress: "Memulai...",
        images: [], videos: [], createdAt: new Date(),
        params: { prompt: prompt || "Seedance 2.0" },
      }
      addCustomJob(queueJob)

      // Step 1: Upload references
      const imageAssetIds: string[] = []
      const videoAssetIds: string[] = []

      if (referenceFiles.length > 0) {
        setPhase("Mengupload referensi...")
        updateJob(jobId, { status: "uploading", progress: "Mengupload referensi..." })

        for (let i = 0; i < referenceFiles.length; i++) {
          const ref = referenceFiles[i]
          setPhase(`Mengupload ${ref.type === "image" ? "gambar" : "video"} ${i + 1}/${referenceFiles.length}...`)
          updateJob(jobId, { progress: `Mengupload ${i + 1}/${referenceFiles.length}...` })

          const result = await uploadRunwayAsset(ref.file)
          if (ref.type === "image") {
            imageAssetIds.push(result.assetId)
          } else {
            videoAssetIds.push(result.assetId)
          }
        }
      }

      // Step 2: Generate video
      setPhase("Membuat video dengan Seedance 2.0...")
      updateJob(jobId, { status: "generating", progress: "Membuat video dengan Seedance 2.0..." })

      const result = await generateRunwayVideo({
        model: MODEL_ID,
        text_prompt: prompt || undefined,
        duration,
        aspect_ratio: ASPECT_RATIOS[selectedRatio],
        resolution: RESOLUTIONS[selectedRes],
        audio: audioEnabled,
        imageAssetIds: imageAssetIds.length > 0 ? imageAssetIds : undefined,
        videoAssetId: videoAssetIds[0],
        videoAssetId2: videoAssetIds[1],
        videoAssetId3: videoAssetIds[2],
        feature: "seedance-2",
      })

      setGeneratedVideos(result.videos)
      setPhase("")
      updateJob(jobId, {
        status: "done", progress: undefined,
        videos: result.videos.map((v) => ({ url: v.url, rawUrl: v.url })),
        creditsDeducted: CREDIT_COST_RUNWAY, completedAt: new Date(),
      })
      window.dispatchEvent(new CustomEvent("credits-updated"))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed"
      setError(msg)
      setPhase("")
      updateJob(jobId, {
        status: "error", progress: undefined,
        error: msg, completedAt: new Date(),
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try { await downloadVideo(url, filename) }
    catch { window.open(url, "_blank") }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate() }
  }

  const isEmpty = generatedVideos.length === 0 && !isGenerating

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Video Tools", href: "/dashboard" },
        { label: "Seedance 2.0" },
      ]} />

      {/* Main Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 pb-40">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2 animate-fade-up">
            <div className="relative">
              <LottieLoading size={140} />
              <div className="absolute -inset-4 rounded-full bg-orange-500/8 blur-2xl -z-10 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/70">{phase || "Sedang membuat video..."}</p>
              <p className="text-xs text-muted-foreground mt-1">Menggunakan {MODEL_NAME} • Hingga 10 menit</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 animate-fade-up">
            <div className="text-muted-foreground/30">
              <FilmIcon className="h-16 w-16" strokeWidth={1} />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Buat video dengan Seedance 2.0</p>
            <p className="text-xs text-muted-foreground/60 max-w-sm text-center">
              Mendukung multi-reference: hingga 11 gambar + 3 video. Gunakan @IMG_1..@IMG_11 dan @VID_1..@VID_3 di prompt.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-5xl grid gap-4 p-4" style={{
            gridTemplateColumns: generatedVideos.length === 1 ? "1fr" : "repeat(2, 1fr)",
          }}>
            {generatedVideos.map((vid, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-muted/30 animate-fade-up">
                <div className="relative aspect-video cursor-pointer" onClick={() => setPreviewVideo(vid)}>
                  <video src={vid.url} className="w-full h-full object-contain bg-background" muted loop autoPlay playsInline />
                </div>
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">Video {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPreviewVideo(vid)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Preview">
                      <EyeIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Preview</span>
                    </button>
                    <button onClick={() => handleDownload(vid.url, `seedance-video-${i + 1}.mp4`)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Download">
                      <DownloadIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (savedVideos.has(vid.url)) return
                        try {
                          const res = await fetch("/api/gallery/save", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: vid.url, type: "video", prompt, model: MODEL_ID, aspectRatio: ASPECT_RATIOS[selectedRatio], sourceAction: "seedance-2" }),
                          })
                          if (res.ok) setSavedVideos((prev) => new Set(prev).add(vid.url))
                        } catch { /* ignore */ }
                      }}
                      disabled={savedVideos.has(vid.url)}
                      className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition hover:bg-muted",
                        savedVideos.has(vid.url) ? "text-emerald-500" : "text-muted-foreground hover:text-foreground")}
                      title="Simpan ke Gallery"
                    >
                      {savedVideos.has(vid.url) ? <><CheckIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tersimpan ✓</span></> : <><BookmarkIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Gallery</span></>}
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
              <button onClick={() => setError(null)} className="shrink-0 text-red-400/60 hover:text-red-400"><XIcon className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Prompt Bar */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="flex justify-center pb-2">
          <span className="text-[11px] text-muted-foreground">
            Pembuatan akan menggunakan <span className="text-foreground/60 underline underline-offset-2">{CREDIT_COST_RUNWAY} poin</span>
          </span>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-4">
          {/* Reference thumbnails */}
          {referenceFiles.length > 0 && (
            <div className="flex gap-2 mb-2 px-1 overflow-x-auto pb-1">
              {referenceFiles.map((ref, i) => (
                <div key={i} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                  {ref.type === "image" ? (
                    <Image src={ref.preview} alt={`Ref ${i + 1}`} fill className="object-cover" unoptimized />
                  ) : (
                    <video src={ref.preview} className="h-full w-full object-cover" muted />
                  )}
                  <button onClick={() => removeReference(i)} className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[8px] shadow-sm">
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-center">
                    <span className="text-[7px] text-white/70">{ref.type === "image" ? `@IMG_${referenceFiles.filter((r, j) => j <= i && r.type === "image").length}` : `@VID_${referenceFiles.filter((r, j) => j <= i && r.type === "video").length}`}</span>
                  </div>
                </div>
              ))}
              {(imageCount < MAX_IMAGE_REFS || videoCount < MAX_VIDEO_REFS) && (
                <button onClick={() => setShowPlusMenu(true)} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40 transition hover:border-border hover:text-muted-foreground">
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/95 p-2 pl-3 backdrop-blur-xl shadow-2xl">
            {/* Plus menu */}
            <div className="relative" ref={plusMenuRef}>
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                <PlusIcon className="h-5 w-5" />
              </button>
              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                  <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false) }}
                    disabled={imageCount >= MAX_IMAGE_REFS}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40">
                    <ImageIcon className="h-4 w-4" />
                    <span>Upload Gambar ({imageCount}/{MAX_IMAGE_REFS})</span>
                  </button>
                  <button onClick={() => { videoInputRef.current?.click(); setShowPlusMenu(false) }}
                    disabled={videoCount >= MAX_VIDEO_REFS}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40">
                    <VideoIcon className="h-4 w-4" />
                    <span>Upload Video ({videoCount}/{MAX_VIDEO_REFS})</span>
                  </button>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={handleImageUpload} />
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={handleVideoUpload} />

            <textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Deskripsikan video... Gunakan @IMG_1, @VID_1 untuk referensi"
              rows={1}
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              style={{ lineHeight: "1.5" }}
            />

            <div className="mb-1 flex shrink-0 items-center gap-1.5">
              {/* Settings */}
              <div className="relative" ref={settingsRef}>
                <button onClick={() => setShowSettings(!showSettings)} className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground cursor-pointer transition-all hover:bg-muted">
                  <Settings2Icon className="h-4 w-4" />
                </button>
                <button onClick={() => setShowSettings(!showSettings)} className="hidden sm:flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1.5 text-[10px] text-muted-foreground cursor-pointer transition-all hover:bg-muted">
                  <span>🎬</span>
                  <span className="font-medium">{MODEL_NAME}</span>
                  <span className="ml-0.5 rounded bg-muted px-1 py-0.5 text-[9px]">{duration}s</span>
                  <ChevronDownIcon className={cn("h-3 w-3 transition-transform", showSettings && "rotate-180")} />
                </button>

                {/* Mobile settings */}
                {showSettings && (
                  <div className="sm:hidden fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
                    <div className="w-full rounded-t-2xl border-t border-border bg-card p-4 pb-6 shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
                      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Durasi ({duration} detik)</p>
                      <input type="range" min={4} max={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full mb-3 accent-orange-500" />

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Rasio Aspek</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {ASPECT_RATIOS.map((ratio, i) => (
                          <button key={ratio} onClick={() => setSelectedRatio(i)} className={cn("rounded-lg border px-3 py-2 text-[10px] font-medium transition-all", selectedRatio === i ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            {ratio}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Resolusi</p>
                      <div className="flex gap-1.5 mb-3">
                        {RESOLUTIONS.map((res, i) => (
                          <button key={res} onClick={() => setSelectedRes(i)} className={cn("flex flex-1 items-center justify-center rounded-lg border py-2.5 text-xs font-medium transition-all", selectedRes === i ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            {res}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Audio</p>
                      <button onClick={() => setAudioEnabled(!audioEnabled)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all w-full", audioEnabled ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-transparent bg-muted/30 text-muted-foreground")}>
                        {audioEnabled ? "🔊 Audio On" : "🔇 Audio Off"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Desktop settings */}
                {showSettings && (
                  <div className="hidden sm:block absolute bottom-full right-0 mb-2 w-[340px] z-50">
                    <div className="rounded-2xl border border-border bg-card/95 p-3 backdrop-blur-xl shadow-2xl">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Durasi ({duration} detik)</p>
                      <input type="range" min={4} max={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full mb-3 accent-orange-500" />

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Rasio Aspek</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {ASPECT_RATIOS.map((ratio, i) => (
                          <button key={ratio} onClick={() => setSelectedRatio(i)} className={cn("rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all", selectedRatio === i ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            {ratio}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Resolusi</p>
                      <div className="flex gap-1.5 mb-3">
                        {RESOLUTIONS.map((res, i) => (
                          <button key={res} onClick={() => setSelectedRes(i)} className={cn("flex flex-1 items-center justify-center rounded-lg border py-2 text-xs font-medium transition-all", selectedRes === i ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            {res}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-0.5">Audio</p>
                        <button onClick={() => setAudioEnabled(!audioEnabled)} className={cn("rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all", audioEnabled ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-transparent bg-muted/30 text-muted-foreground")}>
                          {audioEnabled ? "🔊 On" : "🔇 Off"}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2.5 text-xs font-medium text-foreground/70">
                        <span>🎬</span><span>{MODEL_NAME}</span>
                        <span className="ml-auto text-[9px] text-muted-foreground/50">{CREDIT_COST_RUNWAY} credits</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGenerate} disabled={isGenerating}
                className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  !isGenerating ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40" : "bg-muted text-muted-foreground/40 cursor-not-allowed")}>
                {isGenerating ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <video src={previewVideo.url} className="max-h-[80vh] w-full rounded-2xl object-contain bg-muted/30" controls autoPlay playsInline />
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => handleDownload(previewVideo.url, "seedance-video.mp4")} className="flex h-10 items-center gap-2 rounded-xl bg-muted/80 px-4 text-sm text-foreground backdrop-blur-sm transition hover:bg-muted border border-border">
                <DownloadIcon className="h-4 w-4" /> Download
              </button>
              <button onClick={() => setPreviewVideo(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/80 text-foreground backdrop-blur-sm transition hover:bg-muted border border-border">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
