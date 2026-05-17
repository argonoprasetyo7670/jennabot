"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  UploadIcon,
  XIcon,
  SparklesIcon,
  ImageIcon,
  Loader2Icon,
  DownloadIcon,
  EyeIcon,
  ImagePlusIcon,
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
  WandSparklesIcon,
  SunIcon,
  PaletteIcon,
  LayoutGridIcon,
  CameraIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { useGenerationQueue } from "@/contexts/generation-queue"
import type { ImageModel, AspectRatio, GeneratedImage } from "@/lib/api/google-flow"

/* ─── Preset Scenes ─── */
const SCENE_PRESETS = [
  { id: "clean-white", label: "Clean White", icon: "⬜", prompt: "product photography on clean white background, studio lighting, minimalist, high-end commercial photo" },
  { id: "natural-light", label: "Natural Light", icon: "☀️", prompt: "product photography with soft natural window light, clean surface, warm tones, lifestyle shot" },
  { id: "gradient", label: "Gradient BG", icon: "🌈", prompt: "product photography on smooth gradient background, modern, vibrant, studio quality" },
  { id: "lifestyle", label: "Lifestyle", icon: "🏠", prompt: "product photography in lifestyle setting, cozy interior, natural environment, aesthetic" },
  { id: "outdoor", label: "Outdoor", icon: "🌿", prompt: "product photography in outdoor natural setting, plants, greenery, sunlight, fresh aesthetic" },
  { id: "dark-luxury", label: "Dark Luxury", icon: "🖤", prompt: "product photography on dark background, dramatic lighting, luxury feel, premium, moody" },
  { id: "marble", label: "Marble", icon: "🪨", prompt: "product photography on marble surface, elegant, luxury, high-end, clean composition" },
  { id: "flat-lay", label: "Flat Lay", icon: "📐", prompt: "flat lay product photography, top-down view, arranged props, aesthetic composition" },
]

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "4:3", "3:4", "16:9", "9:16"]
const MODELS: { id: ImageModel; name: string; icon: string; maxRefs: number }[] = [
  { id: "imagen-4", name: "Imagen 4", icon: "✨", maxRefs: 3 },
  { id: "nano-banana-2", name: "Nano Banana 2", icon: "🔥", maxRefs: 10 },
  { id: "nano-banana-pro", name: "Nano Banana Pro", icon: "🚀", maxRefs: 10 },
]

interface ProductImage {
  file: File
  preview: string
}

