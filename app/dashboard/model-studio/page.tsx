"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  UploadIcon, XIcon, SparklesIcon, ImageIcon, Loader2Icon, DownloadIcon,
  EyeIcon, PlusIcon, Trash2Icon, ChevronDownIcon, UserIcon, MountainIcon,
  ShirtIcon, WandSparklesIcon, LayoutGridIcon, CameraIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { useGenerationQueue } from "@/contexts/generation-queue"
import type { ImageModel, AspectRatio, GeneratedImage } from "@/lib/api/google-flow"
import { POSES, POSE_CATEGORIES } from "@/lib/data/poses"

/* ─── Types ─── */
interface UploadedImage { file: File; preview: string }
type SlotKey = "model" | "background" | "product"

/* ─── Presets ─── */
const STYLE_PRESETS = [
  { id: "editorial", label: "Fashion Editorial", icon: "📸", prompt: "high fashion editorial photography, professional model, dramatic lighting, magazine quality" },
  { id: "catalog", label: "Katalog", icon: "🛍️", prompt: "clean product catalog photography, model wearing product, white background, commercial" },
  { id: "social", label: "Social Media", icon: "📱", prompt: "trendy social media content, lifestyle photography, vibrant colors, instagram aesthetic" },
  { id: "outdoor", label: "Outdoor", icon: "🌿", prompt: "outdoor lifestyle photography, natural lighting, scenic background, candid feel" },
  { id: "studio", label: "Studio Pro", icon: "🎬", prompt: "professional studio photography, controlled lighting, seamless background, high-end" },
  { id: "street", label: "Street Style", icon: "🏙️", prompt: "urban street style photography, city backdrop, candid fashion, modern aesthetic" },
]

const ASPECT_RATIOS: AspectRatio[] = ["3:4", "1:1", "4:3", "9:16", "16:9"]
const IMAGE_COUNTS = [1, 2, 3, 4]
const MODELS: { id: ImageModel; name: string; icon: string; maxRefs: number }[] = [
  { id: "imagen-4", name: "Imagen 4", icon: "✨", maxRefs: 3 },
  { id: "nano-banana-2", name: "Nano Banana 2", icon: "🔥", maxRefs: 10 },
  { id: "nano-banana-pro", name: "Nano Banana Pro", icon: "🚀", maxRefs: 10 },
]

const SLOT_CONFIG: { key: SlotKey; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: "model", label: "Model / Orang", icon: <UserIcon className="h-5 w-5" />, hint: "Foto model atau orang" },
  { key: "background", label: "Background", icon: <MountainIcon className="h-5 w-5" />, hint: "Latar belakang scene" },
  { key: "product", label: "Produk", icon: <ShirtIcon className="h-5 w-5" />, hint: "Baju, aksesoris, dll" },
]

