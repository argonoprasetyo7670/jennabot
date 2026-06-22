import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, BUCKET_NAME } from "@/lib/s3"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Double check admin role
  const me = await prisma.users.findUnique({ where: { id: session.user.id } })
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params

    const item = await prisma.gallery_items.findUnique({
      where: { id },
      select: { id: true, gcsPath: true },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Delete physical file from MinIO CDN
    if (item.gcsPath) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: item.gcsPath,
        }))
      } catch (err) {
        console.error("Failed to delete file from MinIO:", err)
        // Continue to delete from DB even if MinIO fails
      }
    }

    await prisma.gallery_items.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin Gallery delete error:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
