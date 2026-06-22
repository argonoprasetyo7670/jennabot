import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { DeleteObjectsCommand } from "@aws-sdk/client-s3"
import { s3Client, BUCKET_NAME } from "@/lib/s3"

async function verifyAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (user?.role !== "admin") return null
  return session.user.id
}

/**
 * DELETE /api/admin/gallery/cleanup-expired
 * Deletes gallery items older than 7 days from both the database and MinIO.
 * Processes in batches to handle large volumes efficiently.
 */
export async function DELETE() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)

    // Count items that will be deleted
    const totalToDelete = await prisma.gallery_items.count({
      where: { createdAt: { lt: cutoffDate } },
    })

    if (totalToDelete === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        minioDeleted: 0,
        message: "Tidak ada item gallery yang lebih dari 7 hari.",
      })
    }

    let totalMinioDeleted = 0
    let totalDbDeleted = 0
    const BATCH_SIZE = 100

    // Process in batches
    while (true) {
      const items = await prisma.gallery_items.findMany({
        where: { createdAt: { lt: cutoffDate } },
        select: { id: true, gcsPath: true },
        take: BATCH_SIZE,
      })

      if (items.length === 0) break

      // Delete from MinIO in batch (max 1000 objects per request)
      const keysToDelete = items
        .map((item) => item.gcsPath)
        .filter((path): path is string => !!path)

      if (keysToDelete.length > 0) {
        try {
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: BUCKET_NAME,
              Delete: {
                Objects: keysToDelete.map((Key) => ({ Key })),
                Quiet: true,
              },
            })
          )
          totalMinioDeleted += keysToDelete.length
        } catch (err) {
          console.error(
            `[cleanup-expired] Failed to delete batch from MinIO:`,
            err
          )
          // Continue deleting from DB even if MinIO fails
        }
      }

      // Delete from database
      const ids = items.map((item) => item.id)
      const result = await prisma.gallery_items.deleteMany({
        where: { id: { in: ids } },
      })
      totalDbDeleted += result.count
    }

    console.log(
      `[cleanup-expired] Deleted ${totalDbDeleted} items from DB, ${totalMinioDeleted} files from MinIO`
    )

    return NextResponse.json({
      success: true,
      deletedCount: totalDbDeleted,
      minioDeleted: totalMinioDeleted,
      message: `Berhasil menghapus ${totalDbDeleted} item gallery (lebih dari 7 hari) dari database dan ${totalMinioDeleted} file dari MinIO.`,
    })
  } catch (error) {
    console.error("[cleanup-expired] Error:", error)
    return NextResponse.json(
      { error: "Gagal membersihkan gallery yang expired." },
      { status: 500 }
    )
  }
}
