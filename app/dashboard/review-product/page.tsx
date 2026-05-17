"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  SendIcon, Loader2Icon, DownloadIcon, XIcon, UserIcon,
  ImageIcon, PackageIcon, VideoIcon, UploadCloudIcon, PlayIcon, BookmarkIcon, CheckIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { CREDIT_COST_IMAGE, CREDIT_COST_VIDEO } from "@/contexts/generation-queue"
import {
  uploadImageAsset, generateImages, generateVideos,
  type GeneratedImage, type GeneratedVideo,
} from "@/lib/api/google-flow"

/* ─── Types ─── */
interface SlotImage { file: File; preview: string }
type SlotKey = "model" | "background" | "product"
type Phase = "idle" | "composing" | "uploading-ref" | "generating-image" | "generating-video" | "done" | "error"

const SLOTS: { key: SlotKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "model", label: "Model / Talent", icon: <UserIcon className="h-6 w-6" />, color: "violet" },
  { key: "background", label: "Background", icon: <ImageIcon className="h-6 w-6" />, color: "blue" },
  { key: "product", label: "Produk", icon: <PackageIcon className="h-6 w-6" />, color: "amber" },
]

const COLORS: Record<string, { border: string; bg: string; text: string; ring: string }> = {
  violet: { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/30" },
  blue: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/30" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/30" },
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: "", composing: "Menggabungkan gambar...", "uploading-ref": "Mengupload referensi...",
  "generating-image": "Membuat gambar review...",
  "generating-video": "Membuat video (60-180 detik)...", done: "Selesai!", error: "Gagal",
}

/* ─── Option Presets ─── */
const ENVIRONMENTS = [
  { id: "meja", label: "🪑 Meja", prompt: "sitting at a table" },
  { id: "kursi", label: "💺 Kursi", prompt: "sitting on a chair" },
  { id: "sofa", label: "🛋️ Sofa", prompt: "sitting on a sofa" },
  { id: "rak", label: "📚 Rak Display", prompt: "standing next to a display shelf" },
  { id: "studio", label: "🎬 Studio", prompt: "in a clean studio setup" },
  { id: "outdoor", label: "🌿 Outdoor", prompt: "in an outdoor setting" },
  { id: "dapur", label: "🍳 Dapur", prompt: "in a kitchen" },
  { id: "kasir", label: "🏪 Toko", prompt: "at a store counter" },
]

const POSES = [
  { id: "berdiri", label: "🧍 Berdiri", prompt: "standing upright" },
  { id: "duduk", label: "🪑 Duduk", prompt: "sitting down" },
  { id: "bersandar", label: "😌 Bersandar", prompt: "leaning casually" },
  { id: "setengah-badan", label: "👤 Setengah Badan", prompt: "half-body shot, waist up" },
  { id: "closeup", label: "🔍 Close-up", prompt: "close-up framing" },
]

const ACTIONS = [
  { id: "memegang", label: "✋ Memegang", prompt: "holding the product" },
  { id: "menunjuk", label: "👆 Menunjukkan", prompt: "pointing at and showing the product" },
  { id: "menggunakan", label: "🤲 Menggunakan", prompt: "actively using the product" },
  { id: "membuka", label: "📦 Membuka", prompt: "unboxing and opening the product" },
  { id: "membandingkan", label: "⚖️ Membandingkan", prompt: "comparing the product" },
  { id: "meletakkan", label: "📐 Meletakkan", prompt: "placing the product on the table" },
]

const LANGUAGES = [
  { id: "id", label: "🇮🇩 Indonesia", prompt: "speaking in Indonesian (Bahasa Indonesia)" },
  { id: "en", label: "🇺🇸 English", prompt: "speaking in English" },
  { id: "ms", label: "🇲🇾 Melayu", prompt: "speaking in Malay" },
  { id: "zh", label: "🇨🇳 中文", prompt: "speaking in Chinese Mandarin" },
  { id: "ja", label: "🇯🇵 日本語", prompt: "speaking in Japanese" },
  { id: "ko", label: "🇰🇷 한국어", prompt: "speaking in Korean" },
  { id: "ar", label: "🇸🇦 العربية", prompt: "speaking in Arabic" },
]

