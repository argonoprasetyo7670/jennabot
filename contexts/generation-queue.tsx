"use client"

import * as React from "react"
import {
  uploadImageAsset,
  uploadImageFromUrl,
  generateImages,
  generateVideos,
  type GenerateImageParams,
  type GeneratedImage,
  type GenerateVideoParams,
  type GeneratedVideo,
} from "@/lib/api/google-flow"

/* ─── Credit Costs ─── */
export const CREDIT_COST_IMAGE = 5  // per image
export const CREDIT_COST_VIDEO = 20 // per video

/* ─── Types ─── */
export type JobStatus = "uploading" | "generating" | "done" | "error"

export interface GenerationJob {
  id: string
  type: "image" | "video"
  prompt: string
  model: string
  status: JobStatus
  progress?: string
  images: GeneratedImage[]
  videos: GeneratedVideo[]
  error?: string
  creditsDeducted?: number
  createdAt: Date
  completedAt?: Date
  references?: { file?: File; galleryUrl?: string }[]
  params: GenerateImageParams | GenerateVideoParams
  /** Video-specific fields */
  videoParams?: {
    startImage?: string
    endImage?: string
    referenceImages?: string[]
    voice?: string
  }
}

/* ─── Window-level global store (survives HMR + navigation) ─── */
const STORE_KEY = "__jenna_gen_queue__"
type Listener = () => void

interface GlobalStore {
  jobs: GenerationJob[]
  listeners: Set<Listener>
  version: number
}

function getStore(): GlobalStore {
  if (typeof window === "undefined") {
    return { jobs: [], listeners: new Set(), version: 0 }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any)[STORE_KEY]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[STORE_KEY] = { jobs: [], listeners: new Set(), version: 0 }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)[STORE_KEY]
}

function emitChange() {
  const store = getStore()
  store.version++
  store.listeners.forEach((l) => l())
}

function getSnapshot(): GenerationJob[] {
  return getStore().jobs
}

const EMPTY_JOBS: GenerationJob[] = []
function getServerSnapshot(): GenerationJob[] {
  return EMPTY_JOBS
}

function subscribe(listener: Listener): () => void {
  const store = getStore()
  store.listeners.add(listener)
  return () => store.listeners.delete(listener)
}

function updateJobInStore(id: string, updates: Partial<GenerationJob>) {
  const store = getStore()
  store.jobs = store.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j))
  emitChange()
}

function addJobToStore(job: GenerationJob) {
  const store = getStore()
  store.jobs = [job, ...store.jobs]
  emitChange()
}

function removeJobFromStore(id: string) {
  const store = getStore()
  store.jobs = store.jobs.filter((j) => j.id !== id)
  emitChange()
}

function clearCompletedFromStore() {
  const store = getStore()
  store.jobs = store.jobs.filter((j) => j.status === "uploading" || j.status === "generating")
  emitChange()
}

function submitJobToStore(
  params: GenerateImageParams,
  references?: { file?: File; galleryUrl?: string }[]
): string {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const job: GenerationJob = {
    id,
    type: "image",
    prompt: params.prompt || "",
    model: params.model || "nano-banana-2",
    status: references?.length ? "uploading" : "generating",
    progress: references?.length ? "Mengupload referensi..." : "Membuat gambar...",
    images: [],
    videos: [],
    createdAt: new Date(),
    references,
    params,
  }

  addJobToStore(job)

  // Fire and forget — runs on window, independent of React
  ;(async () => {
    try {
      const refs: string[] = []
      let email: string | undefined

      if (references?.length) {
        for (let i = 0; i < references.length; i++) {
          const ref = references[i]
          updateJobInStore(id, {
            status: "uploading",
            progress: `Mengupload referensi ${i + 1}/${references.length}...`,
          })

          let result
          if (ref.file) {
            result = await uploadImageAsset(ref.file, email)
          } else if (ref.galleryUrl) {
            result = await uploadImageFromUrl(ref.galleryUrl, email)
          }

          if (result) {
            if (!email && result.email) email = result.email
            refs.push(result.mediaGenerationId)
          }
        }
      }

      updateJobInStore(id, { status: "generating", progress: "Membuat gambar..." })

      const result = await generateImages({
        ...params,
        references: refs.length > 0 ? refs : undefined,
        email: refs.length > 0 ? email : undefined,
      })

      // Deduct credits only on success: count × 5 credits per image
      const imageCount = result.images.length || 1
      const creditCost = imageCount * CREDIT_COST_IMAGE
      await deductCredits(creditCost, "image-generator", `Generate ${imageCount} gambar (${params.model})`)

      updateJobInStore(id, {
        status: "done",
        progress: undefined,
        images: result.images,
        creditsDeducted: creditCost,
        completedAt: new Date(),
      })
    } catch (err) {
      updateJobInStore(id, {
        status: "error",
        progress: undefined,
        error: err instanceof Error ? err.message : "Generation failed",
        completedAt: new Date(),
      })
    }
  })()

  return id
}