export default function ModelStudioPage() {
  const [slots, setSlots] = useState<Record<SlotKey, UploadedImage | null>>({ model: null, background: null, product: null })
  const [selectedStyle, setSelectedStyle] = useState(0)
  const [selectedPose, setSelectedPose] = useState<string | null>(null)
  const [poseCategory, setPoseCategory] = useState("Semua")
  const [customPrompt, setCustomPrompt] = useState("")
  const [selectedRatio, setSelectedRatio] = useState(0)
  const [selectedModel, setSelectedModel] = useState(1)
  const [imageCount, setImageCount] = useState(0)
  const [showModelDD, setShowModelDD] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  const fileRefs = useRef<Record<SlotKey, HTMLInputElement | null>>({ model: null, background: null, product: null })
  const ddRef = useRef<HTMLDivElement>(null)

  const { jobs, submitJob } = useGenerationQueue()
  const currentModel = MODELS[selectedModel]
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : null
  const isGenerating = activeJob?.status === "uploading" || activeJob?.status === "generating"
  const generatedImages = activeJob?.status === "done" ? activeJob.images : []
  const error = activeJob?.status === "error" ? activeJob.error : null
  const uploadedCount = Object.values(slots).filter(Boolean).length

  useEffect(() => {
    if (!showModelDD) return
    const handler = (e: MouseEvent) => { if (ddRef.current && !ddRef.current.contains(e.target as Node)) setShowModelDD(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showModelDD])

  const handleUpload = (key: SlotKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (slots[key]) URL.revokeObjectURL(slots[key]!.preview)
    setSlots((s) => ({ ...s, [key]: { file, preview: URL.createObjectURL(file) } }))
    if (fileRefs.current[key]) fileRefs.current[key]!.value = ""
  }

  const removeSlot = (key: SlotKey) => {
    if (slots[key]) URL.revokeObjectURL(slots[key]!.preview)
    setSlots((s) => ({ ...s, [key]: null }))
  }

  const filteredPoses = poseCategory === "Semua" ? POSES : POSES.filter((p) => p.category === poseCategory)
  const activePose = selectedPose ? POSES.find((p) => p.id === selectedPose) : null

  const buildPrompt = () => {
    const style = STYLE_PRESETS[selectedStyle]
    const parts = [customPrompt.trim(), style.prompt].filter(Boolean)
    if (activePose) parts.push(activePose.prompt)
    if (slots.model) parts.push("use the person from the reference photo as the model")
    if (slots.background) parts.push("use the background from the reference photo")
    if (slots.product) parts.push("feature the product from the reference photo")
    return parts.join(", ")
  }

  const handleGenerate = () => {
    if (uploadedCount === 0 || isGenerating) return
    const refs = Object.values(slots).filter(Boolean).map((img) => ({ file: img!.file }))
    const jobId = submitJob({ prompt: buildPrompt(), model: currentModel.id, aspectRatio: ASPECT_RATIOS[selectedRatio], count: IMAGE_COUNTS[imageCount] }, refs)
    setActiveJobId(jobId)
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(`/api/ai/image-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = blobUrl; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl)
    } catch { window.open(url, "_blank") }
  }

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[{ label: "Jenna Bot Pro", href: "/dashboard" }, { label: "Model Studio" }]} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20">
              <UserIcon className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Model Studio</h1>
              <p className="text-xs text-muted-foreground">Gabungkan model, background & produk → foto profesional</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* ── Left Panel ── */}
            <div className="lg:col-span-2 space-y-4">
              {/* 3 Upload Slots */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <UploadIcon className="h-4 w-4 text-pink-400" /> Referensi
                  <span className="text-[10px] text-muted-foreground/50 font-normal">semua opsional</span>
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {SLOT_CONFIG.map(({ key, label, icon, hint }) => (
                    <div key={key} className="flex flex-col items-center">
                      {slots[key] ? (
                        <div className="relative w-full aspect-square rounded-xl border border-border overflow-hidden group">
                          <Image src={slots[key]!.preview} alt={label} fill className="object-cover" unoptimized />
                          <button onClick={() => removeSlot(key)} className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition">
                            <XIcon className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
                            <p className="text-[8px] text-white/80 text-center">{label}</p>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => fileRefs.current[key]?.click()} className="w-full aspect-square flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground/40 transition hover:border-pink-500/40 hover:text-pink-400 hover:bg-pink-500/5">
                          <div className="opacity-50">{icon}</div>
                          <span className="text-[9px] font-medium">{label}</span>
                        </button>
                      )}
                      <input ref={(el) => { fileRefs.current[key] = el }} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload(key)} />
                      <p className="text-[8px] text-muted-foreground/40 mt-1 text-center">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Style Presets */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <CameraIcon className="h-4 w-4 text-violet-400" /> Gaya Foto
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {STYLE_PRESETS.map((s, i) => (
                    <button key={s.id} onClick={() => setSelectedStyle(i)} className={cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all text-left border", selectedStyle === i ? "bg-violet-500/15 text-violet-400 border-violet-500/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent")}>
                      <span className="text-base">{s.icon}</span><span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pose Picker */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="text-base">🕺</span> Pose
                    <span className="text-[10px] text-muted-foreground/50 font-normal">(opsional)</span>
                  </h2>
                  {selectedPose && (
                    <button onClick={() => setSelectedPose(null)} className="text-[10px] text-muted-foreground hover:text-destructive transition">Reset</button>
                  )}
                </div>
                {/* Category Tabs */}
                <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-none">
                  {POSE_CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => setPoseCategory(cat)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all border", poseCategory === cat ? "bg-pink-500/15 text-pink-400 border-pink-500/30" : "bg-transparent text-muted-foreground/60 border-transparent hover:bg-muted/30")}>{cat}</button>
                  ))}
                </div>
                {/* Pose Grid */}
                <div className="max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                  <div className="grid grid-cols-3 gap-1">
                    {filteredPoses.map((pose) => (
                      <button key={pose.id} onClick={() => setSelectedPose(selectedPose === pose.id ? null : pose.id)} className={cn("flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-center transition-all border", selectedPose === pose.id ? "bg-pink-500/15 text-pink-400 border-pink-500/30" : "bg-muted/20 text-muted-foreground hover:bg-muted/40 border-transparent")}>
                        <span className="text-lg">{pose.emoji}</span>
                        <span className="text-[8px] leading-tight font-medium">{pose.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {activePose && (
                  <div className="mt-2 rounded-lg bg-pink-500/5 border border-pink-500/10 px-2.5 py-1.5">
                    <p className="text-[9px] text-pink-400/70"><span className="font-medium">Pose:</span> {activePose.label} — {activePose.prompt}</p>
                  </div>
                )}
              </div>

              {/* Custom Prompt */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <WandSparklesIcon className="h-4 w-4 text-cyan-400" /> Instruksi
                  <span className="text-[10px] text-muted-foreground/50 font-normal">(opsional)</span>
                </h2>
                <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Contoh: model memakai jaket hitam, pose casual, di pantai saat sunset..." rows={3} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none" />
              </div>

              {/* Settings */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <LayoutGridIcon className="h-4 w-4 text-amber-400" /> Pengaturan
                </h2>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Rasio</p>
                <div className="flex gap-1.5 mb-3">
                  {ASPECT_RATIOS.map((r, i) => (
                    <button key={r} onClick={() => setSelectedRatio(i)} className={cn("flex-1 rounded-lg py-2 text-[10px] font-medium transition-all border", selectedRatio === i ? "bg-muted text-foreground border-border" : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/30")}>{r}</button>
                  ))}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Jumlah</p>
                <div className="flex gap-1.5 mb-3">
                  {IMAGE_COUNTS.map((c, i) => (
                    <button key={c} onClick={() => setImageCount(i)} className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all border", imageCount === i ? "bg-muted text-foreground border-border" : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/30")}>x{c}</button>
                  ))}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Model AI</p>
                <div className="relative" ref={ddRef}>
                  <button onClick={() => setShowModelDD(!showModelDD)} className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs font-medium text-foreground/70 transition hover:bg-muted/40">
                    <span className="flex items-center gap-2"><span>{currentModel.icon}</span><span>{currentModel.name}</span></span>
                    <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", showModelDD && "rotate-180")} />
                  </button>
                  {showModelDD && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                      {MODELS.map((m, i) => (
                        <button key={m.id} onClick={() => { setSelectedModel(i); setShowModelDD(false) }} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all", selectedModel === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                          <span>{m.icon}</span><span>{m.name}</span><span className="ml-auto text-[9px] text-muted-foreground/50">max {m.maxRefs} ref</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Generate */}
              <button onClick={handleGenerate} disabled={uploadedCount === 0 || isGenerating} className={cn("w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all", uploadedCount > 0 && !isGenerating ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 active:scale-[0.98]" : "bg-muted text-muted-foreground/40 cursor-not-allowed")}>
                {isGenerating ? (<><Loader2Icon className="h-4 w-4 animate-spin" />{activeJob?.progress || "Memproses..."}</>) : (<><SparklesIcon className="h-4 w-4" />Generate Model Photo<span className="text-[10px] opacity-70">({IMAGE_COUNTS[imageCount]} poin)</span></>)}
              </button>
            </div>

            {/* ── Right: Results ── */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card/50 p-4 min-h-[500px]">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                  <SparklesIcon className="h-4 w-4 text-pink-400" /> Hasil
                </h2>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <LottieLoading size={140} />
                    <p className="text-sm font-medium text-foreground/70 mt-2">{activeJob?.progress || "Membuat foto model..."}</p>
                    <p className="text-xs text-muted-foreground mt-1">{currentModel.name} • {STYLE_PRESETS[selectedStyle].label}</p>
                  </div>
                ) : generatedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 mb-4"><UserIcon className="h-8 w-8 opacity-20" /></div>
                    <p className="text-sm font-medium opacity-60">Hasil foto akan muncul di sini</p>
                    <p className="text-[11px] opacity-40 mt-1">Upload minimal 1 referensi dan klik Generate</p>
                  </div>
                ) : (
                  <div className={cn("grid gap-3", generatedImages.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                    {generatedImages.map((img, i) => (
                      <div key={i} className="overflow-hidden rounded-xl border border-border bg-muted/20 animate-fade-up group">
                        <div className="relative aspect-[3/4] cursor-pointer" onClick={() => setPreviewImage(img)}>
                          <Image src={img.url} alt={`Result ${i + 1}`} fill className="object-contain" unoptimized />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                            <EyeIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-80 transition" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-border px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">{img.seed ? `Seed: ${img.seed}` : `Foto ${i + 1}`}</span>
                          <div className="flex gap-1">
                            <button onClick={() => setPreviewImage(img)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"><EyeIcon className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDownload(img.url, `model-${i + 1}.png`)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"><DownloadIcon className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setActiveJobId(null)} className="shrink-0"><XIcon className="h-4 w-4" /></button>
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
            <Image src={previewImage.url} alt="Preview" width={1024} height={1024} className="max-h-[80vh] w-auto rounded-2xl object-contain" unoptimized style={{ width: "auto", height: "auto" }} />
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => handleDownload(previewImage.url, "model-photo.png")} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"><DownloadIcon className="h-4 w-4" /> Download</button>
              <button onClick={() => setPreviewImage(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"><XIcon className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
