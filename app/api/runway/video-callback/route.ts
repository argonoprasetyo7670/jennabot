import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deductCredits } from "@/lib/credits"
import crypto from "crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, BUCKET_NAME } from "@/lib/s3"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const secret = url.searchParams.get("secret")
    
    // Verify secret
    const expectedSecret = (process.env.NEXTAUTH_SECRET || "fallback-secret").slice(0, 8)
    if (secret !== expectedSecret) {
      console.error("[runway/video-callback] Invalid secret")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("[runway/video-callback] Received webhook:", JSON.stringify(body).slice(0, 500))

    const status = body.status || body.task?.status
    const taskId = body.taskId || body.task?.taskId || body.task?.id
    const replyRef = body.replyRef || body.task?.replyRef

    if (status !== "SUCCEEDED") {
      console.log(`[runway/video-callback] Task ${taskId} status is ${status}, ignoring.`)
      return NextResponse.json({ success: true, message: "Ignored non-success status" })
    }

    const artifacts = body.artifacts || body.task?.artifacts || []
    
    // Find the first valid video artifact
    const video = artifacts.find((a: any) => {
      return a.metadata?.duration !== undefined || (a.url && a.url.includes("video"))
    }) || artifacts[0]

    const videoUrl = video?.url
    if (!videoUrl) {
      console.error(`[runway/video-callback] No video URL found for task ${taskId}`)
      return NextResponse.json({ success: true, message: "No video artifacts found" })
    }

    // Parse replyRef to get metadata
    let meta: any = {}
    try {
      if (replyRef) meta = JSON.parse(replyRef)
    } catch (e) {
      console.warn(`[runway/video-callback] Failed to parse replyRef: ${replyRef}`)
    }

    const userId = meta.userId
    if (!userId) {
      console.error(`[runway/video-callback] Missing userId in replyRef for task ${taskId}`)
      return NextResponse.json({ success: true, message: "Missing userId" })
    }

    // Check if already processed
    const deductKey = `deducted:${taskId}`
    const existingJob = await prisma.settings.findUnique({ where: { key: deductKey } })
    if (existingJob) {
      console.log(`[runway/video-callback] Task ${taskId} already processed.`)
      return NextResponse.json({ success: true, message: "Already processed" })
    }

    // Deduct credits (120 per Runway generation)
    const feature = meta.feature || "runway-video"
    await deductCredits(userId, 120, feature)

    // Mark as processed
    await prisma.settings.create({
      data: {
        id: crypto.randomUUID(),
        key: deductKey,
        value: JSON.stringify({ timestamp: Date.now() }),
        updatedAt: new Date(),
      }
    })

    // Save to gallery with MinIO download
    const galleryId = crypto.randomUUID()
    const endpointUrl = process.env.MINIO_ENDPOINT || "https://cdn.jennabot.pro"
    const baseUrl = endpointUrl.replace(/\/$/, "")
    const gcsPath = `gallery/${userId}/${galleryId}.mp4`
    
    // Download video from Runway/UseAPI and upload to MinIO
    let finalUrl = videoUrl
    try {
      console.log(`[runway/video-callback] Downloading video from ${videoUrl}`)
      const fileRes = await fetch(videoUrl)
      if (fileRes.ok) {
        const contentType = fileRes.headers.get("content-type") || "video/mp4"
        const buffer = Buffer.from(await fileRes.arrayBuffer())

        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: gcsPath,
          Body: buffer,
          ContentType: contentType,
        }))

        finalUrl = `${baseUrl}/${BUCKET_NAME}/${gcsPath}`
        console.log(`[runway/video-callback] Successfully uploaded to MinIO: ${finalUrl}`)
      } else {
        console.warn(`[runway/video-callback] Failed to download video (${fileRes.status}). Using original URL.`)
      }
    } catch (downloadErr) {
      console.warn(`[runway/video-callback] Download/Upload error:`, downloadErr)
    }

    // Use artifact assetId (user:...-asset:...) for mediaGenerationId, NOT taskId
    // This is required by the upscale API which expects a videoAssetId
    const videoAssetId = video?.assetId || video?.id || taskId
    await prisma.gallery_items.create({
      data: {
        id: galleryId,
        userId: userId,
        type: "video",
        gcsPath,
        gcsUrl: finalUrl,
        prompt: meta.prompt || null,
        model: meta.model || "runway",
        aspectRatio: meta.aspectRatio || null,
        mediaGenerationId: videoAssetId,
        sourceAction: feature,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        updatedAt: new Date(),
      }
    })

    console.log(`[runway/video-callback] Successfully processed task ${taskId} for user ${userId}. Saved to gallery.`)
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error("[runway/video-callback] Webhook error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
