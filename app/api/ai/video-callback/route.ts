import { NextRequest, NextResponse } from "next/server"
import {
  deductCredits,
  getVideoJobMeta,
  storeVideoJobResult,
  cleanupVideoJob,
} from "@/lib/credits"

const DEDUCTED_KEYS = new Set<string>()

/**
 * Extract video URLs from UseAPI callback payload.
 * UseAPI sends the same format as the job status response.
 */
function extractMedia(data: Record<string, unknown>): Record<string, unknown>[] {
  const normalizeMedia = (arr: Record<string, unknown>[]) => arr.map(m => {
    if (m.videoUrl) return m; // already normalized
    const v = m.video as Record<string, unknown> | undefined;
    const gv = m.generatedVideo as Record<string, unknown> | undefined;
    const meta = m.metadata as Record<string, unknown> | undefined;
    const metaV = meta?.video as Record<string, unknown> | undefined;
    
    const url = m.fifeUrl || m.uri || m.url || v?.fifeUrl || v?.uri || gv?.fifeUrl || gv?.uri || metaV?.fifeUrl || metaV?.servingBaseUri || metaV?.uri;
    
    return {
      ...m,
      videoUrl: url,
      mediaGenerationId: m.mediaGenerationId || metaV?.mediaGenerationId || v?.mediaGenerationId
    };
  });

  // Direct media array
  if (Array.isArray(data.media)) return normalizeMedia(data.media as Record<string, unknown>[]);

  const response = data.response as Record<string, unknown> | undefined
  if (response && Array.isArray(response.media)) return normalizeMedia(response.media as Record<string, unknown>[]);

  // Async format: response.operations[]
  if (response && Array.isArray(response.operations)) {
    return (response.operations as Record<string, unknown>[])
      .filter((op) => {
        const status = ((op.status as string) || "").toUpperCase()
        return status.includes("SUCCESS") || status.includes("SUCCEEDED")
      })
      .map((op) => {
        const video = op.video as Record<string, unknown> | undefined
        const opInner = op.operation as Record<string, unknown> | undefined
        const metadata = opInner?.metadata as Record<string, unknown> | undefined
        const metaVideo = metadata?.video as Record<string, unknown> | undefined
        const videoUrl = (video?.fifeUrl || video?.uri || metaVideo?.fifeUrl || metaVideo?.servingBaseUri) as string | undefined
        return {
          videoUrl,
          mediaGenerationId: (op.mediaGenerationId || metaVideo?.mediaGenerationId) as string | undefined,
          video: {
            generatedVideo: {
              seed: (video?.seed || metaVideo?.seed) as number | undefined,
              model: (video?.model || metaVideo?.model) as string | undefined,
              prompt: (video?.prompt || metaVideo?.prompt) as string | undefined,
              aspectRatio: (video?.aspectRatio || metaVideo?.aspectRatio) as string | undefined,
            },
          },
        }
      })
      .filter((m) => m.videoUrl)
  }

  return []
}

/**
 * POST /api/ai/video-callback?secret=<16-char-prefix-of-NEXTAUTH_SECRET>
 *
 * Called by UseAPI when an async video generation job completes.
 * Stores the result in the settings table for the polling endpoint to pick up.
 *
 * UseAPI expects a 200 response quickly — do heavy work asynchronously.
 */
export async function POST(req: NextRequest) {
  // Verify shared secret (first 16 chars of NEXTAUTH_SECRET)
  const providedSecret = req.nextUrl.searchParams.get("secret")
  const expectedSecret = (process.env.NEXTAUTH_SECRET || "").slice(0, 16)

  if (!providedSecret || providedSecret !== expectedSecret || !expectedSecret) {
    console.warn("[video-callback] Unauthorized: invalid or missing secret")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const jobId = ((body.jobId || body.jobid) as string | undefined)?.trim()
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const status = (body.status as string | undefined)?.toLowerCase()
  console.log(`[video-callback] Received callback for job ${jobId}, status=${status}`)

  // Handle failed jobs
  if (status === "failed" || status === "error") {
    await storeVideoJobResult(jobId, {
      media: [],
      creditsDeducted: 0,
      timestamp: Date.now(),
      status: "error",
      error: (body.error as string) || "Video generation failed",
    })
    await cleanupVideoJob(jobId)
    return NextResponse.json({ ok: true })
  }

  // Extract media
  const media = extractMedia(body)

  // Verify that the webhook payload actually contains videoUrl.
  // Sometimes UseAPI webhook payloads are incomplete. If missing, we ignore it
  // and let the client's polling endpoint fetch the full payload directly from UseAPI.
  const hasValidVideo = media.some(m => m.videoUrl)
  if (!hasValidVideo && status === "completed") {
    console.warn(`[video-callback] Job ${jobId} webhook payload is missing videoUrl! Ignoring so client can poll directly.`)
    return NextResponse.json({ ok: true })
  }

  // Deduct credits using stored metadata
  let creditsDeducted = 0
  const deductKey = `cb:${jobId}`

  if (!DEDUCTED_KEYS.has(deductKey)) {
    const meta = await getVideoJobMeta(jobId)
    if (meta) {
      const costPerVideo = meta.feature === "omni-flash" ? 50 : 5 // CREDIT_COST_VIDEO = 5
      const amount = meta.videoCount * costPerVideo
      creditsDeducted = await deductCredits(meta.userId, amount, meta.feature)
      DEDUCTED_KEYS.add(deductKey)
      // Cleanup set after 30 min
      setTimeout(() => DEDUCTED_KEYS.delete(deductKey), 30 * 60_000)
    } else {
      console.warn(`[video-callback] No metadata for job ${jobId} — credits not deducted`)
    }
  }

  // Store result in DB for polling endpoint to pick up
  await storeVideoJobResult(jobId, {
    media,
    creditsDeducted,
    timestamp: Date.now(),
    status: "done",
  })

  // Cleanup metadata (no longer needed)
  await cleanupVideoJob(jobId) // only deletes meta, not result

  console.log(`[video-callback] Job ${jobId} cached. videos=${media.length}, credits=${creditsDeducted}`)

  return NextResponse.json({ ok: true })
}
