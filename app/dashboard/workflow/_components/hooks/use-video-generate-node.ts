"use client"

import { useState, useRef } from "react"
import { useReactFlow } from "@xyflow/react"
import { generateVideos, upscaleGoogleVideo } from "@/lib/api/google-flow"
import { downloadVideo } from "@/lib/download"
import { saveToGallery } from "../actions/gallery"
import { DEFAULTS, toVideoAspect, toDurationSeconds, type VideoModel } from "../node-defaults"

export interface UseVideoGenerateNodeReturn {
  // State
  isGenerating: boolean
  isUpscaling: boolean
  error: string | null
  localPrompt: string
  elapsed: number
  previewOpen: boolean
  savingGallery: boolean
  generatedVideoUrl: string | null
  rawVideoUrl: string | null
  // Actions
  setLocalPrompt: (v: string) => void
  setPreviewOpen: (v: boolean) => void
  handleGenerate: () => Promise<void>
  handleUpscale: (resolution: "1080p" | "4K") => Promise<void>
  handleDownload: () => Promise<void>
  handleSaveGallery: () => Promise<void>
  fmtTime: (s: number) => string
}

export function useVideoGenerateNode(
  nodeId: string,
  nodeData: Record<string, unknown>,
  activePrompt: string,
  connectedImage: string | null,
  connectedMediaId: string | null,
  connectedEndMediaId: string | null,
  connectedEmail: string | null,
  imageMode: string,
  mergedCharacters: { characterRefId: string, displayName: string, imageUrl1?: string | null }[] = []
): UseVideoGenerateNodeReturn {
  const { updateNodeData } = useReactFlow()

  const [isGenerating, setIsGenerating] = useState(false)
  const [isUpscaling, setIsUpscaling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPrompt, setLocalPromptState] = useState((nodeData._localPrompt as string) || "")
  const [elapsed, setElapsed] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [savingGallery, setSavingGallery] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const generatedVideoUrl = (nodeData._videoUrl || nodeData.upscaledVideoUrl) as string | null
  const rawVideoUrl = (nodeData._rawVideoUrl || nodeData.upscaledVideoUrl) as string | null

  const setLocalPrompt = (v: string) => {
    setLocalPromptState(v)
    updateNodeData(nodeId, { _localPrompt: v })
  }

  const handleGenerate = async () => {
    if (!activePrompt?.trim()) { setError("Prompt kosong."); return }
    setIsGenerating(true); setError(null); setElapsed(0)
    updateNodeData(nodeId, { status: "running", _videoUrl: undefined, _rawVideoUrl: undefined, upscaledVideoUrl: undefined })
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const model = ((nodeData.model as string) || DEFAULTS.videoModel) as VideoModel
      const aspectRatio = (nodeData.aspectRatio as string) || DEFAULTS.videoAspectRatio
      const duration = ((nodeData.duration as string) || DEFAULTS.videoDuration) as any

      const startImageId = connectedMediaId
        || (nodeData._startImageMediaId as string)
        || undefined

      const endImageId = connectedEndMediaId
        || undefined

      const email = connectedEmail
        || (nodeData._startImageEmail as string)
        || undefined

      const isReferenceMode = imageMode === "reference"
      const characters = mergedCharacters.map(c => c.characterRefId)

      const result = await generateVideos({
        prompt: activePrompt.trim(),
        model: model as "veo-3.1-lite-low-priority" | "omni-flash",
        aspectRatio: toVideoAspect(aspectRatio),
        duration: toDurationSeconds(duration) as 4 | 6 | 8 | 10,
        ...(startImageId && !isReferenceMode ? { startImage: startImageId } : {}),
        ...(endImageId && !isReferenceMode ? { endImage: endImageId } : {}),
        ...(startImageId && isReferenceMode ? { referenceImages: [startImageId] } : {}),
        ...(characters.length > 0 ? { characters } : {}),
        ...(email ? { email } : {}),
      })

      const processedVideos = await Promise.all(
        result.videos.map(async (vid) => {
          if (!vid || (!vid.rawUrl && !vid.url)) return vid
          try {
            const saved = await saveToGallery({
              url: vid.rawUrl || vid.url,
              prompt: activePrompt.trim(),
              model,
              type: "video",
            })
            return { ...vid, url: saved.gcsUrl, rawUrl: saved.gcsUrl }
          } catch (e) {
            console.error("Failed to auto-save to gallery:", e)
            return vid
          }
        })
      )

      const vid = processedVideos[0]
      updateNodeData(nodeId, {
        status: "done",
        _videoUrl: vid?.url || "",
        _rawVideoUrl: vid?.rawUrl || "",
        selectedVideo: vid?.url || "",
        _videoMediaId: vid?.mediaGenerationId || "",
        mediaGenerationId: vid?.mediaGenerationId || "",
        videos: processedVideos.map(v => v.url),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate video")
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsGenerating(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleUpscale = async (resolution: "1080p" | "4K") => {
    const mediaId = (nodeData.mediaGenerationId || nodeData._videoMediaId) as string | undefined
    if (!mediaId) {
      setError("Tidak ada video untuk diupscale")
      return
    }

    setIsUpscaling(true)
    setError(null)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const result = await upscaleGoogleVideo(mediaId, resolution)
      updateNodeData(nodeId, { upscaledVideoUrl: result.videoUrl })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal upscale video"
      setError(msg)
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setIsUpscaling(false)
    }
  }

  const handleDownload = async () => {
    const url = rawVideoUrl
    if (!url) return
    try { await downloadVideo(url, "workflow-video.mp4") } catch { }
  }

  const handleSaveGallery = async () => {
    if (!rawVideoUrl) return
    setSavingGallery(true)
    try {
      await saveToGallery({
        url: rawVideoUrl,
        prompt: activePrompt,
        model: (nodeData.model as string) || DEFAULTS.videoModel,
        type: "video",
      })
    } catch { }
    setSavingGallery(false)
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return {
    isGenerating, isUpscaling, error, localPrompt, elapsed, previewOpen, savingGallery,
    generatedVideoUrl, rawVideoUrl,
    setLocalPrompt, setPreviewOpen,
    handleGenerate, handleUpscale, handleDownload, handleSaveGallery, fmtTime,
  }
}
