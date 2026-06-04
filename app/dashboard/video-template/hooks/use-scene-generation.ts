/**
 * Scene generation hook — orchestrates the composite → image → video pipeline per scene.
 *
 * KEY: Uses the same COMPOSITE APPROACH as review-product (which works well):
 * 1. Merge 3 images (model, background, product) into 1 labeled composite
 * 2. Upload 1 composite reference
 * 3. Use nano-banana-2 model (proven to work with composites)
 * 4. Short, clean prompts referencing "MODEL", "BACKGROUND", "PRODUCT"
 *
 * Integrates with GenerationQueue for bell notifications + gallery save.
 * Credits are deducted server-side on successful generation.
 */

import { useCallback } from "react"
import {
  uploadImageAsset,
  generateImages,
  generateVideos,
} from "@/lib/api/google-flow"
import type { GeneratedImage, GeneratedVideo } from "@/lib/api/google-flow"
import type { GenerationJob } from "@/contexts/generation-queue"
import type { RefImage, SceneResult } from "../types"
import type { TemplateRegistryEntry } from "@/lib/templates"

interface UseSceneGenerationProps {
  selectedTemplate: TemplateRegistryEntry | null
  modelImage: RefImage | null
  productImage: RefImage | null
  backgroundImage: RefImage | null
  dialogues: string[]
  backsound: boolean
  customPrompt: string
  sceneResults: SceneResult[]
  updateSceneResult: (index: number, updates: Partial<SceneResult>) => void
  setIsGenerating: (v: boolean) => void
  setCurrentScene: (v: number) => void
  setProgress: (v: string) => void
  /* Queue integration */
  addCustomJob: (job: GenerationJob) => void
  updateJob: (id: string, updates: Partial<GenerationJob>) => void
}

/* ─── Helper: Load image from RefImage ─── */
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Create a composite image from 3 references, labeled MODEL / BACKGROUND / PRODUCT.
 * Follows the exact same pattern as review-product (which produces good results).
 */
async function createComposite(
  modelPreview: string,
  backgroundPreview: string,
  productPreview: string
): Promise<File> {
  const imgs = await Promise.all([
    loadImg(modelPreview),
    loadImg(backgroundPreview),
    loadImg(productPreview),
  ])

  const W = 512, H = 680, LBL = 32, GAP = 4
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = (H + LBL) * 3 + GAP * 2
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const labels = ["MODEL", "BACKGROUND", "PRODUCT"]
  imgs.forEach((img, i) => {
    const y = i * (H + LBL + GAP)
    ctx.fillStyle = "#fff"
    ctx.font = "bold 18px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(labels[i], W / 2, y + 22)
    const s = Math.min(W / img.width, H / img.height)
    const dw = img.width * s, dh = img.height * s
    ctx.drawImage(img, (W - dw) / 2, y + LBL + (H - dh) / 2, dw, dh)
  })

  // Revoke object URLs for file-based images
  imgs.forEach((img) => {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src)
  })

  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.92))
  return new File([blob], "composite.jpg", { type: "image/jpeg" })
}

