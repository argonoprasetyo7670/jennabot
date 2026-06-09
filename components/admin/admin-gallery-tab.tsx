"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ImageIcon, Trash2Icon, Loader2Icon, CheckCircle2Icon,
  SearchIcon, XIcon, GridIcon, LayoutGridIcon, VideoIcon,
  ClockIcon, FilterIcon, CalendarIcon, UserIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon,
  ArrowDownUpIcon
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { cn, isMediaUrlExpired, mediaUrlExpiryLabel, formatModelName } from "@/lib/utils"

type FilterType = "all" | "image" | "video"
type SortType = "desc" | "asc"
type StatusType = "all" | "active" | "expired"

interface AdminGalleryItem {
  id: string
  type: string
  gcsUrl: string
  mediaGenerationId?: string
  prompt?: string
  model?: string
  aspectRatio?: string
  width?: number
  height?: number
  sourceAction?: string
  createdAt: string
  users: {
    name: string | null
    email: string
  }
}

export function AdminGalleryTab() {
  const [isCleaning, setIsCleaning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Gallery Viewer States
  const [items, setItems] = useState<AdminGalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [sort, setSort] = useState<SortType>("desc")
  const [status, setStatus] = useState<StatusType>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [debouncedUserEmail, setDebouncedUserEmail] = useState("")
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [gridSize, setGridSize] = useState<"small" | "large">("large")

  // Preview States
  const [previewItem, setPreviewItem] = useState<AdminGalleryItem | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  
  // Individual Delete
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<AdminGalleryItem | null>(null)

  const handleCleanup = async () => {
    setIsCleaning(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/gallery/cleanup", { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: data.message })
        setConfirmOpen(false)
        fetchItems()
      } else {
        setResult({ success: false, message: data.error || "Gagal membersihkan gallery" })
      }
    } catch (err) {
      setResult({ success: false, message: "Terjadi kesalahan koneksi" })
    } finally {
      setIsCleaning(false)
    }
  }

  const confirmDeleteItem = async () => {
    if (!deleteItemConfirm) return
    const id = deleteItemConfirm.id
    setIsDeleting(id)
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
        setTotalItems(prev => prev - 1)
        if (previewItem?.id === id) setPreviewItem(null)
        setDeleteItemConfirm(null)
      } else {
        alert("Gagal menghapus item: respons dari server gagal")
      }
    } catch (err) {
      console.error(err)
      alert("Gagal menghapus item")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteItem = async (e: React.MouseEvent, item: AdminGalleryItem) => {
    e.stopPropagation()
    setDeleteItemConfirm(item)
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setDebouncedUserEmail(userEmail)
      setPage(1)
    }, 500)
    return () => clearTimeout(t)
  }, [search, userEmail])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("type", filter)
      if (status !== "all") params.set("status", status)
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (debouncedUserEmail) params.set("userEmail", debouncedUserEmail)
      params.set("sort", sort)
      params.set("page", String(page))
      params.set("limit", "24")

      const res = await fetch(`/api/admin/gallery?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items)
        setTotalPages(data.totalPages)
        setTotalItems(data.total)
      }
    } catch (err) {
      console.error("Failed to fetch gallery:", err)
    } finally {
      setLoading(false)
    }
  }, [filter, status, debouncedSearch, debouncedUserEmail, sort, page])

  // Fetch when params change
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  // Preview navigation
  const goPreview = (dir: 1 | -1) => {
    const newIdx = previewIndex + dir
    if (newIdx >= 0 && newIdx < items.length) {
      setPreviewIndex(newIdx)
      setPreviewItem(items[newIdx])
    }
  }

  // Keyboard nav in preview
  useEffect(() => {
    if (!previewItem) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewItem(null)
      if (e.key === "ArrowRight") goPreview(1)
      if (e.key === "ArrowLeft") goPreview(-1)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewItem, previewIndex, items])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = previewItem ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [previewItem])

  return (
    <div className="space-y-4 pb-12">
      {/* ─── DANGER ZONE ─── */}
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
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-red-600 dark:text-red-400">
                Pembersihan Total (Danger Zone)
              </h3>
              <p className="text-xs text-muted-foreground">
                Menghapus <strong>seluruh data gallery_items</strong> dari database. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)} className="gap-2 shrink-0">
              <Trash2Icon className="h-4 w-4" />
              Bersihkan Semua Gallery
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

      {/* ─── GALLERY VIEWER ─── */}
      <Card>
        <div className="border-b border-border bg-muted/20 px-4 py-3 rounded-t-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "image", "video"] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    filter === f
                      ? "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {f === "all" ? <FilterIcon className="h-3.5 w-3.5" /> : f === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <VideoIcon className="h-3.5 w-3.5" />}
                  <span className="capitalize">{f === "all" ? "Semua" : f === "image" ? "Gambar" : "Video"}</span>
                </button>
              ))}
              
              <div className="h-6 w-px bg-border mx-1" />
              
              {/* Status Dropdown */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5">
                <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <select 
                  className="bg-transparent text-xs text-foreground focus:outline-none"
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as StatusType); setPage(1); }}
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="expired">Kadaluarsa</option>
                </select>
              </div>

              <div className="h-6 w-px bg-border mx-1" />
              
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5">
                <ArrowDownUpIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <select 
                  className="bg-transparent text-xs text-foreground focus:outline-none"
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as SortType); setPage(1); }}
                >
                  <option value="desc">Terbaru</option>
                  <option value="asc">Terlama</option>
                </select>
              </div>
            </div>

            {/* Search + Grid Toggle */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-[180px]">
                <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="Filter email user..."
                  className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                {userEmail && (
                  <button onClick={() => setUserEmail("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              <div className="relative flex-1 lg:w-[220px]">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari prompt..."
                  className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center rounded-lg border border-border p-0.5 bg-background shrink-0">
                <button
                  onClick={() => setGridSize("small")}
                  className={cn("rounded-md p-1.5 transition", gridSize === "small" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Grid kecil"
                >
                  <GridIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setGridSize("large")}
                  className={cn("rounded-md p-1.5 transition", gridSize === "large" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  title="Grid besar"
                >
                  <LayoutGridIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Total {totalItems} item ditemukan</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2Icon className="h-8 w-8 text-violet-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Memuat gallery...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/80">Gallery kosong</p>
                <p className="text-xs text-muted-foreground mt-1">Tidak ada hasil yang ditemukan.</p>
              </div>
            </div>
          ) : (
            <>
              <div className={cn(
                "grid gap-3",
                gridSize === "small"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              )}>
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/50 transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg"
                  >
                    {/* Media */}
                    <div
                      className={cn(
                        "relative cursor-pointer overflow-hidden bg-muted/30 shrink-0",
                        gridSize === "small" ? "aspect-square" : "aspect-[4/3]"
                      )}
                      onClick={() => { setPreviewItem(item); setPreviewIndex(i) }}
                    >
                      {item.type === "video" ? (
                        <div className="relative h-full w-full">
                          {isMediaUrlExpired(item.gcsUrl) ? (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted/40">
                              <ClockIcon className="h-6 w-6 text-muted-foreground/40" />
                              <span className="text-[10px] text-muted-foreground/50">Kadaluarsa</span>
                            </div>
                          ) : (
                            <video
                              src={item.gcsUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                              onError={() => {}}
                              onMouseOver={e => (e.target as HTMLVideoElement).play?.()?.catch(() => {})}
                              onMouseOut={e => { const v = e.target as HTMLVideoElement; v.pause?.(); v.currentTime = 0 }}
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm opacity-80 group-hover:opacity-100 transition">
                              <VideoIcon className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : isMediaUrlExpired(item.gcsUrl) ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted/40">
                          <ClockIcon className="h-6 w-6 text-muted-foreground/40" />
                          <span className="text-[10px] text-muted-foreground/50">Kadaluarsa</span>
                        </div>
                      ) : (
                        <Image
                          src={item.gcsUrl}
                          alt={item.prompt || "Gallery item"}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      )}
                      
                      {/* User Badge */}
                      <div className="absolute top-2 right-2 max-w-[80%]">
                        <span className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md truncate border border-white/10">
                          <UserIcon className="h-2.5 w-2.5 shrink-0" /> 
                          <span className="truncate">{item.users.email}</span>
                        </span>
                      </div>
                      
                      {item.type === "video" && (
                        <div className="absolute top-2 left-2 pointer-events-none">
                          <span className="flex items-center gap-1 rounded-md bg-blue-500/80 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                            <VideoIcon className="h-2.5 w-2.5" /> Video
                          </span>
                        </div>
                      )}
                      
                      {/* Delete Overlay Button */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteItem(e, item)}
                          disabled={isDeleting === item.id}
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/80 text-white backdrop-blur-sm hover:bg-red-500 transition-colors"
                          title="Hapus"
                        >
                          {isDeleting === item.id ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <Trash2Icon className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Info footer */}
                    <div className="px-2.5 py-2 flex flex-col gap-1.5 flex-1">
                      <p className="text-[10px] text-foreground/80 line-clamp-2 leading-relaxed" title={item.prompt || ""}>
                        {item.prompt || <span className="text-muted-foreground italic">Tanpa prompt</span>}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.model && (
                            <span className="flex items-center gap-0.5 text-[9px] text-violet-400 font-medium shrink-0">
                              <SparklesIcon className="h-2.5 w-2.5" />
                              {formatModelName(item.model)}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50 shrink-0">
                          <CalendarIcon className="h-2.5 w-2.5" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1" 
                      disabled={page <= 1} 
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeftIcon className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1" 
                      disabled={page >= totalPages} 
                      onClick={() => setPage(page + 1)}
                    >
                      Next <ChevronRightIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
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
      
      <Dialog open={!!deleteItemConfirm} onOpenChange={(open) => !open && setDeleteItemConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Item</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus {deleteItemConfirm?.type === "video" ? "video" : "gambar"} ini secara permanen? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4 bg-muted/30 rounded-lg border">
             {deleteItemConfirm && (
                deleteItemConfirm.type === "video" && !isMediaUrlExpired(deleteItemConfirm.gcsUrl) ? (
                  <video src={deleteItemConfirm.gcsUrl} className="max-h-32 rounded object-cover" />
                ) : !isMediaUrlExpired(deleteItemConfirm.gcsUrl) ? (
                  <img src={deleteItemConfirm.gcsUrl} className="max-h-32 rounded object-cover" alt="Preview" />
                ) : (
                  <span className="text-xs text-muted-foreground">Preview tidak tersedia (Kadaluarsa)</span>
                )
             )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteItemConfirm(null)} disabled={!!isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteItem} disabled={!!isDeleting} className="gap-2">
              {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ── Preview Modal ── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewItem(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={e => e.stopPropagation()}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">{previewItem.prompt || "Untitled"}</p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {previewItem.users.email} • {formatModelName(previewItem.model) || "Unknown"} • {previewItem.type === "video" ? "Video" : "Gambar"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleDeleteItem(e, previewItem)}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-red-500/20 px-3 text-sm text-red-400 transition hover:bg-red-500/30 active:scale-95 ml-3 border border-red-500/30"
              >
                {isDeleting === previewItem.id ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
                <span className="hidden sm:inline text-xs font-medium">Hapus</span>
              </button>
              
              <button
                onClick={() => setPreviewItem(null)}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm text-white/90 transition hover:bg-white/25 active:scale-95 border border-white/10"
              >
                <XIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">Tutup</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative flex items-center justify-center px-4 sm:px-16 overflow-hidden" onClick={() => setPreviewItem(null)}>
            {/* Nav arrows */}
            {previewIndex > 0 && (
              <button
                onClick={e => { e.stopPropagation(); goPreview(-1) }}
                className="hidden sm:flex absolute left-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            )}
            {previewIndex < items.length - 1 && (
              <button
                onClick={e => { e.stopPropagation(); goPreview(1) }}
                className="hidden sm:flex absolute right-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            )}

            <div className={cn("relative w-full max-w-3xl", previewItem.type === "video" ? "max-h-[70vh]" : "max-h-[70vh] aspect-square")} onClick={e => e.stopPropagation()}>
              {previewItem.type === "video" ? (
                isMediaUrlExpired(previewItem.gcsUrl) ? (
                  <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40">
                    <ClockIcon className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground/60">URL video ini sudah kadaluarsa</p>
                  </div>
                ) : (
                  <video
                    key={previewItem.id}
                    src={previewItem.gcsUrl}
                    className="w-full max-h-[70vh] rounded-2xl object-contain"
                    controls
                    autoPlay
                    playsInline
                    onError={() => {}}
                  />
                )
              ) : isMediaUrlExpired(previewItem.gcsUrl) ? (
                <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40">
                  <ClockIcon className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground/60">URL gambar ini sudah kadaluarsa</p>
                </div>
              ) : (
                <Image
                  src={previewItem.gcsUrl}
                  alt={previewItem.prompt || "Preview"}
                  fill
                  className="object-contain rounded-2xl"
                  unoptimized
                  onError={() => {}}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
