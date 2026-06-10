"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  SendIcon, Loader2Icon, DownloadIcon, XIcon, UserIcon,
  VideoIcon, PlayIcon, BookmarkIcon, CheckIcon, UploadCloudIcon,
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
const MODEL_ID = "kling-3.0-motion-control" as const
const MODEL_NAME = "Kling 3.0 Motion Control"

type Phase = "idle" | "uploading-image" | "uploading-video" | "generating" | "done" | "error"

const PHASE_LABELS: Record<Phase, string> = {
  idle: "", "uploading-image": "Mengupload gambar karakter...",
  "uploading-video": "Mengupload video performa...",
  generating: "Membuat video (bisa 2-5 menit)...", done: "Selesai!", error: "Gagal",
}

export default function MotionControlPage() {
  const [characterImage, setCharacterImage] = useState<{ file: File; preview: string } | null>(null)
  const [performanceVideo, setPerformanceVideo] = useState<{ file: File; preview: string } | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const [orientation, setOrientation] = useState<"image" | "video">("video")
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p")
  const [phase, setPhase] = useState<Phase>("idle")
  const [generatedVideo, setGeneratedVideo] = useState<RunwayGeneratedVideo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [previewModal, setPreviewModal] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const { addCustomJob, updateJob } = useGenerationQueue()

  const allReady = characterImage && performanceVideo
  const isProcessing = phase !== "idle" && phase !== "done" && phase !== "error"

  useEffect(() => {
    return () => {
      if (characterImage) URL.revokeObjectURL(characterImage.preview)
      if (performanceVideo) URL.revokeObjectURL(performanceVideo.preview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setError(`Gambar terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 20MB.`)
      if (imageInputRef.current) imageInputRef.current.value = ""
      return
    }
    if (characterImage) URL.revokeObjectURL(characterImage.preview)
    setCharacterImage({ file, preview: URL.createObjectURL(file) })
    setError(null)
    if (imageInputRef.current) imageInputRef.current.value = ""
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 100 * 1024 * 1024) {
      setError(`Video terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 100MB.`)
      if (videoInputRef.current) videoInputRef.current.value = ""
      return
    }

    // Validate video duration
    const videoEl = document.createElement("video")
    videoEl.preload = "metadata"
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src)
      const dur = videoEl.duration

      if (orientation === "image" && dur > 10) {
        setError(`Video terlalu panjang (${Math.round(dur)}s). Untuk orientasi "Ikuti Gambar", maksimal 10 detik.`)
        return
      }
      if (dur > 30) {
        setError(`Video terlalu panjang (${Math.round(dur)}s). Maksimal 30 detik.`)
        return
      }

      if (performanceVideo) URL.revokeObjectURL(performanceVideo.preview)
      setPerformanceVideo({ file, preview: URL.createObjectURL(file) })
    }
    videoEl.onerror = () => {
      URL.revokeObjectURL(videoEl.src)
      // Can't read metadata, let it through and let the API validate
      if (performanceVideo) URL.revokeObjectURL(performanceVideo.preview)
      setPerformanceVideo({ file, preview: URL.createObjectURL(file) })
    }
    videoEl.src = URL.createObjectURL(file)
    if (videoInputRef.current) videoInputRef.current.value = ""
  }

  const handleGenerate = async () => {
    if (!allReady || isProcessing) return
    setError(null)
    setSuccessMsg(null)
    setGeneratedVideo(null)
    setSaved(false)

    const jobId = `motion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    try {
      const queueJob: GenerationJob = {
        id: jobId, type: "video", prompt: customPrompt || "Motion Control",
        model: MODEL_NAME, status: "uploading", progress: "Mengupload...",
        images: [], videos: [], createdAt: new Date(),
        params: { prompt: customPrompt || "Motion Control" },
      }
      addCustomJob(queueJob)

      // Step 1: Upload character image
      setPhase("uploading-image")
      updateJob(jobId, { status: "uploading", progress: PHASE_LABELS["uploading-image"] })
      const imageResult = await uploadRunwayAsset(characterImage!.file)

      // Step 2: Upload performance video
      setPhase("uploading-video")
      updateJob(jobId, { progress: PHASE_LABELS["uploading-video"] })
      const videoResult = await uploadRunwayAsset(performanceVideo!.file)

      // Step 3: Generate motion control video (Async)
      setPhase("generating")
      updateJob(jobId, { status: "generating", progress: PHASE_LABELS.generating })

      await generateRunwayVideo({
        model: MODEL_ID,
        text_prompt: customPrompt || undefined,
        imageAssetIds: [imageResult.assetId],
        videoAssetId: videoResult.assetId,
        characterOrientation: orientation,
        audio: audioEnabled,
        resolution,
        feature: "motion-control",
        asyncMode: true,
      })

      setPhase("idle")
      setSuccessMsg("Video berhasil diantrekan. Proses memakan waktu 10-30 menit. Video akan otomatis tersimpan di Gallery setelah selesai.")
      updateJob(jobId, {
        status: "done",
        progress: "Berhasil antre. Cek Gallery (10-30m)",
        completedAt: new Date()
      })
      
      // Clear inputs
      if (characterImage) URL.revokeObjectURL(characterImage.preview)
      if (performanceVideo) URL.revokeObjectURL(performanceVideo.preview)
      setCharacterImage(null)
      setPerformanceVideo(null)
      setCustomPrompt("")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed"
      setError(msg)
      setPhase("idle")
      updateJob(jobId, {
        status: "error",
        progress: undefined,
        error: msg,
        completedAt: new Date()
      })
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try { await downloadVideo(url, filename) }
    catch { window.open(url, "_blank") }
  }

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Video Tools", href: "/dashboard" },
        { label: "Motion Control" },
      ]} />

      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoUpload} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-400">
              <PlayIcon className="h-4 w-4" /> Motion Control
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Kling 3.0 Motion Control</h1>
            <p className="mt-2 text-sm text-muted-foreground">Upload karakter + video performa — AI akan meng-animate karakter mengikuti gerakan</p>
          </div>

          {/* Upload Slots */}
          <div className="mb-8 grid grid-cols-2 gap-6">
            {/* Character Image */}
            <div className="flex flex-col items-center">
              <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">🖼️ Karakter (Gambar)</span>
              {characterImage ? (
                <div className="group relative aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-2xl border-2 border-cyan-500/40 ring-1 ring-cyan-500/30">
                  <Image src={characterImage.preview} alt="Character" fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => imageInputRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-xs text-white backdrop-blur-sm hover:bg-white/30">
                      <UploadCloudIcon className="h-3.5 w-3.5" /> Ganti
                    </button>
                    <button onClick={() => { URL.revokeObjectURL(characterImage.preview); setCharacterImage(null) }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/30 text-white backdrop-blur-sm hover:bg-red-500/50">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => imageInputRef.current?.click()} className="flex aspect-[3/4] w-full max-w-[240px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-cyan-500/40 bg-card/50 transition-all hover:scale-[1.02] hover:border-cyan-500/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><UserIcon className="h-6 w-6" /></div>
                  <p className="text-xs font-medium text-foreground/70">Upload Gambar Karakter</p>
                </button>
              )}
            </div>

            {/* Performance Video */}
            <div className="flex flex-col items-center">
              <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">🎬 Performa (Video)</span>
              {performanceVideo ? (
                <div className="group relative aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-2xl border-2 border-rose-500/40 ring-1 ring-rose-500/30">
                  <video src={performanceVideo.preview} className="h-full w-full object-cover" muted loop autoPlay playsInline />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => videoInputRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-xs text-white backdrop-blur-sm hover:bg-white/30">
                      <UploadCloudIcon className="h-3.5 w-3.5" /> Ganti
                    </button>
                    <button onClick={() => { URL.revokeObjectURL(performanceVideo.preview); setPerformanceVideo(null) }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/30 text-white backdrop-blur-sm hover:bg-red-500/50">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => videoInputRef.current?.click()} className="flex aspect-[3/4] w-full max-w-[240px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-rose-500/40 bg-card/50 transition-all hover:scale-[1.02] hover:border-rose-500/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400"><VideoIcon className="h-6 w-6" /></div>
                  <p className="text-xs font-medium text-foreground/70">Upload Video Performa</p>
                  <p className="text-[10px] text-muted-foreground/50">{orientation === "image" ? "Maks 10 detik" : "3–30 detik"}</p>
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="mb-6 space-y-4">
            {/* Orientation */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🧭 Orientasi Karakter</label>
              <div className="flex gap-2">
                {(["image", "video"] as const).map((opt) => (
                  <button key={opt} onClick={() => setOrientation(opt)}
                    className={cn("rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                      orientation === opt ? "border-cyan-500 bg-cyan-500/20 text-cyan-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                    {opt === "image" ? "🖼️ Ikuti Gambar" : "🎬 Ikuti Video"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                {orientation === "image"
                  ? "Orientasi karakter mengikuti pose di gambar. ⚠️ Video referensi harus di bawah 10 detik."
                  : "Orientasi karakter mengikuti pose di video performa. Video hingga 30 detik."}
              </p>
            </div>

            {/* Resolution */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">📐 Resolusi</label>
              <div className="flex gap-2">
                {(["720p", "1080p"] as const).map((res) => (
                  <button key={res} onClick={() => setResolution(res)}
                    className={cn("rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                      resolution === res ? "border-cyan-500 bg-cyan-500/20 text-cyan-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                    {res === "720p" ? "720p (Standard)" : "1080p (Pro)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🔊 Audio</label>
              <button onClick={() => setAudioEnabled(!audioEnabled)}
                className={cn("rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                  audioEnabled ? "border-cyan-500 bg-cyan-500/20 text-cyan-300" : "border-border bg-card/50 text-muted-foreground")}>
                {audioEnabled ? "🔊 Pertahankan audio dari video performa" : "🔇 Audio dimatikan"}
              </button>
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instruksi Tambahan <span className="font-normal">(opsional, maks 2500 karakter)</span></label>
            <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value.slice(0, 2500))} placeholder="Contoh: dansa dengan energik, latar belakang studio..." rows={2}
              className="w-full resize-none rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30" />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{customPrompt.length}/2500</div>
          </div>

          {/* Generate Button */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <button onClick={handleGenerate} disabled={!allReady || isProcessing}
              className={cn("flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all",
                allReady && !isProcessing ? "bg-gradient-to-r from-cyan-500 to-rose-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 cursor-pointer" : "bg-muted text-muted-foreground/40 cursor-not-allowed")}>
              {isProcessing ? <><Loader2Icon className="h-4 w-4 animate-spin" /> {PHASE_LABELS[phase]}</> : <><SendIcon className="h-4 w-4" /> Generate Motion Control</>}
            </button>
            <span className="text-[11px] text-muted-foreground">
              <span className="text-foreground/60 font-medium">{CREDIT_COST_RUNWAY} credits</span>
            </span>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="mb-8 flex flex-col items-center gap-3 animate-fade-up">
              <LottieLoading size={120} />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground/70">{PHASE_LABELS[phase]}</p>
                <div className="mt-3 flex items-center gap-1.5 max-w-xs w-full">
                  {(["uploading-image", "uploading-video", "generating"] as Phase[]).map((p, i) => (
                    <div key={p} className={cn("h-1.5 flex-1 rounded-full transition-all", {
                      "bg-cyan-500": (["uploading-image", "uploading-video", "generating"] as Phase[]).indexOf(phase) >= i,
                      "bg-muted": (["uploading-image", "uploading-video", "generating"] as Phase[]).indexOf(phase) < i,
                    })} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-8 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="shrink-0 text-red-400/60 hover:text-red-400"><XIcon className="h-4 w-4" /></button>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div className="mb-8 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 animate-fade-up">
              <CheckIcon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="shrink-0 text-emerald-400/60 hover:text-emerald-400"><XIcon className="h-4 w-4" /></button>
            </div>
          )}

          {/* Result */}
          {generatedVideo && (
            <div className="mb-8 animate-fade-up">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <PlayIcon className="h-4 w-4 text-cyan-400" /> Video Motion Control
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card/50">
                <div className="relative aspect-video max-h-[500px] mx-auto cursor-pointer" onClick={() => setPreviewModal(true)}>
                  <video src={generatedVideo.url} className="h-full w-full object-contain bg-background" muted loop autoPlay playsInline />
                </div>
                <div className="flex justify-center gap-1 border-t border-border py-2">
                  <button onClick={() => setPreviewModal(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition">
                    <PlayIcon className="h-3.5 w-3.5" /> Fullscreen
                  </button>
                  <button onClick={() => handleDownload(generatedVideo.url, "motion-control-video.mp4")} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition">
                    <DownloadIcon className="h-3.5 w-3.5" /> Download
                  </button>
                  <button
                    disabled={saved || saving}
                    onClick={async () => {
                      setSaving(true)
                      try {
                        await fetch("/api/gallery/save", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url: generatedVideo.url, type: "video", prompt: customPrompt, model: MODEL_ID, aspectRatio: "auto", sourceAction: "motion-control", mediaGenerationId: generatedVideo.assetId }),
                        })
                        setSaved(true)
                      } catch { /* ignore */ } finally { setSaving(false) }
                    }}
                    className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition",
                      saved ? "text-green-400" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    {saved ? <><CheckIcon className="h-3.5 w-3.5" /> Tersimpan</> : saving ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : <><BookmarkIcon className="h-3.5 w-3.5" /> Simpan</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewModal && generatedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setPreviewModal(false)}>
          <button onClick={() => setPreviewModal(false)} className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition">
            <XIcon className="h-5 w-5" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <video src={generatedVideo.url} className="max-h-[80vh] w-full rounded-2xl object-contain" controls autoPlay playsInline />
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => handleDownload(generatedVideo.url, "motion-control-video.mp4")} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm hover:bg-white/20">
                <DownloadIcon className="h-4 w-4" /> Download
              </button>
              <button onClick={() => setPreviewModal(false)} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm hover:bg-white/20">
                <XIcon className="h-4 w-4" /> Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
