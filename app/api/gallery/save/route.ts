import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, BUCKET_NAME } from "@/lib/s3"

/**
 * POST /api/gallery/save — Save an image or video to the user's gallery (MinIO CDN)
 * Body: { url, type, prompt, model, aspectRatio, mediaGenerationId }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { url, type, prompt, model, aspectRatio, mediaGenerationId, sourceAction } = await req.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const endpointUrl = process.env.MINIO_ENDPOINT || "https://cdn.jennabot.pro"
    const baseUrl = endpointUrl.replace(/\/$/, "")

    // If the URL sent by frontend is ALREADY our CDN URL, don't re-upload it
    if (url.startsWith(baseUrl)) {
      const existing = await prisma.gallery_items.findFirst({
        where: { userId: session.user.id, gcsUrl: url },
      })
      if (existing) {
        return NextResponse.json({ item: existing, alreadySaved: true })
      }
    }

    // Extract unique ID from the temporary URL to prevent duplicates
    let originalId = mediaGenerationId
    if (!originalId && url) {
      const urlWithoutQuery = url.split("?")[0]
      const parts = urlWithoutQuery.split("/")
      const lastPart = parts[parts.length - 1]
      if (lastPart && lastPart.length > 10) {
        originalId = lastPart
      }
    }

    // Check if already saved (by original URL, CDN URL, or extracted originalId)
    const existing = await prisma.gallery_items.findFirst({
      where: { 
        userId: session.user.id,
        OR: [
          { gcsUrl: url },
          { mediaGenerationId: originalId || "NO_MATCH" },
          { gcsUrl: { contains: originalId || "NO_MATCH" } }
        ]
      },
    })

    if (existing) {
      return NextResponse.json({ item: existing, alreadySaved: true })
    }

    // 1. Fetch file from temporary URL
    const fileRes = await fetch(url)
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file from URL: ${fileRes.status}`)
    }

    const contentType = fileRes.headers.get("content-type") || "application/octet-stream"
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    // 2. Determine file extension based on MIME type
    let ext = ""
    if (contentType.includes("image/jpeg")) ext = ".jpg"
    else if (contentType.includes("image/png")) ext = ".png"
    else if (contentType.includes("image/webp")) ext = ".webp"
    else if (contentType.includes("image/gif")) ext = ".gif"
    else if (contentType.includes("video/mp4")) ext = ".mp4"
    else if (contentType.includes("video/webm")) ext = ".webm"
    else if (type === "video") ext = ".mp4"
    else if (type === "image") ext = ".png"

    const id = crypto.randomUUID()
    const gcsPath = `gallery/${session.user.id}/${id}${ext}`

    // 3. Upload to MinIO
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: gcsPath,
      Body: buffer,
      ContentType: contentType,
    }))

    // 4. Construct permanent CDN URL
    const cdnUrl = `${baseUrl}/${BUCKET_NAME}/${gcsPath}`

    // 5. Save to database
    const item = await prisma.gallery_items.create({
      data: {
        id,
        userId: session.user.id,
        type: type || "image",
        gcsPath,
        gcsUrl: cdnUrl,
        prompt: prompt || null,
        model: model || null,
        aspectRatio: aspectRatio || null,
        mediaGenerationId: originalId || null,
        sourceAction: sourceAction || "generate",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ item, alreadySaved: false })
  } catch (error) {
    console.error("Gallery save error:", error)
    return NextResponse.json({ error: "Failed to save to gallery" }, { status: 500 })
  }
}
