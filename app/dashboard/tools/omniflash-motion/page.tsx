"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  SendIcon,
  Loader2Icon,
  DownloadIcon,
  XIcon,
  EyeIcon,
  ImagePlusIcon,
  UploadIcon,
  ImageIcon,
  VideoIcon,
  ClapperboardIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { useGenerationQueue } from "@/contexts/generation-queue"
import { downloadVideo } from "@/lib/download"
import type { GeneratedVideo } from "@/lib/api/google-flow"

interface MediaReference {
  file?: File
  preview: string
  galleryUrl?: string
  fromGallery?: boolean
  type: "image" | "video"
}

interface GalleryItem {
  id: string
  gcsUrl: string
  mediaGenerationId?: string
  prompt?: string
}

function isMediaExpired(url?: string, proxyUrl?: string): boolean {
  try {
    const targetUrl = url || proxyUrl
    if (!targetUrl) return false
    let checkStr = targetUrl
    if (targetUrl.includes("/api/ai/video-download")) {
      const u = new URL(targetUrl, window.location.origin)
      const encoded = u.searchParams.get("url")
      if (encoded) checkStr = encoded
    }
    const parsed = new URL(checkStr)
    const expires = parsed.searchParams.get("Expires")
    if (expires) {
      return Date.now() / 1000 > parseInt(expires, 10)
    }
  } catch { /* ignore */ }
  return false
}