/* ─── Video Job Submission ─── */
function submitVideoJobToStore(
  params: GenerateVideoParams,
  references?: { file?: File; galleryUrl?: string }[],
  frameRefs?: { startImage?: { file?: File; galleryUrl?: string }; endImage?: { file?: File; galleryUrl?: string } }
): string {
  const id = `vjob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const hasUploads = (references?.length ?? 0) > 0 || !!frameRefs?.startImage || !!frameRefs?.endImage

  const job: GenerationJob = {
    id,
    type: "video",
    prompt: params.prompt || "",
    model: params.model || "veo-3.1-fast",
    status: hasUploads ? "uploading" : "generating",
    progress: hasUploads ? "Mengupload referensi..." : "Membuat video...",
    images: [],
    videos: [],
    createdAt: new Date(),
    references,
    params,
  }

  addJobToStore(job)

  ;(async () => {
    try {
      let email: string | undefined
      const videoParams: GenerateVideoParams = { ...params }

      // Upload start frame
      if (frameRefs?.startImage) {
        updateJobInStore(id, { status: "uploading", progress: "Mengupload start frame..." })
        let result
        if (frameRefs.startImage.file) {
          result = await uploadImageAsset(frameRefs.startImage.file, email)
        } else if (frameRefs.startImage.galleryUrl) {
          result = await uploadImageFromUrl(frameRefs.startImage.galleryUrl, email)
        }
        if (result) {
          if (!email && result.email) email = result.email
          videoParams.startImage = result.mediaGenerationId
        }
      }

      // Upload end frame
      if (frameRefs?.endImage) {
        updateJobInStore(id, { status: "uploading", progress: "Mengupload end frame..." })
        let result
        if (frameRefs.endImage.file) {
          result = await uploadImageAsset(frameRefs.endImage.file, email)
        } else if (frameRefs.endImage.galleryUrl) {
          result = await uploadImageFromUrl(frameRefs.endImage.galleryUrl, email)
        }
        if (result) {
          if (!email && result.email) email = result.email
          videoParams.endImage = result.mediaGenerationId
        }
      }

      // Upload reference images (R2V)
      if (references?.length) {
        const refIds: string[] = []
        for (let i = 0; i < references.length; i++) {
          const ref = references[i]
          updateJobInStore(id, { status: "uploading", progress: `Mengupload referensi ${i + 1}/${references.length}...` })
          let result
          if (ref.file) {
            result = await uploadImageAsset(ref.file, email)
          } else if (ref.galleryUrl) {
            result = await uploadImageFromUrl(ref.galleryUrl, email)
          }
          if (result) {
            if (!email && result.email) email = result.email
            refIds.push(result.mediaGenerationId)
          }
        }
        if (refIds.length > 0) videoParams.referenceImages = refIds
      }

      if (email) videoParams.email = email

      updateJobInStore(id, { status: "generating", progress: "Membuat video... (60-180 detik)" })

      const result = await generateVideos(videoParams)

      // Deduct credits only on success: count × 20 credits per video
      const videoCount = result.videos.length || 1
      const creditCost = videoCount * CREDIT_COST_VIDEO
      await deductCredits(creditCost, "video-generator", `Generate ${videoCount} video (${params.model})`)

      updateJobInStore(id, {
        status: "done",
        progress: undefined,
        videos: result.videos,
        creditsDeducted: creditCost,
        completedAt: new Date(),
      })
    } catch (err) {
      updateJobInStore(id, {
        status: "error",
        progress: undefined,
        error: err instanceof Error ? err.message : "Video generation failed",
        completedAt: new Date(),
      })
    }
  })()

  return id
}

/* ─── Credit Deduction Helper ─── */
async function deductCredits(amount: number, feature: string, description: string) {
  try {
    const res = await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, feature, description }),
    })
    if (res.ok) {
      // Notify CreditsProvider to refresh balance display
      window.dispatchEvent(new CustomEvent("credits-updated"))
      console.log(`[credits] Deducted ${amount} credits for ${feature}`)
    } else {
      console.warn(`[credits] Failed to deduct: ${res.status}`)
    }
  } catch (err) {
    console.error("[credits] Deduction request failed:", err)
  }
}

/* ─── React Context ─── */
interface GenerationQueueContextValue {
  jobs: GenerationJob[]
  activeCount: number
  submitJob: (
    params: GenerateImageParams,
    references?: { file?: File; galleryUrl?: string }[]
  ) => string
  submitVideoJob: (
    params: GenerateVideoParams,
    references?: { file?: File; galleryUrl?: string }[],
    frameRefs?: { startImage?: { file?: File; galleryUrl?: string }; endImage?: { file?: File; galleryUrl?: string } }
  ) => string
  addCustomJob: (job: GenerationJob) => void
  updateJob: (id: string, updates: Partial<GenerationJob>) => void
  clearJob: (id: string) => void
  clearCompleted: () => void
}

const GenerationQueueContext = React.createContext<GenerationQueueContextValue | null>(null)

export function useGenerationQueue() {
  const ctx = React.useContext(GenerationQueueContext)
  if (!ctx) throw new Error("useGenerationQueue must be used within GenerationQueueProvider")
  return ctx
}

export function GenerationQueueProvider({ children }: { children: React.ReactNode }) {
  const jobs = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const activeCount = jobs.filter((j) => j.status === "uploading" || j.status === "generating").length

  const value = React.useMemo<GenerationQueueContextValue>(
    () => ({
      jobs,
      activeCount,
      submitJob: submitJobToStore,
      submitVideoJob: submitVideoJobToStore,
      addCustomJob: addJobToStore,
      updateJob: updateJobInStore,
      clearJob: removeJobFromStore,
      clearCompleted: clearCompletedFromStore,
    }),
    [jobs, activeCount]
  )

  return (
    <GenerationQueueContext.Provider value={value}>
      {children}
    </GenerationQueueContext.Provider>
  )
}
