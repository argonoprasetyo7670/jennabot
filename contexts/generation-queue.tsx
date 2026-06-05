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
export const CREDIT_COST_IMAGE = 1  // per image
export const CREDIT_COST_VIDEO = 10 // per video (Google Flow)
export const CREDIT_COST_RUNWAY = 120 // per Runway video (Seedance 2.0, Motion Control)


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
const LS_KEY = "jenna_gen_queue_jobs"
type Listener = () => void

interface GlobalStore {
  jobs: GenerationJob[]
  listeners: Set<Listener>
  version: number
}

/** Serialize jobs to localStorage (strip non-serializable fields like File) */
function saveJobsToLS(jobs: GenerationJob[]) {
  try {
    const serializable = jobs.map((j) => ({
      ...j,
      references: undefined, // File objects can't be serialized
      params: { prompt: (j.params as { prompt?: string }).prompt || "" },
    }))
    localStorage.setItem(LS_KEY, JSON.stringify(serializable))
  } catch { /* quota exceeded or private browsing */ }
}

/** Load jobs from localStorage */
function loadJobsFromLS(): GenerationJob[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GenerationJob[]
    return parsed.map((j) => ({
      ...j,
      createdAt: new Date(j.createdAt),
      completedAt: j.completedAt ? new Date(j.completedAt) : undefined,
      images: j.images || [],
      videos: j.videos || [],
    }))
  } catch { return [] }
}

function getStore(): GlobalStore {
  if (typeof window === "undefined") {
    return { jobs: [], listeners: new Set(), version: 0 }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any)[STORE_KEY]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[STORE_KEY] = {
      jobs: loadJobsFromLS(),
      listeners: new Set(),
      version: 0,
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any)[STORE_KEY]
}

function emitChange() {
  const store = getStore()
  store.version++
  saveJobsToLS(store.jobs)
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

      // Credits are deducted server-side. Just update UI balance.
      const imageCount = result.images.length || 1
      const creditCost = imageCount * CREDIT_COST_IMAGE
      window.dispatchEvent(new CustomEvent("credits-updated"))

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

      // Credits are deducted server-side on success. Just update UI.
      window.dispatchEvent(new CustomEvent("credits-updated"))

      updateJobInStore(id, {
        status: "done",
        progress: undefined,
        videos: result.videos,
        creditsDeducted: result.remainingCredits !== undefined ? (videoParams.count || 1) * CREDIT_COST_VIDEO : 0,
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

/* ─── NOTE: Credit deduction is handled server-side in API routes ─── */
/* ─── Client only dispatches 'credits-updated' to refresh UI balance ─── */

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

  // Resume polling for video jobs that were processing before refresh
  React.useEffect(() => {
    const store = getStore()
    // Resume polling for video jobs that were still processing
    // UseAPI jobIds start with "j" (e.g. j0517...v-u2232-...)
    const processingVideoJobs = store.jobs.filter(
      (j) => j.type === "video" && (j.status === "uploading" || j.status === "generating")
    )

    for (const job of processingVideoJobs) {
      // Extract the server jobId (the job.id IS the server jobId for async video jobs)
      const serverJobId = job.id
      console.log(`[queue] Resuming polling for job ${serverJobId}...`)
      updateJobInStore(serverJobId, { progress: "Melanjutkan polling setelah refresh..." })

      // Resume polling
      ;(async () => {
        const POLL_INTERVAL = 5000
        const MAX_POLLS = 60

        for (let i = 0; i < MAX_POLLS; i++) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL))

          try {
            const res = await fetch(`/api/ai/video-generate?jobId=${encodeURIComponent(serverJobId)}`)
            const data = await res.json()

            if (data.status === "processing") {
              updateJobInStore(serverJobId, { progress: `Masih membuat video... (${(i + 1) * 5}s)` })
              continue
            }

            if (data.status === "error") {
              updateJobInStore(serverJobId, {
                status: "error", progress: undefined,
                error: data.error || "Generation failed",
                completedAt: new Date(),
              })
              return
            }

            if (data.status === "done") {
              // Parse videos from response
              const videos = (data.media || [])
                .map((m: Record<string, unknown>) => {
                  const videoUrl = m.videoUrl as string | undefined
                  if (!videoUrl) return null
                  const gen = (m.video as Record<string, unknown>)?.generatedVideo as Record<string, unknown> | undefined
                  return {
                    url: videoUrl,
                    seed: gen?.seed as number | undefined,
                    mediaGenerationId: m.mediaGenerationId as string | undefined,
                  }
                })
                .filter(Boolean)

              updateJobInStore(serverJobId, {
                status: "done", progress: undefined,
                videos,
                creditsDeducted: data.creditsDeducted || 0,
                completedAt: new Date(),
              })
              window.dispatchEvent(new CustomEvent("credits-updated"))
              return
            }
          } catch {
            // Network error, keep trying
            if (i >= MAX_POLLS - 1) {
              updateJobInStore(serverJobId, {
                status: "error", progress: undefined,
                error: "Polling timed out setelah refresh",
                completedAt: new Date(),
              })
            }
          }
        }
      })()
    }

    // Mark non-resumable processing jobs (image/custom jobs only) as interrupted
    const nonResumable = store.jobs.filter(
      (j) => j.type !== "video" && (j.status === "uploading" || j.status === "generating")
    )
    for (const job of nonResumable) {
      updateJobInStore(job.id, {
        status: "error", progress: undefined,
        error: "Terhenti karena halaman di-refresh",
        completedAt: new Date(),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

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
