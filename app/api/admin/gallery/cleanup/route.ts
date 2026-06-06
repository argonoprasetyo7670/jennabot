import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { v2 as cloudinary } from "cloudinary"

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
 * DELETE /api/admin/gallery/cleanup
 * Cleans up ALL items in the gallery_items table, and deletes assets from Cloudinary.
 */
export async function DELETE() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    let cloudinaryCleaned = false

    // Initialize Cloudinary if credentials exist
    if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_2_CLOUD_NAME && process.env.CLOUDINARY_2_API_KEY)) {
      if (process.env.CLOUDINARY_2_CLOUD_NAME) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_2_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_2_API_KEY,
          api_secret: process.env.CLOUDINARY_2_API_SECRET,
        })
      }

      // We delete everything inside the "jenna" folder
      try {
        await cloudinary.api.delete_resources_by_prefix("jenna/", { resource_type: "image" })
        await cloudinary.api.delete_resources_by_prefix("jenna/", { resource_type: "video" })
        cloudinaryCleaned = true
      } catch (cloudErr) {
        console.error("Cloudinary cleanup error:", cloudErr)
      }
    }

    // Clean up database
    const result = await prisma.gallery_items.deleteMany({})

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cloudinaryCleaned,
      message: `Berhasil menghapus ${result.count} item dari database${cloudinaryCleaned ? " dan Cloudinary" : ""}.`
    })
  } catch (error) {
    console.error("Gallery cleanup error:", error)
    return NextResponse.json({ error: "Gagal membersihkan gallery." }, { status: 500 })
  }
}
