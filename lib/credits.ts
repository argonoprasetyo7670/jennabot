import { prisma } from "@/lib/prisma"

/**
 * Deduct credits from a user's balance and log the transaction.
 * Returns the amount actually deducted (0 if an error occurred).
 */
export async function deductCredits(
  userId: string,
  amount: number,
  feature: string
): Promise<number> {
  if (amount <= 0) return 0
  try {
    const credits = await prisma.user_credits.findUnique({ where: { userId } })
    const currentBalance = credits?.balance ?? 0
    const newBalance = Math.max(0, currentBalance - amount)

    await prisma.$transaction([
      prisma.user_credits.upsert({
        where: { userId },
        update: { balance: newBalance, updatedAt: new Date() },
        create: { id: crypto.randomUUID(), userId, balance: newBalance, updatedAt: new Date() },
      }),
      prisma.credit_transactions.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "deduct",
          amount: -amount,
          balance: newBalance,
          description: `Video generation (${feature})`,
          feature,
        },
      }),
    ])

    console.log(`[credits] Deducted ${amount} for user ${userId} (${feature}). Balance: ${currentBalance} → ${newBalance}`)
    return amount
  } catch (err) {
    console.error(`[credits] Failed to deduct for user ${userId}:`, err)
    return 0
  }
}

/**
 * Key prefix for video job result cache in settings table.
 * vj:{jobId} → JSON { media, creditsDeducted, timestamp, status }
 */
export const VIDEO_JOB_RESULT_PREFIX = "vj:"

/**
 * Key prefix for video job metadata in settings table.
 * vjmeta:{jobId} → JSON { userId, videoCount, feature }
 */
export const VIDEO_JOB_META_PREFIX = "vjmeta:"

/** Max age for cached video job results (1 hour) */
export const VIDEO_JOB_CACHE_TTL_MS = 60 * 60 * 1000

export interface VideoJobMeta {
  userId: string
  videoCount: number
  feature: string
  /** Original request body — stored for auto-retry on V2V moderation errors */
  requestBody?: Record<string, unknown>
}

export interface VideoJobResult {
  media: Record<string, unknown>[]
  creditsDeducted: number
  timestamp: number
  status: "done" | "error"
  error?: string
}

/**
 * Store video job metadata in DB (for credit deduction in callback).
 */
export async function storeVideoJobMeta(jobId: string, meta: VideoJobMeta): Promise<void> {
  const key = `${VIDEO_JOB_META_PREFIX}${jobId}`
  await prisma.settings.upsert({
    where: { key },
    update: { value: JSON.stringify(meta), updatedAt: new Date() },
    create: { id: crypto.randomUUID(), key, value: JSON.stringify(meta), updatedAt: new Date() },
  }).catch(err => console.error("[credits] storeVideoJobMeta error:", err))
}

/**
 * Get video job metadata from DB.
 */
export async function getVideoJobMeta(jobId: string): Promise<VideoJobMeta | null> {
  const key = `${VIDEO_JOB_META_PREFIX}${jobId}`
  try {
    const entry = await prisma.settings.findUnique({ where: { key } })
    if (!entry) return null
    return JSON.parse(entry.value) as VideoJobMeta
  } catch { return null }
}

/**
 * Store completed video job result in DB (set by webhook or polling completion).
 */
export async function storeVideoJobResult(jobId: string, result: VideoJobResult): Promise<void> {
  const key = `${VIDEO_JOB_RESULT_PREFIX}${jobId}`
  await prisma.settings.upsert({
    where: { key },
    update: { value: JSON.stringify(result), updatedAt: new Date() },
    create: { id: crypto.randomUUID(), key, value: JSON.stringify(result), updatedAt: new Date() },
  }).catch(err => console.error("[credits] storeVideoJobResult error:", err))
}

/**
 * Get cached video job result from DB.
 * Returns null if not found or expired.
 */
export async function getVideoJobResult(jobId: string): Promise<VideoJobResult | null> {
  const key = `${VIDEO_JOB_RESULT_PREFIX}${jobId}`
  try {
    const entry = await prisma.settings.findUnique({ where: { key } })
    if (!entry) return null
    const result = JSON.parse(entry.value) as VideoJobResult
    // Expire old cached results
    if (Date.now() - result.timestamp > VIDEO_JOB_CACHE_TTL_MS) {
      await prisma.settings.delete({ where: { key } }).catch(() => {})
      return null
    }
    return result
  } catch { return null }
}

/**
 * Cleanup job metadata and optionally result from DB.
 */
export async function cleanupVideoJob(jobId: string, includeResult = false): Promise<void> {
  const keys = [`${VIDEO_JOB_META_PREFIX}${jobId}`]
  if (includeResult) keys.push(`${VIDEO_JOB_RESULT_PREFIX}${jobId}`)
  await Promise.all(
    keys.map(key => prisma.settings.delete({ where: { key } }).catch(() => {}))
  )
}

/* ─── IMAGE JOB STORAGE ─── */

export const IMAGE_JOB_RESULT_PREFIX = "ij:"
export const IMAGE_JOB_META_PREFIX = "ijmeta:"

export interface ImageJobMeta {
  userId: string
  creditCost: number
  feature: string
}

export interface ImageJobResult {
  media: Record<string, unknown>[]
  timestamp: number
  status: "done" | "error"
  error?: string
}

export async function storeImageJobMeta(jobId: string, meta: ImageJobMeta): Promise<void> {
  const key = `${IMAGE_JOB_META_PREFIX}${jobId}`
  await prisma.settings.upsert({
    where: { key },
    update: { value: JSON.stringify(meta), updatedAt: new Date() },
    create: { id: crypto.randomUUID(), key, value: JSON.stringify(meta), updatedAt: new Date() },
  }).catch(err => console.error("[credits] storeImageJobMeta error:", err))
}

export async function getImageJobMeta(jobId: string): Promise<ImageJobMeta | null> {
  const key = `${IMAGE_JOB_META_PREFIX}${jobId}`
  try {
    const entry = await prisma.settings.findUnique({ where: { key } })
    if (!entry) return null
    return JSON.parse(entry.value) as ImageJobMeta
  } catch { return null }
}

export async function storeImageJobResult(jobId: string, result: ImageJobResult): Promise<void> {
  const key = `${IMAGE_JOB_RESULT_PREFIX}${jobId}`
  await prisma.settings.upsert({
    where: { key },
    update: { value: JSON.stringify(result), updatedAt: new Date() },
    create: { id: crypto.randomUUID(), key, value: JSON.stringify(result), updatedAt: new Date() },
  }).catch(err => console.error("[credits] storeImageJobResult error:", err))
}

export async function getImageJobResult(jobId: string): Promise<ImageJobResult | null> {
  const key = `${IMAGE_JOB_RESULT_PREFIX}${jobId}`
  try {
    const entry = await prisma.settings.findUnique({ where: { key } })
    if (!entry) return null
    const result = JSON.parse(entry.value) as ImageJobResult
    if (Date.now() - result.timestamp > VIDEO_JOB_CACHE_TTL_MS) {
      await prisma.settings.delete({ where: { key } }).catch(() => {})
      return null
    }
    return result
  } catch { return null }
}

export async function cleanupImageJob(jobId: string, includeResult = false): Promise<void> {
  const keys = [`${IMAGE_JOB_META_PREFIX}${jobId}`]
  if (includeResult) keys.push(`${IMAGE_JOB_RESULT_PREFIX}${jobId}`)
  await Promise.all(
    keys.map(key => prisma.settings.delete({ where: { key } }).catch(() => {}))
  )
}
