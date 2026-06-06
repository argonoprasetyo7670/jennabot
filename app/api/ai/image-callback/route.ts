import { NextRequest, NextResponse } from "next/server"
import { refundCredits } from "@/lib/credit-guard"
import {
  getImageJobMeta,
  storeImageJobResult,
  cleanupImageJob,
} from "@/lib/credits"

const REFUNDED_KEYS = new Set<string>()

/**
 * Extract image URLs from UseAPI callback payload.
 */
function extractMedia(data: Record<string, unknown>): Record<string, unknown>[] {
  const processMediaArray = (arr: any[]) => {
    return arr.map((m) => {
      const gen = m.image?.generatedImage
      const rawMgId = gen?.mediaGenerationId
      const resolvedMgId = rawMgId && typeof rawMgId === "object" ? rawMgId.mediaGenerationId : rawMgId
      return {
        url: gen?.fifeUrl || gen?.uri,
        mediaGenerationId: resolvedMgId,
      }
    }).filter((m) => m.url)
  }

  if (Array.isArray(data.media)) return processMediaArray(data.media)
  if (Array.isArray(data.images)) return data.images as Record<string, unknown>[]
  
  const response = data.response as Record<string, unknown> | undefined
  if (response && Array.isArray(response.media)) return processMediaArray(response.media)
  if (response && Array.isArray(response.images)) return response.images as Record<string, unknown>[]

  // Handle async operations format
  if (response && Array.isArray(response.operations)) {
    return (response.operations as Record<string, unknown>[])
      .filter((op) => {
        const status = ((op.status as string) || "").toUpperCase()
        return status.includes("SUCCESS") || status.includes("SUCCEEDED")
      })
      .map((op) => {
        const image = op.image as Record<string, unknown> | undefined
        const imageUrl = (image?.uri || image?.fifeUrl) as string | undefined
        const rawMgId = op.mediaGenerationId
        const resolvedMgId = rawMgId && typeof rawMgId === "object" ? (rawMgId as any).mediaGenerationId : rawMgId
        return {
          url: imageUrl,
          mediaGenerationId: resolvedMgId as string | undefined,
        }
      })
      .filter((m) => m.url)
  }

  return []
}

export async function POST(req: NextRequest) {
  const providedSecret = req.nextUrl.searchParams.get("secret")
  const expectedSecret = (process.env.NEXTAUTH_SECRET || "").slice(0, 16)

  if (!providedSecret || providedSecret !== expectedSecret || !expectedSecret) {
    console.warn("[image-callback] Unauthorized: invalid or missing secret")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
    console.log("[image-callback] 🚀 RAW WEBHOOK PAYLOAD:", JSON.stringify(body, null, 2))
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const jobId = ((body.jobId || body.jobid) as string | undefined)?.trim()
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const status = (body.status as string | undefined)?.toLowerCase()
  console.log(`[image-callback] Received callback for job ${jobId}, status=${status}`)

  if (status === "failed" || status === "error") {
    // ── Refund on Failure ──
    const refundKey = `refund:${jobId}`
    if (!REFUNDED_KEYS.has(refundKey)) {
      const meta = await getImageJobMeta(jobId)
      if (meta) {
        await refundCredits(meta.userId, meta.creditCost, meta.feature)
        console.log(`[image-callback] Refunded ${meta.creditCost} credits for failed job ${jobId}`)
        REFUNDED_KEYS.add(refundKey)
        setTimeout(() => REFUNDED_KEYS.delete(refundKey), 30 * 60_000)
      } else {
        console.warn(`[image-callback] No metadata for failed job ${jobId} — cannot refund`)
      }
    }

    await storeImageJobResult(jobId, {
      media: [],
      timestamp: Date.now(),
      status: "error",
      error: (body.error as string) || "Image generation failed",
    })
    await cleanupImageJob(jobId, false) // delete meta, keep result
    return NextResponse.json({ ok: true })
  }

  // ── Success ──
  const media = extractMedia(body)
  
  await storeImageJobResult(jobId, {
    media,
    timestamp: Date.now(),
    status: "done",
  })

  await cleanupImageJob(jobId, false) // delete meta, keep result

  console.log(`[image-callback] Job ${jobId} cached. images=${media.length}`)

  return NextResponse.json({ ok: true })
}
