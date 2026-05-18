"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Loader2Icon, PlusIcon, PencilIcon, Trash2Icon, PackageIcon,
  CheckIcon, XIcon, StarIcon, GiftIcon,
} from "lucide-react"

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  bonusCredits: number
  discountPercent: number
  description: string | null
  isActive: boolean
  isPopular: boolean
  sortOrder: number
}

const emptyPkg: Omit<CreditPackage, "id"> = {
  name: "", credits: 0, price: 0, bonusCredits: 0,
  discountPercent: 0, description: "", isActive: true, isPopular: false, sortOrder: 0,
}

export function AdminPackagesTab() {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CreditPackage | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyPkg)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/packages")
      if (res.ok) {
        const data = await res.json()
        setPackages(data.packages)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(p)

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ ...emptyPkg, sortOrder: packages.length + 1 })
  }

  const startEdit = (pkg: CreditPackage) => {
    setEditing(pkg)
    setCreating(false)
    setForm({
      name: pkg.name, credits: pkg.credits, price: pkg.price,
      bonusCredits: pkg.bonusCredits, discountPercent: pkg.discountPercent,
      description: pkg.description || "", isActive: pkg.isActive,
      isPopular: pkg.isPopular, sortOrder: pkg.sortOrder,
    })
  }

  const cancelForm = () => { setEditing(null); setCreating(false) }

  const handleSave = async () => {
    if (!form.name || !form.credits || !form.price) {
      setToast({ msg: "Nama, credits, dan harga wajib diisi", type: "error" })
      return
    }
    setSubmitting(true)
    try {
      const method = creating ? "POST" : "PATCH"
      const body = creating ? form : { id: editing!.id, ...form }
      const res = await fetch("/api/admin/packages", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setToast({ msg: creating ? "Paket berhasil dibuat" : "Paket berhasil diupdate", type: "success" })
        cancelForm()
        fetchPackages()
      } else {
        const err = await res.json()
        setToast({ msg: err.error || "Gagal menyimpan", type: "error" })
      }
    } catch {
      setToast({ msg: "Terjadi kesalahan", type: "error" })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus paket ini?")) return
    try {
      const res = await fetch("/api/admin/packages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setToast({ msg: "Paket berhasil dihapus", type: "success" })
        fetchPackages()
      }
    } catch {
      setToast({ msg: "Gagal menghapus paket", type: "error" })
    }
  }

  const isFormOpen = creating || editing !== null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="gap-1.5">
          <PackageIcon className="h-3 w-3" /> {packages.length} paket
        </Badge>
        {!isFormOpen && (
          <Button size="sm" className="gap-1.5" onClick={startCreate}>
            <PlusIcon className="h-4 w-4" /> Tambah Paket
          </Button>
        )}
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{creating ? "Buat Paket Baru" : `Edit: ${editing!.name}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Nama Paket</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Credits</label>
                <Input type="number" value={form.credits || ""} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Harga (Rp)</label>
                <Input type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Bonus Credits</label>
                <Input type="number" value={form.bonusCredits || ""} onChange={(e) => setForm({ ...form, bonusCredits: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Diskon (%)</label>
                <Input type="number" value={form.discountPercent || ""} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Urutan</label>
                <Input type="number" value={form.sortOrder || ""} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Deskripsi</label>
              <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Cocok untuk..." />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                Aktif
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} className="rounded" />
                Populer
              </label>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
                Simpan
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelForm} className="gap-1.5">
                <XIcon className="h-3.5 w-3.5" /> Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`relative overflow-hidden transition-all hover:shadow-md ${!pkg.isActive ? "opacity-50" : ""}`}>
              {pkg.isPopular && (
                <div className="absolute right-2 top-2">
                  <Badge className="gap-1 text-[10px] bg-violet-500/20 text-violet-400 border-violet-500/30">
                    <StarIcon className="h-2.5 w-2.5" /> Populer
                  </Badge>
                </div>
              )}
              <CardContent className="pt-5 pb-4 px-4 space-y-3">
                <div>
                  <h3 className="font-bold text-lg">{pkg.name}</h3>
                  {pkg.description && <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{formatPrice(pkg.price)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold">{pkg.credits.toLocaleString()} credits</span>
                  {pkg.bonusCredits > 0 && (
                    <span className="flex items-center gap-1 text-green-400 text-xs">
                      <GiftIcon className="h-3 w-3" /> +{pkg.bonusCredits}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pkg.isActive ? "secondary" : "outline"} className="text-[10px]">
                    {pkg.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                  {pkg.discountPercent > 0 && (
                    <Badge variant="outline" className="text-[10px] text-green-400">-{pkg.discountPercent}%</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1" onClick={() => startEdit(pkg)}>
                    <PencilIcon className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1 text-red-400 hover:text-red-300" onClick={() => handleDelete(pkg.id)}>
                    <Trash2Icon className="h-3 w-3" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${
            toast.type === "success" ? "border-green-500/30 bg-green-500/15 text-green-400" : "border-red-500/30 bg-red-500/15 text-red-400"
          }`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