export function useSceneGeneration({
  selectedTemplate,
  modelImage,
  productImage,
  backgroundImage,
  dialogues,
  backsound,
  customPrompt,
  sceneResults,
  updateSceneResult,
  setIsGenerating,
  setCurrentScene,
  setProgress,
  addCustomJob,
  updateJob,
}: UseSceneGenerationProps) {

  /**
   * Main generation pipeline — all 5 scenes sequentially.
   * Each scene creates a notification job in the bell icon queue.
   */
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !modelImage || !productImage || !backgroundImage) return

    setIsGenerating(true)

    // Create a parent job ID for tracking
    const parentId = `vt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    try {
      // ── Step 1: Create composite image (same as review-product) ──
      setProgress("Menggabungkan gambar referensi...")
      setCurrentScene(0)

      const compositeFile = await createComposite(
        modelImage.preview,
        backgroundImage.preview,
        productImage.preview
      )

      // ── Step 2: Upload composite ──
      setProgress("Mengupload referensi...")
      const uploadResult = await uploadImageAsset(compositeFile)
      const refId = uploadResult.mediaGenerationId
      const email = uploadResult.email

      // ── Step 3: Generate scenes sequentially ──
      let previousSceneImageId: string | null = null

      for (let i = 0; i < selectedTemplate.template.scenes.length; i++) {
        const scene = selectedTemplate.template.scenes[i]
        const dialogue = dialogues[i] || scene.defaultDialogue
        const jobId = `${parentId}-s${i + 1}`

        setCurrentScene(i + 1)

        // Add job to notification queue
        const queueJob: GenerationJob = {
          id: jobId,
          type: "video",
          prompt: `Video Template: ${selectedTemplate.template.name} — Scene ${i + 1}`,
          model: "nano-banana-2 → veo-3.1",
          status: "uploading",
          progress: `Scene ${i + 1}: Membuat gambar...`,
          images: [],
          videos: [],
          createdAt: new Date(),
          params: { prompt: dialogue },
        }
        addCustomJob(queueJob)

        try {
          // ── Image Generation ──
          updateSceneResult(i, { status: "generating-image" })
          setProgress(`Scene ${i + 1}: Membuat gambar...`)
          updateJob(jobId, { status: "generating", progress: `Scene ${i + 1}: Membuat gambar...` })

          // Reference: composite + previous scene image (for consistency)
          const references: string[] = i === 0
            ? [refId]
            : [refId, previousSceneImageId || refId].filter(Boolean) as string[]

          // Build image prompt (short, like review-product)
          const imagePrompt = selectedTemplate.buildImagePrompt(
            scene,
            selectedTemplate.template.consistencyAnchors,
            dialogue,
            customPrompt || undefined
          )

          const imgResult = await generateImages({
            prompt: imagePrompt,
            model: "nano-banana-2",
            aspectRatio: "9:16",
            count: 1,
            references,
            email,
          })

          const img = imgResult.images[0]
          if (!img?.mediaGenerationId) {
            throw new Error("Gambar tidak berhasil dibuat")
          }

          // Track for next scene's consistency
          previousSceneImageId = img.mediaGenerationId

          window.dispatchEvent(new CustomEvent("credits-updated"))

          updateSceneResult(i, {
            image: { mediaGenerationId: img.mediaGenerationId, fifeUrl: img.url },
            imagePrompt,
          })

          // Update queue with generated image
          updateJob(jobId, {
            images: [img as GeneratedImage],
            progress: `Scene ${i + 1}: Membuat video (60-180 detik)...`,
          })

          // ── Video Generation ──
          updateSceneResult(i, { status: "generating-video" })
          setProgress(`Scene ${i + 1}: Membuat video (60-180 detik)...`)

          const videoPrompt = selectedTemplate.buildVideoPrompt(
            scene,
            selectedTemplate.template.consistencyAnchors,
            dialogue,
            backsound,
            customPrompt || undefined
          )

          const vidResult = await generateVideos({
            prompt: videoPrompt,
            model: "veo-3.1-fast",
            aspectRatio: "portrait",
            duration: 8,
            count: 1,
            startImage: img.mediaGenerationId,
            email,
          })

          const vid = vidResult.videos[0]
          if (!vid?.url) {
            throw new Error("Video tidak berhasil dibuat")
          }

          window.dispatchEvent(new CustomEvent("credits-updated"))

          updateSceneResult(i, {
            status: "completed",
            video: {
              mediaGenerationId: vid.mediaGenerationId || "",
              fifeUrl: vid.url,
              rawUrl: vid.rawUrl,
            },
            videoPrompt,
            dialogue,
          })

          // Update queue — mark done with image + video
          updateJob(jobId, {
            status: "done",
            progress: undefined,
            images: [img as GeneratedImage],
            videos: [vid as GeneratedVideo],
            completedAt: new Date(),
          })
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Gagal membuat scene"
          updateSceneResult(i, {
            status: "failed",
            error: errorMsg,
            dialogue,
          })
          updateJob(jobId, {
            status: "error",
            progress: undefined,
            error: errorMsg,
            completedAt: new Date(),
          })
          console.error(`[video-template] Scene ${i + 1} failed:`, err)
        }
      }

      setProgress("Selesai!")
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Gagal mengupload gambar"
      setProgress(`Error: ${errorMsg}`)
      for (let i = 0; i < (selectedTemplate?.template.scenes.length || 0); i++) {
        if (sceneResults[i]?.status === "pending") {
          updateSceneResult(i, { status: "failed", error: errorMsg })
        }
      }
    } finally {
      setIsGenerating(false)
    }
  }, [
    selectedTemplate, modelImage, productImage, backgroundImage,
    dialogues, backsound, customPrompt, sceneResults,
    updateSceneResult, setIsGenerating, setCurrentScene, setProgress,
    addCustomJob, updateJob,
  ])

  /**
   * Regenerate a single scene (both image + video)
   */
  const handleRegenerateScene = useCallback(async (sceneIndex: number) => {
    if (!selectedTemplate || !modelImage || !productImage || !backgroundImage) return

    setIsGenerating(true)
    const scene = selectedTemplate.template.scenes[sceneIndex]
    const dialogue = dialogues[sceneIndex] || scene.defaultDialogue
    const jobId = `vt-regen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // Add to notification queue
    const queueJob: GenerationJob = {
      id: jobId,
      type: "video",
      prompt: `Regenerate: ${selectedTemplate.template.name} — Scene ${sceneIndex + 1}`,
      model: "nano-banana-2 → veo-3.1",
      status: "uploading",
      progress: "Mengupload referensi...",
      images: [], videos: [],
      createdAt: new Date(),
      params: { prompt: dialogue },
    }
    addCustomJob(queueJob)

    try {
      updateSceneResult(sceneIndex, { status: "generating-image", error: undefined })
      setProgress(`Regenerating Scene ${sceneIndex + 1}: Gambar...`)

      // Create & upload composite
      const compositeFile = await createComposite(
        modelImage.preview, backgroundImage.preview, productImage.preview
      )
      const uploadResult = await uploadImageAsset(compositeFile)
      const refId = uploadResult.mediaGenerationId
      const email = uploadResult.email

      updateJob(jobId, { status: "generating", progress: `Scene ${sceneIndex + 1}: Membuat gambar...` })

      // Use previous scene's image if available
      const prevImage = sceneIndex > 0 ? sceneResults[sceneIndex - 1]?.image : null
      const references: string[] = sceneIndex === 0
        ? [refId]
        : [refId, prevImage?.mediaGenerationId || refId].filter(Boolean) as string[]

      const imagePrompt = selectedTemplate.buildImagePrompt(
        scene, selectedTemplate.template.consistencyAnchors, dialogue, customPrompt || undefined
      )

      const imgResult = await generateImages({
        prompt: imagePrompt,
        model: "nano-banana-2",
        aspectRatio: "9:16",
        count: 1,
        references,
        email,
      })

      const img = imgResult.images[0]
      if (!img?.mediaGenerationId) throw new Error("Gambar gagal")

      window.dispatchEvent(new CustomEvent("credits-updated"))
      updateSceneResult(sceneIndex, {
        image: { mediaGenerationId: img.mediaGenerationId, fifeUrl: img.url },
        status: "generating-video",
      })
      updateJob(jobId, {
        images: [img as GeneratedImage],
        progress: `Scene ${sceneIndex + 1}: Membuat video (60-180 detik)...`,
      })

      setProgress(`Regenerating Scene ${sceneIndex + 1}: Video...`)

      const videoPrompt = selectedTemplate.buildVideoPrompt(
        scene, selectedTemplate.template.consistencyAnchors, dialogue, backsound, customPrompt || undefined
      )

      const vidResult = await generateVideos({
        prompt: videoPrompt,
        model: "veo-3.1-fast",
        aspectRatio: "portrait",
        duration: 8,
        count: 1,
        startImage: img.mediaGenerationId,
        email,
      })

      const vid = vidResult.videos[0]
      if (!vid?.url) throw new Error("Video gagal")

      window.dispatchEvent(new CustomEvent("credits-updated"))
      updateSceneResult(sceneIndex, {
        status: "completed",
        video: { mediaGenerationId: vid.mediaGenerationId || "", fifeUrl: vid.url, rawUrl: vid.rawUrl },
        error: undefined,
      })
      updateJob(jobId, {
        status: "done", progress: undefined,
        images: [img as GeneratedImage],
        videos: [vid as GeneratedVideo],
        completedAt: new Date(),
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Regenerasi gagal"
      updateSceneResult(sceneIndex, { status: "failed", error: errorMsg })
      updateJob(jobId, { status: "error", progress: undefined, error: errorMsg, completedAt: new Date() })
    } finally {
      setIsGenerating(false)
      setProgress("")
    }
  }, [selectedTemplate, modelImage, productImage, backgroundImage, dialogues, backsound, customPrompt, sceneResults, updateSceneResult, setIsGenerating, setProgress, addCustomJob, updateJob])

  /**
   * Regenerate video only (using existing image)
   */
  const handleRegenerateVideoOnly = useCallback(async (sceneIndex: number) => {
    if (!selectedTemplate) return
    const existing = sceneResults[sceneIndex]
    if (!existing?.image?.mediaGenerationId) return

    setIsGenerating(true)
    const scene = selectedTemplate.template.scenes[sceneIndex]
    const dialogue = dialogues[sceneIndex] || scene.defaultDialogue
    const jobId = `vt-vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // Add to notification queue
    const queueJob: GenerationJob = {
      id: jobId,
      type: "video",
      prompt: `Video Only: ${selectedTemplate.template.name} — Scene ${sceneIndex + 1}`,
      model: "veo-3.1-fast",
      status: "generating",
      progress: `Scene ${sceneIndex + 1}: Membuat video...`,
      images: [], videos: [],
      createdAt: new Date(),
      params: { prompt: dialogue },
    }
    addCustomJob(queueJob)

    try {
      updateSceneResult(sceneIndex, { status: "generating-video", error: undefined })
      setProgress(`Regenerating Scene ${sceneIndex + 1}: Video...`)

      const videoPrompt = existing.videoPrompt || selectedTemplate.buildVideoPrompt(
        scene, selectedTemplate.template.consistencyAnchors, dialogue, backsound, customPrompt || undefined
      )

      const vidResult = await generateVideos({
        prompt: videoPrompt,
        model: "veo-3.1-fast",
        aspectRatio: "portrait",
        duration: 8,
        count: 1,
        startImage: existing.image.mediaGenerationId,
      })

      const vid = vidResult.videos[0]
      if (!vid?.url) throw new Error("Video gagal")

      window.dispatchEvent(new CustomEvent("credits-updated"))
      updateSceneResult(sceneIndex, {
        status: "completed",
        video: { mediaGenerationId: vid.mediaGenerationId || "", fifeUrl: vid.url, rawUrl: vid.rawUrl },
        error: undefined,
      })
      updateJob(jobId, {
        status: "done", progress: undefined,
        videos: [vid as GeneratedVideo],
        completedAt: new Date(),
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Regenerasi video gagal"
      updateSceneResult(sceneIndex, { status: "failed", error: errorMsg })
      updateJob(jobId, { status: "error", progress: undefined, error: errorMsg, completedAt: new Date() })
    } finally {
      setIsGenerating(false)
      setProgress("")
    }
  }, [selectedTemplate, dialogues, backsound, customPrompt, sceneResults, updateSceneResult, setIsGenerating, setProgress, addCustomJob, updateJob])

  return {
    handleGenerate,
    handleRegenerateScene,
    handleRegenerateVideoOnly,
  }
}
