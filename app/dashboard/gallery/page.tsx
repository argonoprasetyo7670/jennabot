"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { DashboardHeader } from "@/components/dashboard-header"
import { cn, isMediaUrlExpired, mediaUrlExpiryLabel } from "@/lib/utils"
import { downloadMedia } from "@/lib/download"
import { upscaleRunwayVideo } from "@/lib/api/runway-flow"
import {
  ImageIcon,
  VideoIcon,
  SearchIcon,
  DownloadIcon,
  Trash2Icon,
  XIcon,
  Loader2Icon,
  LayoutGridIcon,
  GridIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  CalendarIcon,
  FilterIcon,
  ClockIcon,
} from "lucide-react"

/* ─── Types ─── */
interface GalleryItem {
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
}

type FilterType = "all" | "image" | "video"
type GridSize = "small" | "large"

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [gridSize, setGridSize] = useState<GridSize>("small")
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [upscaling, setUpscaling] = useState<string | null>(null)
  const observerRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [search])

  // Fetch gallery items
  const fetchItems = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams({ type: filter, limit: "30" })
      if (cursor) params.set("cursor", cursor)
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await fetch(`/api/gallery?${params}`)
      const data = await res.json()

      if (res.ok) {
        if (cursor) {
          setItems(prev => [...prev, ...(data.items || [])])
        } else {
          setItems(data.items || [])
        }
        setNextCursor(data.nextCursor || null)
        setHasMore(data.hasMore || false)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filter, debouncedSearch])

  // Re-fetch when filter or search changes
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && nextCursor) {
          fetchItems(nextCursor)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, nextCursor, fetchItems])

  // Download via proxy (Safari/iOS compatible)
  const handleDownload = async (item: GalleryItem) => {
    const isVideo = item.type === "video"
    const ext = isVideo ? "mp4" : "png"
    const filename = `jenna-${item.id.slice(0, 8)}.${ext}`
    try {
      await downloadMedia(item.gcsUrl, filename, isVideo ? "video" : "image")
    } catch {
      window.open(item.gcsUrl, "_blank")
    }
  }

  // Delete item
  const handleDelete = async (id: string) => {
    if (deleting) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id))
        if (previewItem?.id === id) setPreviewItem(null)
      }
    } catch { /* ignore */ } finally {
      setDeleting(null)
    }
  }

  // Upscale to 4K using Topaz
  const handleUpscale = async (item: GalleryItem) => {
    if (!item.mediaGenerationId) {
      alert("Asset ID tidak ditemukan untuk video ini. (Video lama tidak didukung)")
      return
    }
    setUpscaling(item.id)
    try {
      const result = await upscaleRunwayVideo(item.mediaGenerationId)
      
      // Auto download
      try {
        await downloadMedia(result.url, `jenna-4k-${item.id.slice(0, 8)}.mp4`, "video")
      } catch {
        window.open(result.url, "_blank")
      }
      
      // Save new 4K to gallery
      await fetch("/api/gallery/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: result.url, 
          type: "video", 
          prompt: `[4K Upscaled] ${item.prompt || ""}`, 
          model: "Topaz AI 4K", 
          aspectRatio: item.aspectRatio, 
          mediaGenerationId: result.assetId, 
          sourceAction: item.sourceAction 
        }),
      })
      alert("Video berhasil di-upscale ke 4K dan disimpan di Gallery!")
      fetchItems()
    } catch (err: any) {
      alert(`Upscale gagal: ${err.message || "Unknown error"}`)
    } finally {
      setUpscaling(null)
    }
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

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  const imageCount = items.filter(i => i.type === "image").length
  const videoCount = items.filter(i => i.type === "video").length

  const filters: { key: FilterType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "all", label: "Semua", icon: <FilterIcon className="h-3.5 w-3.5" />, count: items.length },
    { key: "image", label: "Gambar", icon: <ImageIcon className="h-3.5 w-3.5" />, count: imageCount },
    { key: "video", label: "Video", icon: <VideoIcon className="h-3.5 w-3.5" />, count: videoCount },
  ]

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Gallery" },
      ]} />

      <div className="flex-1 overflow-y-auto">
        {/* ── Sticky Toolbar ── */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3">
          <div className="mx-auto max-w-7xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Filters */}
            <div className="flex items-center gap-1.5">
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    filter === f.key
                      ? "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {f.icon}
                  <span>{f.label}</span>
                  {!loading && f.count !== undefined && (
                    <span className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                      filter === f.key ? "bg-violet-500/20 text-violet-300" : "bg-muted text-muted-foreground"
                    )}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Right: Search + Grid Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari prompt..."
                  className="h-8 w-48 rounded-lg border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center rounded-lg border border-border p-0.5">
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

        {/* ── Content ── */}
        <div className="mx-auto max-w-7xl px-4 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 animate-fade-up">
              <Loader2Icon className="h-8 w-8 text-violet-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Memuat gallery...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-up">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20">
                  <ImageIcon className="h-8 w-8 text-violet-400/50" />
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-violet-500/5 blur-xl -z-10" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground/80">Gallery masih kosong</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {debouncedSearch
                    ? `Tidak ditemukan hasil untuk "${debouncedSearch}"`
                    : "Buat gambar atau video dengan AI Tools untuk mengisi gallery Anda"
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className={cn(
                "grid gap-3",
                gridSize === "small"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card/50 transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5 animate-fade-up"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    {/* Media */}
                    <div
                      className={cn(
                        "relative cursor-pointer overflow-hidden bg-muted/30",
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
                              onMouseOver={e => (e.target as HTMLVideoElement).play?.()}
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
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          onError={() => {}}
                        />
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 inset-x-0 p-2.5">
                          {item.prompt && (
                            <p className="text-[10px] text-white/80 line-clamp-2 mb-2 leading-relaxed">{item.prompt}</p>
                          )}
                          {/* Expiry countdown */}
                          {(() => {
                            const label = mediaUrlExpiryLabel(item.gcsUrl)
                            if (!label || label === "Kadaluarsa") return null
                            return (
                              <p className="text-[9px] text-amber-300/80 mb-1.5 flex items-center gap-1">
                                <ClockIcon className="h-2.5 w-2.5" /> {label}
                              </p>
                            )
                          })()}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); handleDownload(item) }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white/80 backdrop-blur-sm transition hover:bg-white/25"
                              title="Download"
                            >
                              <DownloadIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                              disabled={deleting === item.id}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white/80 backdrop-blur-sm transition hover:bg-red-500/40 disabled:opacity-40"
                              title="Hapus"
                            >
                              {deleting === item.id
                                ? <Loader2Icon className="h-3 w-3 animate-spin" />
                                : <Trash2Icon className="h-3.5 w-3.5" />
                              }
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Type badge */}
                      {item.type === "video" && (
                        <div className="absolute top-2 left-2">
                          <span className="flex items-center gap-1 rounded-md bg-blue-500/80 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                            <VideoIcon className="h-2.5 w-2.5" /> Video
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info footer */}
                    <div className="px-2.5 py-2 border-t border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.model && (
                            <span className="flex items-center gap-0.5 text-[9px] text-violet-400 font-medium shrink-0">
                              <SparklesIcon className="h-2.5 w-2.5" />
                              {item.model === "veo-3.1-lite-low-priority" ? "Veo 3.1" : item.model}
                            </span>
                          )}
                          {item.aspectRatio && (
                            <span className="text-[9px] text-muted-foreground/60 shrink-0">{item.aspectRatio}</span>
                          )}
                        </div>
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50 shrink-0">
                          <CalendarIcon className="h-2.5 w-2.5" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      {/* Expiry badge — always visible */}
                      {(() => {
                        const expired = isMediaUrlExpired(item.gcsUrl)
                        const label = mediaUrlExpiryLabel(item.gcsUrl)
                        if (!label) return null
                        return (
                          <div className={`mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 w-fit text-[9px] font-medium ${
                            expired
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}>
                            <ClockIcon className="h-2.5 w-2.5" />
                            {label}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more sentinel */}
              <div ref={observerRef} className="py-8 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Memuat lebih banyak...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

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
                {(previewItem.model === "veo-3.1-lite-low-priority" ? "Veo 3.1" : previewItem.model) || "Unknown"} • {previewItem.type === "video" ? "Video" : "Gambar"} • {formatDate(previewItem.createdAt)}
              </p>
            </div>
            <button
              onClick={() => setPreviewItem(null)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm text-white/90 transition hover:bg-white/25 active:scale-95 ml-3 border border-white/10"
            >
              <XIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Tutup</span>
            </button>
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

          {/* Dots */}
          {items.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-2">
              {items.slice(
                Math.max(0, previewIndex - 4),
                Math.min(items.length, previewIndex + 5)
              ).map((item, i) => {
                const actualIdx = Math.max(0, previewIndex - 4) + i
                return (
                  <button
                    key={item.id}
                    onClick={e => { e.stopPropagation(); setPreviewIndex(actualIdx); setPreviewItem(items[actualIdx]) }}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      actualIdx === previewIndex ? "w-6 bg-violet-400" : "w-1.5 bg-white/30 hover:bg-white/50"
                    )}
                  />
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-2 px-4 pb-6 pt-2 sm:pb-8" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => handleDownload(previewItem)}
              className="flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm text-white/90 transition hover:bg-white/20 active:scale-95"
            >
              <DownloadIcon className="h-4 w-4" /> Download
            </button>

            {(previewItem.sourceAction === "seedance-2" || previewItem.sourceAction === "motion-control") && previewItem.model !== "Topaz AI 4K" && (
              <button
                onClick={() => handleUpscale(previewItem)}
                disabled={upscaling === previewItem.id}
                className="flex h-11 items-center gap-2 rounded-xl bg-violet-500/20 px-5 text-sm text-violet-300 transition hover:bg-violet-500/30 active:scale-95 disabled:opacity-40"
                title="Tingkatkan resolusi ke 4K menggunakan Topaz AI"
              >
                {upscaling === previewItem.id ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                <span className="hidden sm:inline">{upscaling === previewItem.id ? "Memproses..." : "Upscale 4K"}</span>
                <span className="sm:hidden">4K</span>
              </button>
            )}
            <button
              onClick={() => handleDelete(previewItem.id)}
              disabled={deleting === previewItem.id}
              className="flex h-11 items-center gap-2 rounded-xl bg-red-500/20 px-5 text-sm text-red-300 transition hover:bg-red-500/30 active:scale-95 disabled:opacity-40"
            >
              {deleting === previewItem.id ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
              Hapus
            </button>
            <button
              onClick={() => setPreviewItem(null)}
              className="flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm text-white/90 transition hover:bg-white/20 active:scale-95 sm:hidden"
            >
              <XIcon className="h-4 w-4" /> Tutup
            </button>
            {items.length > 1 && (
              <span className="text-xs text-white/40 ml-2 hidden sm:inline">
                {previewIndex + 1} / {items.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