export default function ReviewProductPage() {
  const [slots, setSlots] = useState<Record<SlotKey, SlotImage | null>>({ model: null, background: null, product: null })
  const [customPrompt, setCustomPrompt] = useState("")
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null)
  const [selectedPose, setSelectedPose] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState("id")
  const [phase, setPhase] = useState<Phase>("idle")
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null)
  const [savedImage, setSavedImage] = useState(false)
  const [savedVideo, setSavedVideo] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [savingVideo, setSavingVideo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null)

  const allReady = slots.model && slots.background && slots.product
  const isProcessing = phase !== "idle" && phase !== "done" && phase !== "error"
  const creditCost = CREDIT_COST_IMAGE + CREDIT_COST_VIDEO

  const handleSlotUpload = (key: SlotKey) => { setActiveSlot(key); fileInputRef.current?.click() }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeSlot) return
    const old = slots[activeSlot]
    if (old) URL.revokeObjectURL(old.preview)
    setSlots((p) => ({ ...p, [activeSlot]: { file, preview: URL.createObjectURL(file) } }))
    if (fileInputRef.current) fileInputRef.current.value = ""
    setActiveSlot(null)
  }

  const clearSlot = (key: SlotKey) => {
    const old = slots[key]
    if (old) URL.revokeObjectURL(old.preview)
    setSlots((p) => ({ ...p, [key]: null }))
  }

  useEffect(() => {
    return () => { Object.values(slots).forEach((s) => { if (s) URL.revokeObjectURL(s.preview) }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ─── Canvas Composite ─── */
  const loadImg = (file: File): Promise<HTMLImageElement> =>
    new Promise((res, rej) => {
      const img = document.createElement("img")
      img.onload = () => res(img); img.onerror = rej
      img.src = URL.createObjectURL(file)
    })

  const createComposite = async (): Promise<File> => {
    const imgs = await Promise.all([loadImg(slots.model!.file), loadImg(slots.background!.file), loadImg(slots.product!.file)])
    const W = 512, H = 680, LBL = 32, GAP = 4
    const canvas = document.createElement("canvas")
    canvas.width = W; canvas.height = (H + LBL) * 3 + GAP * 2
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height)
    const labels = ["MODEL", "BACKGROUND", "PRODUCT"]
    imgs.forEach((img, i) => {
      const y = i * (H + LBL + GAP)
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"
      ctx.fillText(labels[i], W / 2, y + 22)
      const s = Math.min(W / img.width, H / img.height)
      const dw = img.width * s, dh = img.height * s
      ctx.drawImage(img, (W - dw) / 2, y + LBL + (H - dh) / 2, dw, dh)
    })
    imgs.forEach((img) => URL.revokeObjectURL(img.src))
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.92))
    return new File([blob], "composite.jpg", { type: "image/jpeg" })
  }

  /* ─── 2-Step Pipeline: Image → Video ─── */
  const handleGenerate = async () => {
    if (!allReady || isProcessing) return
    setError(null); setGeneratedImage(null); setGeneratedVideo(null)
    setSavedImage(false); setSavedVideo(false)

    const extra = customPrompt.trim()
    const envOpt = ENVIRONMENTS.find((e) => e.id === selectedEnv)
    const poseOpt = POSES.find((p) => p.id === selectedPose)
    const actionOpt = ACTIONS.find((a) => a.id === selectedAction)

    const optParts = [
      poseOpt ? `The model is ${poseOpt.prompt}` : "The model is standing",
      envOpt ? envOpt.prompt : "",
      actionOpt ? actionOpt.prompt : "holding the product",
    ].filter(Boolean).join(", ")

    const langOpt = LANGUAGES.find((l) => l.id === selectedLang) || LANGUAGES[0]

    const imagePrompt = `Professional product review photo, portrait orientation. A person identical to the MODEL in the reference is in the exact BACKGROUND from the reference. ${optParts}, showcasing the exact PRODUCT from the reference. Enthusiastic expression, product visible prominently. Photorealistic, studio lighting, high detail, 4K quality.${extra ? ` ${extra}` : ""}`
    const videoPrompt = `Smooth cinematic product review video, portrait format. The person is ${poseOpt?.prompt || "standing"} ${envOpt ? envOpt.prompt : ""}, ${actionOpt?.prompt || "holding the product"}, examining it from multiple angles, showing details to camera, ${langOpt.prompt}, speaking enthusiastically and naturally. Natural movements, professional lighting, smooth camera.${extra ? ` ${extra}` : ""}`

    try {
      // Step 1: Compose images
      setPhase("composing")
      const compositeFile = await createComposite()

      // Step 2: Upload composite as reference
      setPhase("uploading-ref")
      const uploadResult = await uploadImageAsset(compositeFile)
      const refId = uploadResult.mediaGenerationId
      const email = uploadResult.email

      // Step 3: Generate image from reference
      setPhase("generating-image")
      const imgResult = await generateImages({
        prompt: imagePrompt, model: "nano-banana-2", aspectRatio: "3:4", count: 1,
        references: [refId], email,
      })
      const img = imgResult.images[0]
      if (!img) throw new Error("Gagal membuat gambar")
      setGeneratedImage(img)

      // Step 4: Generate video from image (I2V)
      // Use the generated image's mediaGenerationId directly — it's already in Google Flow
      setPhase("generating-video")
      const vidResult = await generateVideos({
        prompt: videoPrompt, model: "veo-3.1-fast", aspectRatio: "portrait",
        duration: 8, count: 1,
        startImage: img.mediaGenerationId,
        email, // same account as image generation
      })
      const vid = vidResult.videos[0]
      if (!vid) throw new Error("Gagal membuat video")
      setGeneratedVideo(vid)

      // Step 6: Deduct credits (image + video)
      await fetch("/api/credits", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: creditCost, feature: "review-product", description: "Review Product (image + video)" }),
      })
      window.dispatchEvent(new CustomEvent("credits-updated"))

      setPhase("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
      setPhase("error")
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const route = filename.endsWith(".mp4") ? "/api/ai/video-download" : "/api/ai/image-download"
      const res = await fetch(`${route}?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = blobUrl; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch { window.open(url, "_blank") }
  }

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Video Tools", href: "/dashboard" },
        { label: "Review Product" },
      ]} />
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400">
              <VideoIcon className="h-4 w-4" /> AI Review Video
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Review Product</h1>
            <p className="mt-2 text-sm text-muted-foreground">Upload model, background, dan produk — AI membuat gambar lalu video review</p>
          </div>

          {/* Upload Slots */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            {SLOTS.map((slot) => {
              const img = slots[slot.key]; const c = COLORS[slot.color]
              return (
                <div key={slot.key} className="flex flex-col items-center">
                  <span className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", c.text)}>{slot.label}</span>
                  {img ? (
                    <div className={cn("group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2", c.border, c.ring, "ring-1")}>
                      <Image src={img.preview} alt={slot.label} fill className="object-cover" unoptimized />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => handleSlotUpload(slot.key)} className="flex h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-xs text-white backdrop-blur-sm hover:bg-white/30">
                          <UploadCloudIcon className="h-3.5 w-3.5" /> Ganti
                        </button>
                        <button onClick={() => clearSlot(slot.key)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/30 text-white backdrop-blur-sm hover:bg-red-500/50">
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => handleSlotUpload(slot.key)} className={cn("flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all hover:scale-[1.02]", c.border, "bg-card/50")}>
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", c.bg, c.text)}>{slot.icon}</div>
                      <p className="text-xs font-medium text-foreground/70">Upload {slot.label}</p>
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Option Selectors */}
          <div className="mb-6 space-y-4">
            {/* Lingkungan */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🏠 Lingkungan</label>
              <div className="flex flex-wrap gap-2">
                {ENVIRONMENTS.map((env) => (
                  <button key={env.id} onClick={() => setSelectedEnv(selectedEnv === env.id ? null : env.id)}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedEnv === env.id ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                    {env.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Pose */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🧍 Pose</label>
              <div className="flex flex-wrap gap-2">
                {POSES.map((pose) => (
                  <button key={pose.id} onClick={() => setSelectedPose(selectedPose === pose.id ? null : pose.id)}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedPose === pose.id ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                    {pose.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Aksi */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🤲 Aksi</label>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((act) => (
                  <button key={act.id} onClick={() => setSelectedAction(selectedAction === act.id ? null : act.id)}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedAction === act.id ? "border-amber-500 bg-amber-500/20 text-amber-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Bahasa */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🌐 Bahasa</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button key={lang.id} onClick={() => setSelectedLang(lang.id)}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedLang === lang.id ? "border-green-500 bg-green-500/20 text-green-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instruksi Tambahan <span className="font-normal">(opsional)</span></label>
            <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Contoh: review santai, fokus kemasan, gaya TikTok..." rows={2}
              className="w-full resize-none rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
          </div>

          {/* Generate Button */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <button onClick={handleGenerate} disabled={!allReady || isProcessing}
              className={cn("flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all",
                allReady && !isProcessing ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40" : "bg-muted text-muted-foreground/40 cursor-not-allowed")}>
              {isProcessing ? <><Loader2Icon className="h-4 w-4 animate-spin" /> {PHASE_LABELS[phase]}</> : <><SendIcon className="h-4 w-4" /> Generate Review</>}
            </button>
            <span className="text-[11px] text-muted-foreground">
              {CREDIT_COST_IMAGE} credits (gambar) + {CREDIT_COST_VIDEO} credits (video) = <span className="text-foreground/60 font-medium">{creditCost} credits</span>
            </span>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="mb-8 flex flex-col items-center gap-3 animate-fade-up">
              <LottieLoading size={120} />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground/70">{PHASE_LABELS[phase]}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  {["composing", "uploading-ref", "generating-image", "generating-video"].map((p, i) => (
                    <div key={p} className={cn("h-1.5 flex-1 rounded-full transition-all", {
                      "bg-violet-500": ["composing", "uploading-ref", "generating-image", "generating-video"].indexOf(phase) >= i,
                      "bg-muted": ["composing", "uploading-ref", "generating-image", "generating-video"].indexOf(phase) < i,
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
              <button onClick={() => { setError(null); setPhase("idle") }} className="shrink-0 text-red-400/60 hover:text-red-400"><XIcon className="h-4 w-4" /></button>
            </div>
          )}

          {/* Results */}
          {(generatedImage || generatedVideo) && (
            <div className="mb-8 space-y-6 animate-fade-up">
              {/* Generated Image */}
              {generatedImage && (
                <div>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ImageIcon className="h-4 w-4 text-violet-400" /> Gambar Review
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card/50">
                    <div className="relative aspect-[3/4] max-h-[400px] mx-auto">
                      <Image src={generatedImage.url} alt="Generated review" fill className="object-contain" unoptimized />
                    </div>
                    <div className="flex justify-center gap-1 border-t border-border py-2">
                      <button onClick={() => handleDownload(generatedImage.url, "review-image.png")} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition">
                        <DownloadIcon className="h-3.5 w-3.5" /> Download
                      </button>
                      <button
                        disabled={savedImage || savingImage}
                        onClick={async () => {
                          setSavingImage(true)
                          try {
                            await fetch("/api/gallery/save", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ url: generatedImage.url, type: "image", prompt: customPrompt, model: "nano-banana-2", aspectRatio: "3:4", mediaGenerationId: generatedImage.mediaGenerationId }),
                            })
                            setSavedImage(true)
                          } catch { /* ignore */ } finally { setSavingImage(false) }
                        }}
                        className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition",
                          savedImage ? "text-green-400" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                      >
                        {savedImage ? <><CheckIcon className="h-3.5 w-3.5" /> Tersimpan</> : savingImage ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : <><BookmarkIcon className="h-3.5 w-3.5" /> Simpan</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Generated Video */}
              {generatedVideo && (
                <div>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <PlayIcon className="h-4 w-4 text-blue-400" /> Video Review
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card/50">
                    <div className="relative aspect-[9/16] max-h-[500px] mx-auto cursor-pointer" onClick={() => setPreviewVideo(generatedVideo)}>
                      <video src={generatedVideo.url} className="h-full w-full object-contain bg-background" muted loop autoPlay playsInline />
                    </div>
                    <div className="flex justify-center gap-1 border-t border-border py-2">
                      <button onClick={() => setPreviewVideo(generatedVideo)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition">
                        <PlayIcon className="h-3.5 w-3.5" /> Fullscreen
                      </button>
                      <button onClick={() => handleDownload(generatedVideo.url, "review-video.mp4")} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition">
                        <DownloadIcon className="h-3.5 w-3.5" /> Download
                      </button>
                      <button
                        disabled={savedVideo || savingVideo}
                        onClick={async () => {
                          setSavingVideo(true)
                          try {
                            await fetch("/api/gallery/save", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ url: generatedVideo.url, type: "video", prompt: customPrompt, model: "veo-3.1-fast", aspectRatio: "9:16" }),
                            })
                            setSavedVideo(true)
                          } catch { /* ignore */ } finally { setSavingVideo(false) }
                        }}
                        className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition",
                          savedVideo ? "text-green-400" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                      >
                        {savedVideo ? <><CheckIcon className="h-3.5 w-3.5" /> Tersimpan</> : savingVideo ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : <><BookmarkIcon className="h-3.5 w-3.5" /> Simpan</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setPreviewVideo(null)}>
          {/* Close button - top right */}
          <button onClick={() => setPreviewVideo(null)} className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition">
            <XIcon className="h-5 w-5" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <video src={previewVideo.url} className="max-h-[80vh] w-full rounded-2xl object-contain" controls autoPlay playsInline />
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => handleDownload(previewVideo.url, "review-video.mp4")} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm hover:bg-white/20">
                <DownloadIcon className="h-4 w-4" /> Download
              </button>
              <button onClick={() => setPreviewVideo(null)} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm hover:bg-white/20">
                <XIcon className="h-4 w-4" /> Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
