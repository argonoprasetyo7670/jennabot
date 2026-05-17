"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  SparklesIcon, ImageIcon, Loader2Icon, DownloadIcon, EyeIcon,
  XIcon, ChevronDownIcon, TypeIcon, PaletteIcon, LayoutGridIcon,
  MonitorPlayIcon, UploadIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { useGenerationQueue } from "@/contexts/generation-queue"
import type { ImageModel, AspectRatio, GeneratedImage } from "@/lib/api/google-flow"

/* ─── Platform Presets (determines aspect ratio) ─── */
const PLATFORMS = [
  { id: "youtube", label: "YouTube", icon: "🎬", ratio: "16:9" as AspectRatio, desc: "1280×720" },
  { id: "instagram-post", label: "IG Post", icon: "📸", ratio: "1:1" as AspectRatio, desc: "1080×1080" },
  { id: "instagram-story", label: "IG Story", icon: "📱", ratio: "9:16" as AspectRatio, desc: "1080×1920" },
  { id: "tiktok", label: "TikTok", icon: "🎵", ratio: "9:16" as AspectRatio, desc: "1080×1920" },
  { id: "facebook", label: "Facebook", icon: "👤", ratio: "16:9" as AspectRatio, desc: "1200×630" },
  { id: "twitter", label: "X / Twitter", icon: "🐦", ratio: "16:9" as AspectRatio, desc: "1600×900" },
]

/* ─── Style Presets ─── */
const STYLES = [
  { id: "clickbait", label: "Clickbait", icon: "🔥", prompt: "eye-catching clickbait YouTube thumbnail, bold text overlay, shocked expression, bright saturated colors, high contrast" },
  { id: "minimal", label: "Minimalis", icon: "⬜", prompt: "clean minimalist thumbnail, simple typography, lots of white space, modern design" },
  { id: "dramatic", label: "Dramatis", icon: "🎭", prompt: "dramatic cinematic thumbnail, dark moody lighting, epic feel, movie poster style" },
  { id: "colorful", label: "Colorful", icon: "🌈", prompt: "vibrant colorful thumbnail, gradient background, fun playful design, pop art style" },
  { id: "tech", label: "Tech", icon: "💻", prompt: "tech review thumbnail, futuristic design, neon accents, dark background, gadget showcase" },
  { id: "tutorial", label: "Tutorial", icon: "📚", prompt: "educational tutorial thumbnail, clean layout, step indicator, professional informative design" },
  { id: "gaming", label: "Gaming", icon: "🎮", prompt: "gaming thumbnail, dynamic action, explosive effects, bold gamer aesthetic, RGB colors" },
  { id: "food", label: "Food", icon: "🍕", prompt: "food thumbnail, appetizing close-up, warm golden lighting, rustic wood background, delicious" },
  { id: "travel", label: "Travel", icon: "✈️", prompt: "travel vlog thumbnail, stunning landscape, wanderlust vibes, golden hour, adventure" },
  { id: "podcast", label: "Podcast", icon: "🎙️", prompt: "podcast thumbnail, microphone, split guest layout, professional audio show branding" },
]

/* ─── Color Moods ─── */
const COLOR_MOODS = [
  { id: "none", label: "Auto", color: "bg-gradient-to-r from-violet-500 to-blue-500" },
  { id: "warm", label: "Warm", color: "bg-gradient-to-r from-orange-500 to-red-500", prompt: "warm color palette, orange and red tones" },
  { id: "cool", label: "Cool", color: "bg-gradient-to-r from-blue-500 to-cyan-500", prompt: "cool color palette, blue and cyan tones" },
  { id: "neon", label: "Neon", color: "bg-gradient-to-r from-pink-500 to-violet-500", prompt: "neon glow colors, pink and purple, cyberpunk" },
  { id: "earth", label: "Earth", color: "bg-gradient-to-r from-amber-600 to-green-700", prompt: "earthy natural tones, brown and green" },
  { id: "mono", label: "B&W", color: "bg-gradient-to-r from-gray-800 to-gray-400", prompt: "black and white, monochrome, high contrast" },
  { id: "pastel", label: "Pastel", color: "bg-gradient-to-r from-pink-300 to-sky-300", prompt: "soft pastel colors, gentle muted tones" },
]

const MODELS: { id: ImageModel; name: string; icon: string }[] = [
  { id: "imagen-4", name: "Imagen 4", icon: "✨" },
  { id: "nano-banana-2", name: "Nano Banana 2", icon: "🔥" },
  { id: "nano-banana-pro", name: "Nano Banana Pro", icon: "🚀" },
]
const IMAGE_COUNTS = [1, 2, 3, 4]

