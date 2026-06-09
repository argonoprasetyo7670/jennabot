import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, BUCKET_NAME } from "@/lib/s3"

/**
 * DELETE /api/gallery/[id] — Delete a gallery item
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify ownership
    const item = await prisma.gallery_items.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Delete physical file from MinIO CDN
    if (item.gcsPath) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: item.gcsPath
        }))
      } catch (err) {
        console.error("Failed to delete file from MinIO:", err)
        // We continue to delete from DB even if MinIO fails (e.g. file already gone)
      }
    }

    // Delete record from Database
    await prisma.gallery_items.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Gallery delete error:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
