"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import {
  SendIcon,
  VideoIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  TargetIcon,
  UserIcon,
  SmartphoneIcon,
  MessageSquareIcon,
  DownloadIcon,
  ImageIcon,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { generateImages } from "@/lib/api/google-flow"
import { CREDIT_COST_STORYBOARD } from "@/contexts/generation-queue"
import html2canvas from "html2canvas"

interface StoryboardData {
  scenes: {
    number: number
    name: string
    duration: string
    visual: string
    imagePrompt?: string
    imageUrl?: string
    narasi: string
    teksOverlay: string
    keterangan: string
  }[]
  benefitUtama: string[]
  caraPakai: { step: number; title: string; description: string }[]
  produkInfo: string[]
  ctaOptions: string[]
}

export default function StoryboardPage() {
  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [duration, setDuration] = useState("15-30 detik")
  const [modelImage, setModelImage] = useState<File | null>(null)
  const [productImage, setProductImage] = useState<File | null>(null)

  const [isGeneratingJSON, setIsGeneratingJSON] = useState(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null)
  const [imagesProgress, setImagesProgress] = useState(0)
  const [totalImages, setTotalImages] = useState(0)
  const [finalCollageUrl, setFinalCollageUrl] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<StoryboardData | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const storyboardRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName || !description) return

    setIsGeneratingJSON(true)
    setError(null)
    setResult(null)
    setFinalCollageUrl(null)
    setUploadProgressText(null)

    try {
      // 0. Pre-upload references if any
      const uploadedReferences: string[] = []
      let pinnedEmail: string | undefined = undefined

      if (modelImage || productImage) {
        setUploadProgressText("Mengunggah gambar referensi (model & produk)...")
        const { uploadImageAsset } = await import("@/lib/api/google-flow")

        if (modelImage) {
          const res = await uploadImageAsset(modelImage, pinnedEmail)
          uploadedReferences.push(res.mediaGenerationId)
          pinnedEmail = res.email
        }
        if (productImage) {
          const res = await uploadImageAsset(productImage, pinnedEmail)
          uploadedReferences.push(res.mediaGenerationId)
          pinnedEmail = res.email
        }
        setUploadProgressText(null)
      }

      // 1. Generate JSON structure using OpenAI (costs 2 credits)
      const res = await fetch("/api/ai/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          description,
          targetAudience,
          duration,
          scenesCount: 5,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal membuat skenario storyboard")

      const storyboardData: StoryboardData = data.data
      setResult(storyboardData)
      setIsGeneratingJSON(false)

      // 2. Generate images for each scene using Nano Banana Pro (skipped credit deduction because we paid 2 credits above)
      if (storyboardData.scenes && storyboardData.scenes.length > 0) {
        setIsGeneratingImages(true)
        setTotalImages(storyboardData.scenes.length)
        setImagesProgress(0)

        const updatedScenes = [...storyboardData.scenes]

        // Process sequentially to not overload the API limit
        for (let i = 0; i < updatedScenes.length; i++) {
          const scene = updatedScenes[i]
          if (scene.imagePrompt) {
            try {
              const imgResult = await generateImages({
                prompt: scene.imagePrompt,
                model: "nano-banana-pro",
                aspectRatio: "16:9",
                count: 1,
                references: uploadedReferences.length > 0 ? uploadedReferences : undefined,
                email: pinnedEmail,
              })

              if (imgResult.images && imgResult.images.length > 0) {
                const rawUrl = imgResult.images[0].url
                // Fetch as blob to prevent html2canvas CORS issues
                try {
                  const proxyUrl = `/api/ai/image-download?url=${encodeURIComponent(rawUrl)}&filename=scene.png`
                  const blobRes = await fetch(proxyUrl)
                  if (blobRes.ok) {
                    const blob = await blobRes.blob()
                    updatedScenes[i].imageUrl = URL.createObjectURL(blob)
                  } else {
                    updatedScenes[i].imageUrl = rawUrl
                  }
                } catch {
                  updatedScenes[i].imageUrl = rawUrl
                }
              }
            } catch (err) {
              console.error(`Failed to generate image for scene ${i + 1}:`, err)
              // We'll just leave it empty if it fails so it doesn't break the whole app
            }
          }
          setImagesProgress(prev => prev + 1)
          setResult({ ...storyboardData, scenes: updatedScenes })
        }

        setIsGeneratingImages(false)
        setIsFinalizing(true)

        // Wait for DOM to flush and images to render, then snap the collage
        setTimeout(async () => {
          if (storyboardRef.current) {
            try {
              const canvas = await html2canvas(storyboardRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
              })
              setFinalCollageUrl(canvas.toDataURL("image/png"))
            } catch (err) {
              console.error("Failed to snap collage", err)
            }
          }
          setIsFinalizing(false)
        }, 1500)
      } else {
        // No scenes
        setIsFinalizing(false)
      }

    } catch (err: any) {
      setError(err.message)
      setIsGeneratingJSON(false)
      setIsGeneratingImages(false)
      setIsFinalizing(false)
      setUploadProgressText(null)
    }
  }

  const handleDownloadImage = async () => {
    if (!finalCollageUrl) return
    try {
      const link = document.createElement("a")
      link.download = `Storyboard_${productName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`
      link.href = finalCollageUrl
      link.click()
    } catch (err) {
      console.error("Failed to download", err)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Video Tools", href: "/dashboard" },
        { label: "Storyboard" },
      ]} />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {!result && !isGeneratingJSON && !isGeneratingImages && !isFinalizing && (
          <div className="mx-auto w-full max-w-2xl animate-fade-up">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Storyboard Generator</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Racik skenario iklan profesional dan generate gambar referensi otomatis dalam hitungan detik.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="relative overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-blue-500/10 pointer-events-none" />
              
              <div className="relative space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-200">Nama Produk / Jasa</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="misal: Semir Ban Kilap Super"
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-200">Deskripsi & Keunggulan Produk</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="misal: Membuat ban hitam mengkilap seperti baru, tahan air, awet 2 minggu..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-200">Target Audiens</label>
                    <input
                      type="text"
                      required
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="misal: Anak motor, usia 18-35th"
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-200">Durasi Estimasi</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                    >
                      <option value="15-30 detik">15 - 30 Detik (TikTok/Reels)</option>
                      <option value="30-60 detik">30 - 60 Detik</option>
                      <option value="1-3 menit">1 - 3 Menit (YouTube)</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-violet-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">Referensi Visual <span className="text-xs font-normal text-zinc-400">(Opsional)</span></h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-zinc-400">Referensi Wajah Model</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => setModelImage(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-violet-300 hover:file:bg-violet-500/30 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-zinc-400">Referensi Produk</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-violet-300 hover:file:bg-violet-500/30 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                  <span className="flex h-5 items-center justify-center rounded-md bg-white/10 px-2 text-[10px] font-bold text-white">2</span>
                  Kredit per generate
                </p>
                <button
                  type="submit"
                  disabled={isGeneratingJSON || isGeneratingImages}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50"
                >
                  <SendIcon className="h-4 w-4" />
                  Generate Storyboard
                </button>
              </div>
            </form>
          </div>
        )}

        {(isGeneratingJSON || isGeneratingImages || isFinalizing) && (
          <div className="flex h-full flex-col items-center justify-center animate-fade-up">
            <LottieLoading size={160} />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              {uploadProgressText ? "Mengunggah Referensi..." :
                isGeneratingJSON ? "Meracik Skenario Storyboard..." :
                  isGeneratingImages ? `Melukis Scene Visual (${imagesProgress}/${totalImages})...` :
                    "Menyatukan Gambar Storyboard..."}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">
              {uploadProgressText ||
                (isGeneratingJSON ? "AI (OpenAI) sedang menyusun teks narasi dan prompt gambar..." :
                  isGeneratingImages ? "Nano Banana Pro sedang melukis gambar secara spesifik untuk tiap adegan. Ini memakan waktu ~10 detik per gambar." :
                    "Tahap akhir! Menyusun teks dan gambar menjadi satu kesatuan infografis yang indah.")}
            </p>
          </div>
        )}

        {finalCollageUrl && !isGeneratingJSON && !isGeneratingImages && !isFinalizing && (
          <div className="mx-auto max-w-4xl animate-fade-up">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setResult(null)
                  setFinalCollageUrl(null)
                }}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Kembali Buat Baru
              </button>

              <button
                onClick={handleDownloadImage}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <DownloadIcon className="h-4 w-4" />
                Download Gambar Final
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <Image
                src={finalCollageUrl}
                alt="Generated Storyboard Collage"
                width={2000}
                height={2000}
                className="w-full object-contain"
                unoptimized
              />
            </div>

            <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-500">
              <strong>Info:</strong> Gambar ini adalah gabungan teks pintar dari OpenAI dan visual indah dari Nano Banana Pro. Anda bisa membagikan gambar ini langsung ke tim Anda!
            </div>
          </div>
        )}

        {/* ─── HIDDEN Storyboard Document for html2canvas ─── */}
        <div className="absolute top-[-9999px] left-[-9999px] opacity-0 pointer-events-none">
          {result && (
            <div ref={storyboardRef} className="w-[1200px] overflow-hidden bg-white text-black">

              {/* Header */}
              <div className="bg-zinc-950 p-6 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold tracking-widest text-zinc-400 print:text-zinc-500">STORYBOARD</h2>
                    <h1 className="mt-1 text-2xl font-black uppercase tracking-wider">{productName}</h1>
                    <div className="mt-3 inline-flex items-center rounded-full bg-[#8cc63f] px-3 py-1 text-xs font-bold text-black print:bg-zinc-200">
                      DURASI {duration.toUpperCase()} ({result.scenes.length} SCENE)
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-zinc-400 print:text-zinc-500">STYLE: UGC DEMO REVIEW</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-800 pt-4 print:border-zinc-200">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <TargetIcon className="h-4 w-4 text-[#ef4444]" />
                    <span className="text-zinc-300 print:text-zinc-600">AUDIENS:</span> {targetAudience || "Umum"}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <UserIcon className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-300 print:text-zinc-600">TALENT:</span> Sesuai Konsep
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <MessageSquareIcon className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-300 print:text-zinc-600">BAHASA:</span> Indonesia
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <SmartphoneIcon className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-300 print:text-zinc-600">FORMAT:</span> 9:16 (Vertikal)
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm print:text-[11px]">
                  <thead className="bg-zinc-900 text-xs font-semibold uppercase text-white print:bg-zinc-100 print:text-black">
                    <tr>
                      <th className="px-4 py-3 text-center w-20">SCENE</th>
                      <th className="px-4 py-3 w-24">DURASI</th>
                      <th className="px-4 py-3 w-[25%]">VISUAL</th>
                      <th className="px-4 py-3 w-[20%]">NARASI (VOICE OVER)</th>
                      <th className="px-4 py-3 w-[15%]">TEKS OVERLAY</th>
                      <th className="px-4 py-3 w-[20%]">KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 print:divide-zinc-300">
                    {result.scenes.map((scene, i) => (
                      <tr key={i} className="group hover:bg-zinc-50 print:break-inside-avoid">
                        <td className="px-4 py-4 text-center align-top">
                          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#8cc63f] text-sm font-bold text-white print:border print:border-black print:text-black print:bg-transparent">
                            {scene.number}
                          </div>
                          <div className="mt-2 text-[10px] font-bold uppercase leading-tight text-zinc-500 print:text-black">
                            {scene.name}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top font-medium uppercase text-zinc-900">{scene.duration}</td>
                        <td className="px-4 py-4 align-top text-zinc-600 print:text-black">
                          {scene.imageUrl ? (
                            <div className="mb-3 w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 print:border-black">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={scene.imageUrl} alt={scene.name} className="w-full object-cover aspect-video" />
                            </div>
                          ) : isGeneratingImages ? (
                            <div className="mb-3 w-full flex aspect-video items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 print:border-black animate-pulse">
                              <ImageIcon className="h-6 w-6 text-zinc-300" />
                            </div>
                          ) : null}
                          <div className="text-xs">{scene.visual}</div>
                        </td>
                        <td className="px-4 py-4 align-top italic text-zinc-900">&quot;{scene.narasi}&quot;</td>
                        <td className="px-4 py-4 align-top">
                          <div className="rounded bg-zinc-950 p-2 text-center text-xs font-black uppercase text-white print:border print:border-black print:bg-transparent print:text-black">
                            {scene.teksOverlay}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-zinc-500 print:text-black">{scene.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Info */}
              <div className="grid grid-cols-1 divide-y divide-zinc-200 border-t border-zinc-200 bg-zinc-50 md:grid-cols-4 md:divide-x md:divide-y-0 print:grid-cols-4 print:divide-x print:divide-y-0 print:border-t-2 print:border-black">

                <div className="p-4 print:p-2">
                  <div className="mb-3 border-b-2 border-[#ef4444] pb-1 text-xs font-bold uppercase text-zinc-900">BENEFIT UTAMA</div>
                  <ul className="space-y-1.5 text-[11px] text-zinc-600 print:text-black">
                    {result.benefitUtama.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2Icon className="mt-0.5 h-3 w-3 shrink-0 text-[#8cc63f]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 print:p-2">
                  <div className="mb-3 border-b-2 border-orange-500 pb-1 text-xs font-bold uppercase text-zinc-900">CARA PAKAI SINGKAT</div>
                  <div className="space-y-2">
                    {result.caraPakai.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#8cc63f] text-[9px] font-bold text-white print:border print:border-black print:bg-transparent print:text-black">
                          {c.step}
                        </div>
                        <div>
                          <p className="font-bold uppercase text-zinc-900">{c.title}</p>
                          <p className="text-zinc-600 print:text-black">{c.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 print:p-2">
                  <div className="mb-3 border-b-2 border-blue-500 pb-1 text-xs font-bold uppercase text-zinc-900">PRODUK INFO</div>
                  <ul className="list-inside list-disc space-y-1 text-[11px] text-zinc-600 print:text-black">
                    {result.produkInfo.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 print:p-2">
                  <div className="mb-3 border-b-2 border-purple-500 pb-1 text-xs font-bold uppercase text-zinc-900">CTA OPTIONS</div>
                  <ul className="space-y-1.5 text-[11px] font-medium text-zinc-900">
                    {result.ctaOptions.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 rounded border border-zinc-200 bg-white p-1.5 print:bg-transparent">
                        <TargetIcon className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