interface RefImage { file: File; preview: string }

export default function ThumbnailPage() {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState(0) // YouTube
  const [selectedStyle, setSelectedStyle] = useState(0) // Clickbait
  const [selectedMood, setSelectedMood] = useState(0) // Auto
  const [customPrompt, setCustomPrompt] = useState("")
  const [selectedModel, setSelectedModel] = useState(1)
  const [imageCount, setImageCount] = useState(0)
  const [showModelDD, setShowModelDD] = useState(false)
  const [refImage, setRefImage] = useState<RefImage | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ddRef = useRef<HTMLDivElement>(null)

  const { jobs, submitJob } = useGenerationQueue()
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : null
  const isGenerating = activeJob?.status === "uploading" || activeJob?.status === "generating"
  const generatedImages = activeJob?.status === "done" ? activeJob.images : []
  const error = activeJob?.status === "error" ? activeJob.error : null
  const platform = PLATFORMS[selectedPlatform]
  const style = STYLES[selectedStyle]
  const mood = COLOR_MOODS[selectedMood]

  useEffect(() => {
    if (!showModelDD) return
    const h = (e: MouseEvent) => { if (ddRef.current && !ddRef.current.contains(e.target as Node)) setShowModelDD(false) }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [showModelDD])

  const buildPrompt = () => {
    const parts: string[] = []
    if (title.trim()) parts.push(`thumbnail with bold text "${title.trim()}"`)
    if (subtitle.trim()) parts.push(`subtitle text "${subtitle.trim()}"`)
    parts.push(style.prompt)
    if (mood.id !== "none" && mood.prompt) parts.push(mood.prompt)
    if (customPrompt.trim()) parts.push(customPrompt.trim())
    parts.push(`${platform.ratio} aspect ratio, ${platform.label} thumbnail format`)
    if (refImage) parts.push("incorporate the reference image as the main visual element")
    return parts.join(", ")
  }

  const handleGenerate = () => {
    if (!title.trim() || isGenerating) return
    const refs = refImage ? [{ file: refImage.file }] : []
    const jobId = submitJob({ prompt: buildPrompt(), model: MODELS[selectedModel].id, aspectRatio: platform.ratio, count: IMAGE_COUNTS[imageCount] }, refs.length > 0 ? refs : undefined)
    setActiveJobId(jobId)
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(`/api/ai/image-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
      const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = blobUrl; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl)
    } catch { window.open(url, "_blank") }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (refImage) URL.revokeObjectURL(refImage.preview)
    setRefImage({ file, preview: URL.createObjectURL(file) })
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[{ label: "Jenna Bot Pro", href: "/dashboard" }, { label: "Thumbnail Generator" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20">
              <MonitorPlayIcon className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Thumbnail Generator</h1>
              <p className="text-xs text-muted-foreground">Buat thumbnail menarik untuk YouTube, IG, TikTok & lainnya</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* ── Left Panel ── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title Input */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <TypeIcon className="h-4 w-4 text-red-400" /> Teks Thumbnail
                </h2>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul utama thumbnail..." className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-red-500/30 mb-2" />
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle (opsional)..." className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-red-500/30" />
              </div>

              {/* Reference Image */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <UploadIcon className="h-4 w-4 text-orange-400" /> Referensi
                  <span className="text-[10px] text-muted-foreground/50 font-normal">(opsional)</span>
                </h2>
                {refImage ? (
                  <div className="relative aspect-video rounded-xl border border-border overflow-hidden group">
                    <Image src={refImage.preview} alt="Reference" fill className="object-cover" unoptimized />
                    <button onClick={() => { URL.revokeObjectURL(refImage.preview); setRefImage(null) }} className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"><XIcon className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-xs text-muted-foreground/40 transition hover:border-orange-500/40 hover:text-orange-400">
                    <ImageIcon className="h-4 w-4" /> Upload gambar referensi
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload} />
              </div>

              {/* Platform */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <MonitorPlayIcon className="h-4 w-4 text-blue-400" /> Platform
                </h2>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLATFORMS.map((p, i) => (
                    <button key={p.id} onClick={() => setSelectedPlatform(i)} className={cn("flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all border", selectedPlatform === i ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent")}>
                      <span className="text-base">{p.icon}</span>
                      <span className="text-[10px]">{p.label}</span>
                      <span className="text-[8px] text-muted-foreground/50">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <PaletteIcon className="h-4 w-4 text-violet-400" /> Gaya
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {STYLES.map((s, i) => (
                    <button key={s.id} onClick={() => setSelectedStyle(i)} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left border", selectedStyle === i ? "bg-violet-500/15 text-violet-400 border-violet-500/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent")}>
                      <span>{s.icon}</span><span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Mood */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="text-base">🎨</span> Warna
                </h2>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_MOODS.map((m, i) => (
                    <button key={m.id} onClick={() => setSelectedMood(i)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-medium transition-all border", selectedMood === i ? "border-foreground/30 text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/30")}>
                      <span className={cn("h-3 w-3 rounded-full", m.color)} /><span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt + Settings */}
              <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
                <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Instruksi tambahan (opsional)..." rows={2} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-red-500/30 resize-none" />
                <div className="flex gap-1.5">
                  {IMAGE_COUNTS.map((c, i) => (
                    <button key={c} onClick={() => setImageCount(i)} className={cn("flex-1 rounded-lg py-1.5 text-xs font-medium transition-all border", imageCount === i ? "bg-muted text-foreground border-border" : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/30")}>x{c}</button>
                  ))}
                </div>
                <div className="relative" ref={ddRef}>
                  <button onClick={() => setShowModelDD(!showModelDD)} className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground/70 transition hover:bg-muted/40">
                    <span className="flex items-center gap-2"><span>{MODELS[selectedModel].icon}</span><span>{MODELS[selectedModel].name}</span></span>
                    <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", showModelDD && "rotate-180")} />
                  </button>
                  {showModelDD && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                      {MODELS.map((m, i) => (
                        <button key={m.id} onClick={() => { setSelectedModel(i); setShowModelDD(false) }} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all", selectedModel === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                          <span>{m.icon}</span><span>{m.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Generate */}
              <button onClick={handleGenerate} disabled={!title.trim() || isGenerating} className={cn("w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all", title.trim() && !isGenerating ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 active:scale-[0.98]" : "bg-muted text-muted-foreground/40 cursor-not-allowed")}>
                {isGenerating ? (<><Loader2Icon className="h-4 w-4 animate-spin" />{activeJob?.progress || "Memproses..."}</>) : (<><SparklesIcon className="h-4 w-4" />Generate Thumbnail</>)}
              </button>
            </div>

            {/* ── Right: Results ── */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card/50 p-4 min-h-[500px]">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                  <SparklesIcon className="h-4 w-4 text-red-400" /> Hasil
                </h2>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <LottieLoading size={140} />
                    <p className="text-sm font-medium text-foreground/70 mt-2">{activeJob?.progress || "Membuat thumbnail..."}</p>
                    <p className="text-xs text-muted-foreground mt-1">{platform.label} • {style.label}</p>
                  </div>
                ) : generatedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 mb-4"><MonitorPlayIcon className="h-8 w-8 opacity-20" /></div>
                    <p className="text-sm font-medium opacity-60">Hasil thumbnail akan muncul di sini</p>
                    <p className="text-[11px] opacity-40 mt-1">Masukkan judul dan klik Generate</p>
                  </div>
                ) : (
                  <div className={cn("grid gap-3", generatedImages.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                    {generatedImages.map((img, i) => (
                      <div key={i} className="overflow-hidden rounded-xl border border-border bg-muted/20 animate-fade-up group">
                        <div className="relative aspect-video cursor-pointer" onClick={() => setPreviewImage(img)}>
                          <Image src={img.url} alt={`Thumbnail ${i + 1}`} fill className="object-contain" unoptimized />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                            <EyeIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-80 transition" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-border px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">Thumbnail {i + 1}</span>
                          <div className="flex gap-1">
                            <button onClick={() => setPreviewImage(img)} className="flex h-7 items-center rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted"><EyeIcon className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDownload(img.url, `thumbnail-${i + 1}.png`)} className="flex h-7 items-center rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted"><DownloadIcon className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setActiveJobId(null)}><XIcon className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={previewImage.url} alt="Preview" width={1280} height={720} className="max-h-[80vh] w-auto rounded-2xl object-contain" unoptimized style={{ width: "auto", height: "auto" }} />
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => handleDownload(previewImage.url, "thumbnail.png")} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"><DownloadIcon className="h-4 w-4" /> Download</button>
              <button onClick={() => setPreviewImage(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"><XIcon className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
