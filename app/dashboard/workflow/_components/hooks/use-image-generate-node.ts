"use client"

import { useState, useRef } from "react"
import { useReactFlow } from "@xyflow/react"
import {
  generateImages, uploadImageAsset,
  type GeneratedImage, type UploadAssetResult,
} from "@/lib/api/google-flow"
import { downloadImage } from "@/lib/download"
import { saveToGallery } from "../actions/gallery"
import { DEFAULTS, type ImageModel } from "../node-defaults"

export interface RefImage {
  file?: File
  preview: string
  uploading: boolean
  uploaded?: UploadAssetResult
  error?: boolean
}

export interface UseImageGenerateNodeReturn {
  // State
  isGenerating: boolean
  error: string | null
  localPrompt: string
  refImages: RefImage[]
  previewIdx: number | null
  savingGallery: boolean
  generatedImages: GeneratedImage[]
  selectedIdx: number
  refInputRef: React.RefObject<HTMLInputElement>
  // Actions
  setLocalPrompt: (v: string) => void
  setPreviewIdx: (v: number | null) => void
  handleGenerate: () => Promise<void>
  handleSelect: (idx: number) => void
  handleDownload: (url: string, idx: number) => Promise<void>
  handleSaveToGallery: (url: string) => Promise<void>
  handleUploadRef: (files: FileList) => Promise<void>
  handleRemoveRef: (idx: number) => void
}

export function useImageGenerateNode(
  nodeId: string,
  nodeData: Record<string, unknown>,
  activePrompt: string,
  connectedRefIds: string[],         // all pre-uploaded mediaGenerationIds from Upload nodes
  connectedRefEmail: string | null,  // email associated with the first upload
): UseImageGenerateNodeReturn {
  const { updateNodeData } = useReactFlow()

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPrompt, setLocalPromptState] = useState((nodeData._localPrompt as string) || "")
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [savingGallery, setSavingGallery] = useState(false)
  const refInputRef = useRef<HTMLInputElement>(null!)

  const [refImages, setRefImages] = useState<RefImage[]>(
    (nodeData._refPreviews as { preview: string; uploaded?: UploadAssetResult }[] || [])
      .map(r => ({ ...r, uploading: false }))
  )
  const [uploadEmail, setUploadEmail] = useState<string | null>((nodeData._uploadEmail as string) || null)

  const generatedImages = (nodeData._generatedImages as GeneratedImage[]) || []
  const selectedIdx = (nodeData._selectedIdx as number) ?? 0

  const setLocalPrompt = (v: string) => {
    setLocalPromptState(v)
    updateNodeData(nodeId, { _localPrompt: v })
  }

  const handleGenerate = async () => {
    if (!activePrompt?.trim()) {
      setError("Prompt kosong. Tulis prompt atau hubungkan Prompt Node.")
      return
    }
    setIsGenerating(true)
    setError(null)
    updateNodeData(nodeId, { status: "running" })

    try {
      // Local refs uploaded directly in this node
      const localRefs = refImages
        .filter(r => r.uploaded?.mediaGenerationId)
        .map(r => r.uploaded!.mediaGenerationId)

      let email = uploadEmail || connectedRefEmail || undefined

      // Merge: connected upload nodes refs + local node refs
      // connectedRefIds are already uploaded to Google Flow — use directly
      const refs = [...connectedRefIds, ...localRefs]

      // Always use nano-banana-pro (supports up to 10 references)
      const model = "nano-banana-pro" as ImageModel
      const count = (nodeData.count as number) || DEFAULTS.imageCount

      const result = await generateImages({
        prompt: activePrompt.trim(),
        model,
        aspectRatio: ((nodeData.aspectRatio as string) || DEFAULTS.imageAspectRatio) as "9:16",
        count,
        ...(refs.length > 0 ? { references: refs, email } : {}),
      })

      updateNodeData(nodeId, {
        status: "done",
        _generatedImages: result.images,
        _selectedIdx: 0,
        selectedImage: result.images[0]?.url || "",
        _selectedMediaId: result.images[0]?.mediaGenerationId || "",
        _selectedEmail: email || "",
        images: result.images.map(i => i.url),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate gambar")
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSelect = (idx: number) => {
    updateNodeData(nodeId, {
      _selectedIdx: idx,
      selectedImage: generatedImages[idx]?.url || "",
      _selectedMediaId: generatedImages[idx]?.mediaGenerationId || "",
    })
  }

  const handleDownload = async (url: string, idx: number) => {
    try { await downloadImage(url, `workflow-image-${idx + 1}.png`) } catch { }
  }

  const handleSaveToGallery = async (url: string) => {
    setSavingGallery(true)
    try {
      await saveToGallery({
        url,
        prompt: activePrompt,
        model: (nodeData.model as string) || DEFAULTS.imageModel,
        aspectRatio: (nodeData.aspectRatio as string) || DEFAULTS.imageAspectRatio,
        type: "image",
      })
    } catch { }
    setSavingGallery(false)
  }

  const handleUploadRef = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (refImages.length >= 10) break
      const preview = URL.createObjectURL(file)
      setRefImages(prev => [...prev, { file, preview, uploading: true }])
      try {
        const result = await uploadImageAsset(file, uploadEmail || undefined)
        if (!uploadEmail) setUploadEmail(result.email)
        setRefImages(prev => {
          const updated = prev.map(r => r.preview === preview ? { ...r, uploading: false, uploaded: result } : r)
          updateNodeData(nodeId, {
            _refPreviews: updated.map(r => ({ preview: r.preview, uploaded: r.uploaded })),
            _uploadEmail: result.email,
          })
          return updated
        })
      } catch {
        setRefImages(prev => prev.map(r => r.preview === preview ? { ...r, uploading: false, error: true } : r))
      }
    }
  }

  const handleRemoveRef = (idx: number) => {
    const updated = refImages.filter((_, i) => i !== idx)
    setRefImages(updated)
    updateNodeData(nodeId, {
      _refPreviews: updated.filter(r => !r.error).map(r => ({ preview: r.preview, uploaded: r.uploaded })),
    })
  }

  return {
    isGenerating, error, localPrompt, refImages, previewIdx, savingGallery,
    generatedImages, selectedIdx, refInputRef,
    setLocalPrompt, setPreviewIdx,
    handleGenerate, handleSelect, handleDownload, handleSaveToGallery,
    handleUploadRef, handleRemoveRef,
  }
}
