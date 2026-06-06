"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Trash2Icon, Loader2Icon, CheckCircle2Icon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function AdminGalleryTab() {
  const [isCleaning, setIsCleaning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleCleanup = async () => {
    setIsCleaning(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/gallery/cleanup", {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: data.message })
        setConfirmOpen(false)
      } else {
        setResult({ success: false, message: data.error || "Gagal membersihkan gallery" })
      }
    } catch (err) {
      setResult({ success: false, message: "Terjadi kesalahan koneksi" })
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-violet-500" />
            Manajemen Gallery
          </CardTitle>
          <CardDescription>
            Kelola file hasil generasi gambar dan video dari semua user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <h3 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
              Pembersihan Total (Danger Zone)
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Tindakan ini akan menghapus <strong>seluruh data gallery_items</strong> dari database, dan juga menghapus aset fisik dari akun <strong>Cloudinary</strong> (jika terkonfigurasi). Tindakan ini tidak dapat dibatalkan.
            </p>
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              className="gap-2"
            >
              <Trash2Icon className="h-4 w-4" />
              Bersihkan Semua Gallery & Cloudinary
            </Button>
          </div>

          {result && (
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              result.success 
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
            }`}>
              {result.success ? <CheckCircle2Icon className="h-5 w-5 shrink-0" /> : <Trash2Icon className="h-5 w-5 shrink-0" />}
              <span className="flex-1">{result.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembersihan Total</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus <strong>semua</strong> item gallery dari database dan Cloudinary? File yang dihapus tidak akan bisa dikembalikan lagi dan seluruh user akan kehilangan akses ke riwayat gambar/video mereka.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isCleaning}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleCleanup} disabled={isCleaning} className="gap-2">
              {isCleaning ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
              {isCleaning ? "Membersihkan..." : "Ya, Hapus Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
