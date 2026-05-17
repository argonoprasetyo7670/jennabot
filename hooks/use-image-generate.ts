import { useState, useCallback } from "react"
import {
  uploadImageAsset,
  uploadImageFromUrl,
  generateImages,
  type GenerateImageParams,
  type GeneratedImage,
  type ImageModel,
  type AspectRatio,
  type UploadAssetResult,
} from "@/lib/api/google-flow"

export interface ReferenceImage {
  file?: File
  preview: string
  /** Set when from gallery — URL to re-upload from */
  galleryUrl?: string
  /** Filled after uploading to Google Flow */
  mediaGenerationId?: string
  uploading?: boolean
  fromGallery?: boolean
}

interface UseImageGenerateReturn {
  isGenerating: boolean
  generatedImages: GeneratedImage[]
  referenceImages: ReferenceImage[]
  error: string | null

  generate: (params: GenerateImageParams) => Promise<void>
  addReferenceFiles: (files: File[], maxRefs?: number) => void
  addGalleryReference: (preview: string, galleryUrl: string) => void
  removeReference: (index: number) => void
  clearReferences: () => void
  clearResults: () => void
  clearError: () => void
}

/**
 * Reusable hook for Google Flow image generation.
 *
 * All references (file uploads + gallery items) are uploaded fresh
 * to a single Google account at generation time to prevent email mismatch.
 *
 * Flow:
 * 1. Upload first reference → get `email`
 * 2. Upload remaining references to same `email`
 * 3. Generate with all mediaGenerationIds + same `email`
 */
export function useImageGenerate(): UseImageGenerateReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (params: GenerateImageParams) => {
    if (!params.prompt?.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const refs: string[] = []
      let email: string | undefined

      // Upload ALL references to a single account
      for (const ref of referenceImages) {
        let result: UploadAssetResult

        if (ref.file) {
          // File upload
          result = await uploadImageAsset(ref.file, email)
        } else if (ref.galleryUrl) {
          // Gallery item: re-upload from URL
          result = await uploadImageFromUrl(ref.galleryUrl, email)
        } else {
          continue
        }

        // Lock to the account from the first upload
        if (!email && result.email) {
          email = result.email
        }

        ref.mediaGenerationId = result.mediaGenerationId
        refs.push(result.mediaGenerationId)
      }

      const result = await generateImages({
        ...params,
        references: refs.length > 0 ? refs : undefined,
        email: refs.length > 0 ? email : undefined,
      })

      setGeneratedImages(result.images)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, referenceImages])

  /** Add files as reference images */
  const addReferenceFiles = useCallback((files: File[], maxRefs = 10) => {
    setReferenceImages((prev) => {
      const remaining = maxRefs - prev.length
      const newRefs: ReferenceImage[] = files.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      return [...prev, ...newRefs]
    })
  }, [])

  /** Add a gallery image as reference (will be re-uploaded at generate time) */
  const addGalleryReference = useCallback((preview: string, galleryUrl: string) => {
    setReferenceImages((prev) => [
      ...prev,
      { preview, galleryUrl, fromGallery: true },
    ])
  }, [])

  const removeReference = useCallback((index: number) => {
    setReferenceImages((prev) => {
      const updated = [...prev]
      if (!updated[index].fromGallery) {
        URL.revokeObjectURL(updated[index].preview)
      }
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const clearReferences = useCallback(() => {
    setReferenceImages((prev) => {
      prev.forEach((ref) => { if (!ref.fromGallery) URL.revokeObjectURL(ref.preview) })
      return []
    })
  }, [])

  const clearResults = useCallback(() => setGeneratedImages([]), [])
  const clearError = useCallback(() => setError(null), [])

  return {
    isGenerating,
    generatedImages,
    referenceImages,
    error,
    generate,
    addReferenceFiles,
    addGalleryReference,
    removeReference,
    clearReferences,
    clearResults,
    clearError,
  }
}

export type { GenerateImageParams, GeneratedImage, ImageModel, AspectRatio, UploadAssetResult }