export default function OmniflashMotionPage() {
  const [showGalleryPicker, setShowGalleryPicker] = useState<"image" | "video" | null>(null)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)

  const [prompt, setPrompt] = useState("")
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)

  const [imageRef, setImageRef] = useState<MediaReference | null>(null)
  const [videoRef, setVideoRef] = useState<MediaReference | null>(null)

  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { jobs, submitVideoJob } = useGenerationQueue()

  // Track the active job
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : null
  const isGenerating = activeJob?.status === "uploading" || activeJob?.status === "generating"
  const generatedVideos = activeJob?.status === "done" ? activeJob.videos : []
  const error = activeJob?.status === "error" ? activeJob.error : null

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }, [prompt])

  const handleGenerate = () => {
    if (!imageRef || !videoRef || isGenerating) return

    const userPrompt = prompt.trim()
    const instruction = "Make the person in @referenceImage_1 perform the exact same movements, poses, and choreography from the reference video. Preserve the person's face and appearance. Match the timing and rhythm of the original video. Generate natural ambient audio."
    const finalPrompt = userPrompt ? `${userPrompt} ${instruction}` : instruction

    const jobId = submitVideoJob(
      {
        prompt: finalPrompt,
        model: "omni-flash",
        aspectRatio: "portrait", // omniflash defaults, adjust as needed
        duration: 8,
        count: 1,
      },
      // references = image references
      [{ file: imageRef.file, galleryUrl: imageRef.galleryUrl }],
      undefined,
      // videoRef
      { file: videoRef.file, galleryUrl: videoRef.galleryUrl }
    )

    setActiveJobId(jobId)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4.5 * 1024 * 1024) {
      alert("Ukuran file maksimal adalah 4.5 MB")
      return
    }
    setImageRef({
      file,
      preview: URL.createObjectURL(file),
      type: "image",
    })
    if (imageInputRef.current) imageInputRef.current.value = ""
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4.5 * 1024 * 1024) {
      alert("Ukuran file maksimal adalah 4.5 MB")
      return
    }
    setVideoRef({
      file,
      preview: URL.createObjectURL(file), // will be used for video tag
      type: "video",
    })
    if (videoInputRef.current) videoInputRef.current.value = ""
  }

  const removeReference = (type: "image" | "video") => {
    if (type === "image") {
      if (imageRef && !imageRef.fromGallery) URL.revokeObjectURL(imageRef.preview)
      setImageRef(null)
    } else {
      if (videoRef && !videoRef.fromGallery) URL.revokeObjectURL(videoRef.preview)
      setVideoRef(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      await downloadVideo(url, filename)
    } catch {
      window.open(url, "_blank")
    }
  }

  const fetchGallery = useCallback(async (type: "image" | "video") => {
    setGalleryLoading(true)
    try {
      const res = await fetch(`/api/gallery?type=${type}`)
      const data = await res.json()
      if (res.ok) setGalleryItems(data.items || [])
    } catch { /* ignore */ } finally {
      setGalleryLoading(false)
    }
  }, [])

  const openGalleryPicker = (type: "image" | "video") => {
    setShowGalleryPicker(type)
    fetchGallery(type)
  }

  const selectGalleryItem = (item: GalleryItem) => {
    if (!showGalleryPicker) return
    if (showGalleryPicker === "image") {
      setImageRef({ preview: item.gcsUrl, galleryUrl: item.gcsUrl, fromGallery: true, type: "image" })
    } else {
      setVideoRef({ preview: item.gcsUrl, galleryUrl: item.gcsUrl, fromGallery: true, type: "video" })
    }
    setShowGalleryPicker(null)
  }

  const isEmpty = generatedVideos.length === 0 && !isGenerating

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Tools", href: "/dashboard" },
        { label: "Omniflash Motion" },
      ]} />

      <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 pb-48">
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
              <p className="text-xs text-muted-foreground mt-1">Menggunakan Omni Flash • 60-180 detik</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 animate-fade-up">
            <div className="text-muted-foreground/30">
              <ClapperboardIcon className="h-16 w-16" strokeWidth={1} />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Buat motion video dengan referensi</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl p-4">
            {generatedVideos.map((vid, i) => {
              const expired = isMediaExpired((vid as any).rawUrl, vid.url)
              return (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-muted/30 animate-fade-up">
                  <div className="relative aspect-video cursor-pointer" onClick={() => !expired && setPreviewVideo(vid)}>
                    {expired ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-muted/50 p-4 text-center">
                        <VideoIcon className="mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-sm font-medium text-foreground/70">Kedaluwarsa</p>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug max-w-[200px] mx-auto">Link berlaku 24 jam. Jika sudah tersimpan, lihat di Gallery.</p>
                      </div>
                    ) : (
                      <video
                        src={vid.url}
                        className="w-full h-full object-contain bg-background"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-3 py-2">
                    <span className="text-[10px] text-muted-foreground">
                      Video Motion Generated
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => !expired && setPreviewVideo(vid)} disabled={expired} className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition", expired ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:bg-muted hover:text-foreground")} title="Preview">
                        <EyeIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                      <button onClick={() => !expired && handleDownload(vid.url, "omniflash-motion.mp4")} disabled={expired} className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition", expired ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:bg-muted hover:text-foreground")} title="Download">
                        <DownloadIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (savedVideos.has(vid.url) || expired) return
                          try {
                            const res = await fetch("/api/gallery/save", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                url: vid.url,
                                type: "video",
                                prompt: activeJob?.prompt || "",
                                model: activeJob?.model || "omni-flash",
                                aspectRatio: vid.aspectRatio || "portrait",
                                mediaGenerationId: vid.mediaGenerationId || "",
                                sourceAction: "omniflash-motion",
                              }),
                            })
                            if (res.ok) setSavedVideos(prev => new Set(prev).add(vid.url))
                          } catch { /* ignore */ }
                        }}
                        disabled={savedVideos.has(vid.url) || expired}
                        className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition hover:bg-muted", savedVideos.has(vid.url) ? "text-emerald-500" : expired ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-foreground")}
                      >
                        <ImagePlusIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{savedVideos.has(vid.url) ? "Tersimpan ✓" : "Gallery"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
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

      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="flex justify-center pb-2">
          <span className="text-[11px] text-muted-foreground">
            Pembuatan akan menggunakan <span className="text-foreground/60 underline underline-offset-2">50 poin</span>
          </span>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-4">
          <div className="mb-2">
            <div className="flex justify-center gap-4 px-1 pb-2">

              {/* Image Reference */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">Gambar Referensi</span>
                {imageRef ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                    <Image src={imageRef.preview} alt="Ref Image" fill className="object-cover" unoptimized />
                    <button onClick={() => removeReference("image")} className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm z-10">
                      <XIcon className="h-3 w-3" />
                    </button>
                    {imageRef.fromGallery && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-center">
                        <span className="text-[8px] text-white/70">Gallery</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => imageInputRef.current?.click()} className="flex h-20 w-16 flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40 transition hover:border-border hover:text-muted-foreground hover:bg-muted/30 bg-card">
                      <UploadIcon className="h-4 w-4 mb-1" />
                      <span className="text-[8px]">Upload</span>
                    </button>
                    <button onClick={() => openGalleryPicker("image")} className="flex h-20 w-16 flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40 transition hover:border-border hover:text-muted-foreground hover:bg-muted/30 bg-card">
                      <ImageIcon className="h-4 w-4 mb-1" />
                      <span className="text-[8px]">Gallery</span>
                    </button>
                  </div>
                )}
                <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
              </div>

              {/* Video Reference */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">Video Referensi</span>
                {videoRef ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                    <video src={videoRef.preview} className="h-full w-full object-cover" muted />
                    <div className="absolute inset-0 bg-black/20" />
                    <button onClick={() => removeReference("video")} className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm z-10">
                      <XIcon className="h-3 w-3" />
                    </button>
                    {videoRef.fromGallery && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-center">
                        <span className="text-[8px] text-white/70">Gallery</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => videoInputRef.current?.click()} className="flex h-20 w-16 flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40 transition hover:border-border hover:text-muted-foreground hover:bg-muted/30 bg-card">
                      <UploadIcon className="h-4 w-4 mb-1" />
                      <span className="text-[8px]">Upload</span>
                    </button>
                    <button onClick={() => openGalleryPicker("video")} className="flex h-20 w-16 flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40 transition hover:border-border hover:text-muted-foreground hover:bg-muted/30 bg-card">
                      <VideoIcon className="h-4 w-4 mb-1" />
                      <span className="text-[8px]">Gallery</span>
                    </button>
                  </div>
                )}
                <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoUpload} />
              </div>

            </div>
          </div>

          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/95 p-2 pl-3 backdrop-blur-xl shadow-2xl">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Prompt tambahan (opsional)..."
              rows={1}
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              style={{ lineHeight: "1.5", overflowY: "auto" }}
            />

            <div className="mb-1 flex shrink-0 items-center gap-1.5">
              <button
                onClick={handleGenerate}
                disabled={!imageRef || !videoRef || isGenerating}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  imageRef && videoRef && !isGenerating
                    ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                )}
                title={!imageRef || !videoRef ? "Upload gambar dan video referensi terlebih dahulu" : undefined}
              >
                {isGenerating ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-2 text-center">
            <p className="text-[9px] text-muted-foreground opacity-60">Sistem otomatis menyisipkan prompt untuk mengikuti gerakan video dan menghapus watermark.</p>
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
              <button onClick={() => handleDownload(previewVideo.url, "omniflash-motion.mp4")} className="flex h-10 items-center gap-2 rounded-xl bg-muted/80 px-4 text-sm text-foreground backdrop-blur-sm transition hover:bg-muted border border-border">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowGalleryPicker(null)}>
          <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-border bg-card p-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Pilih {showGalleryPicker === "image" ? "Gambar" : "Video"} dari Gallery</h3>
              <button onClick={() => setShowGalleryPicker(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {galleryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            ) : galleryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                {showGalleryPicker === "image" ? <ImageIcon className="h-8 w-8 mb-2 opacity-30" /> : <VideoIcon className="h-8 w-8 mb-2 opacity-30" />}
                <p className="text-sm">Gallery {showGalleryPicker === "image" ? "gambar" : "video"} kosong</p>
                <p className="text-xs opacity-70">Item yang tersimpan akan muncul di sini</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[55vh] pr-2">
                {galleryItems.map((item) => (
                  <div key={item.id} className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/30 transition hover:border-violet-500/50" onClick={() => selectGalleryItem(item)}>
                    {showGalleryPicker === "image" ? (
                      <Image src={item.gcsUrl} alt="Gallery item" fill className="object-cover" unoptimized />
                    ) : (
                      <video src={item.gcsUrl} className="h-full w-full object-cover" muted />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
