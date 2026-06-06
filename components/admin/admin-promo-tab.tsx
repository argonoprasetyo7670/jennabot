"use client"

import { useState, useEffect } from "react"
import { PlusIcon, Trash2Icon, Loader2Icon, TicketIcon } from "lucide-react"

interface PromoCode {
  id: string
  code: string
  discountType: "percent" | "nominal"
  discountValue: number
  maxUses: number | null
  currentUses: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export function AdminPromoTab() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form states
  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState("percent")
  const [discountValue, setDiscountValue] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  const fetchPromos = async () => {
    try {
      const res = await fetch("/api/admin/promos")
      if (res.ok) {
        const data = await res.json()
        setPromos(data.promos || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromos()
  }, [])

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: parseInt(discountValue),
          maxUses: maxUses ? parseInt(maxUses) : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      })
      if (res.ok) {
        setCode("")
        setDiscountValue("")
        setMaxUses("")
        setExpiresAt("")
        fetchPromos()
      } else {
        const err = await res.json()
        alert(err.error || "Gagal menambah promo")
      }
    } catch {
      alert("Terjadi kesalahan")
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kode promo ini?")) return
    try {
      const res = await fetch(`/api/admin/promos?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchPromos()
      } else {
        alert("Gagal menghapus promo")
      }
    } catch {
      alert("Terjadi kesalahan")
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price)

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Add Promo Form ── */}
      <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <TicketIcon className="h-5 w-5 text-violet-500" />
          Buat Kode Promo Baru
        </h2>
        <form onSubmit={handleAddPromo} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Kode Promo</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: JENNA50"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipe Diskon</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="percent">Persentase (%)</option>
              <option value="nominal">Nominal (Rp)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nilai Diskon</label>
            <input
              type="number"
              required
              min="1"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "Contoh: 50" : "Contoh: 20000"}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Batas Kuota (Kosong=Unlimited)</label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Contoh: 100"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Kadaluarsa (Opsional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {isAdding ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
              Tambah Promo
            </button>
          </div>
        </form>
      </div>

      {/* ── Promo List ── */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Kode Promo</th>
                <th className="px-4 py-3 font-medium">Nilai Diskon</th>
                <th className="px-4 py-3 font-medium">Penggunaan</th>
                <th className="px-4 py-3 font-medium">Kadaluarsa</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada kode promo.
                  </td>
                </tr>
              ) : (
                promos.map((promo) => (
                  <tr key={promo.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-bold text-foreground">
                      <span className="rounded-md bg-violet-500/10 px-2 py-1 text-violet-500">
                        {promo.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {promo.discountType === "percent" ? `${promo.discountValue}%` : formatPrice(promo.discountValue)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground font-medium">{promo.currentUses}</span>
                      <span className="text-muted-foreground">
                        {promo.maxUses ? ` / ${promo.maxUses}` : " (Unlimited)"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeletePromo(promo.id)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Hapus"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