export default function ProductStudioPage() {
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [selectedScene, setSelectedScene] = useState(0)
  const [customPrompt, setCustomPrompt] = useState("")
  const [selectedRatio, setSelectedRatio] = useState(0) // 1:1 default
  const [selectedModel, setSelectedModel] = useState(1) // nano-banana-2
  const [imageCount, setImageCount] = useState(0) // index 0 = x1
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const { jobs, submitJob } = useGenerationQueue()
  const currentModel = MODELS[selectedModel]
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : null
  const isGenerating = activeJob?.status === "uploading" || activeJob?.status === "generating"
  const generatedImages = activeJob?.status === "done" ? activeJob.images : []
  const error = activeJob?.status === "error" ? activeJob.error : null
  const IMAGE_COUNTS = [1, 2, 3, 4]

  // Close model dropdown on outside click
  useEffect(() => {
    if (!showModelDropdown) return
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showModelDropdown])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = currentModel.maxRefs - productImages.length
    const newImages: ProductImage[] = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setProductImages((prev) => [...prev, ...newImages])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeImage = (index: number) => {
    setProductImages((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const clearAllImages = () => {
    productImages.forEach((img) => URL.revokeObjectURL(img.preview))
    setProductImages([])
  }

  const buildPrompt = () => {
    const scene = SCENE_PRESETS[selectedScene]
    const base = customPrompt.trim()
      ? `${customPrompt.trim()}, ${scene.prompt}`
      : scene.prompt
    return base
  }

  const handleGenerate = () => {
    if (productImages.length === 0 || isGenerating) return

    const refs = productImages.map((img) => ({ file: img.file }))
    const jobId = submitJob(
      {
        prompt: buildPrompt(),
        model: currentModel.id,
        aspectRatio: ASPECT_RATIOS[selectedRatio],
        count: IMAGE_COUNTS[imageCount],
      },
      refs
    )
    setActiveJobId(jobId)
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const proxyUrl = `/api/ai/image-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["image/png", "image/jpeg", "image/webp"].includes(f.type)
    )
    const remaining = currentModel.maxRefs - productImages.length
    const newImages: ProductImage[] = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setProductImages((prev) => [...prev, ...newImages])
  }, [currentModel.maxRefs, productImages.length])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Product Studio" },
      ]} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

          {/* ── Page Title ── */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                <CameraIcon className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Product Studio</h1>
                <p className="text-xs text-muted-foreground">Upload produk → pilih scene → generate foto profesional</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* ── Left: Upload & Settings ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Upload Area */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UploadIcon className="h-4 w-4 text-violet-400" />
                    Foto Produk
                  </h2>
                  {productImages.length > 0 && (
                    <button onClick={clearAllImages} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition">
                      <Trash2Icon className="h-3 w-3" /> Hapus semua
                    </button>
                  )}
                </div>

                {productImages.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-10 cursor-pointer transition hover:border-violet-500/40 hover:bg-violet-500/5"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 mb-3">
                      <ImageIcon className="h-7 w-7 text-violet-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground/70">Upload foto produk</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Drag & drop atau klik • PNG, JPG, WebP</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Maks {currentModel.maxRefs} foto • 20MB per file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {productImages.map((img, i) => (
                        <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/30 group">
                          <Image src={img.preview} alt={`Product ${i + 1}`} fill className="object-cover" unoptimized />
                          <button
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition">
                            <p className="text-[8px] text-white/80 truncate">{img.file.name}</p>
                          </div>
                        </div>
                      ))}
                      {productImages.length < currentModel.maxRefs && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground/40 transition hover:border-violet-500/40 hover:text-violet-400"
                        >
                          <PlusIcon className="h-5 w-5" />
                          <span className="text-[9px] mt-0.5">Tambah</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {productImages.length}/{currentModel.maxRefs} foto
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Scene Presets */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <PaletteIcon className="h-4 w-4 text-blue-400" />
                  Scene / Latar
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {SCENE_PRESETS.map((scene, i) => (
                    <button
                      key={scene.id}
                      onClick={() => setSelectedScene(i)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all text-left",
                        selectedScene === i
                          ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <span className="text-base">{scene.icon}</span>
                      <span>{scene.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <WandSparklesIcon className="h-4 w-4 text-cyan-400" />
                  Instruksi Tambahan
                  <span className="text-[10px] text-muted-foreground/50 font-normal">(opsional)</span>
                </h2>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Contoh: tampilkan dengan bunga di sekitarnya, tambahkan bayangan halus..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none"
                />
              </div>

              {/* Advanced Settings */}
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <LayoutGridIcon className="h-4 w-4 text-amber-400" />
                  Pengaturan
                </h2>

                {/* Aspect Ratio */}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Rasio Gambar</p>
                <div className="flex gap-1.5 mb-3">
                  {ASPECT_RATIOS.map((ratio, i) => (
                    <button
                      key={ratio}
                      onClick={() => setSelectedRatio(i)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-[10px] font-medium transition-all border",
                        selectedRatio === i
                          ? "bg-muted text-foreground border-border"
                          : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/30"
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                {/* Image Count */}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Jumlah</p>
                <div className="flex gap-1.5 mb-3">
                  {IMAGE_COUNTS.map((count, i) => (
                    <button
                      key={count}
                      onClick={() => setImageCount(i)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-xs font-medium transition-all border",
                        imageCount === i
                          ? "bg-muted text-foreground border-border"
                          : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/30"
                      )}
                    >
                      x{count}
                    </button>
                  ))}
                </div>

                {/* Model */}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Model AI</p>
                <div className="relative" ref={modelRef}>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs font-medium text-foreground/70 transition hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2">
                      <span>{currentModel.icon}</span>
                      <span>{currentModel.name}</span>
                    </span>
                    <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", showModelDropdown && "rotate-180")} />
                  </button>
                  {showModelDropdown && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                      {MODELS.map((model, i) => (
                        <button
                          key={model.id}
                          onClick={() => { setSelectedModel(i); setShowModelDropdown(false) }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all",
                            selectedModel === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          <span>{model.icon}</span>
                          <span>{model.name}</span>
                          <span className="ml-auto text-[9px] text-muted-foreground/50">max {model.maxRefs} ref</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={productImages.length === 0 || isGenerating}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all",
                  productImages.length > 0 && !isGenerating
                    ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98]"
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    {activeJob?.progress || "Sedang memproses..."}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    Generate Foto Produk
                    <span className="text-[10px] opacity-70">({IMAGE_COUNTS[imageCount]} poin)</span>
                  </>
                )}
              </button>
            </div>

            {/* ── Right: Results ── */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card/50 p-4 min-h-[500px]">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                  <SparklesIcon className="h-4 w-4 text-violet-400" />
                  Hasil Generate
                </h2>

                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <LottieLoading size={140} />
                    <div className="text-center mt-2">
                      <p className="text-sm font-medium text-foreground/70">
                        {activeJob?.progress || "Sedang membuat foto produk..."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{currentModel.name} • {SCENE_PRESETS[selectedScene].label}</p>
                    </div>
                  </div>
                ) : generatedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 mb-4">
                      <CameraIcon className="h-8 w-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium opacity-60">Hasil foto akan muncul di sini</p>
                    <p className="text-[11px] opacity-40 mt-1">Upload produk dan klik Generate</p>
                  </div>
                ) : (
                  <div className={cn(
                    "grid gap-3",
                    generatedImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {generatedImages.map((img, i) => (
                      <div key={i} className="overflow-hidden rounded-xl border border-border bg-muted/20 animate-fade-up group">
                        <div className="relative aspect-square cursor-pointer" onClick={() => setPreviewImage(img)}>
                          <Image src={img.url} alt={`Product ${i + 1}`} fill className="object-contain" unoptimized />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                            <EyeIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-80 transition" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-border px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">
                            {img.seed !== undefined ? `Seed: ${img.seed}` : `Foto ${i + 1}`}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPreviewImage(img)}
                              className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Lihat</span>
                            </button>
                            <button
                              onClick={() => handleDownload(img.url, `product-${i + 1}.png`)}
                              className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                              <DownloadIcon className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setActiveJobId(null)} className="shrink-0 text-red-400/60 hover:text-red-400">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={previewImage.url} alt="Preview" width={1024} height={1024} className="max-h-[80vh] w-auto rounded-2xl object-contain" unoptimized style={{ width: "auto", height: "auto" }} />
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => handleDownload(previewImage.url, "product-photo.png")} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm transition hover:bg-white/20">
                <DownloadIcon className="h-4 w-4" /> Download
              </button>
              <button onClick={() => setPreviewImage(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
