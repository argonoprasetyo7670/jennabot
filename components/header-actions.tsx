"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  SunIcon,
  MoonIcon,
  CoinsIcon,
  RefreshCwIcon,
  BellIcon,
  ImageIcon,
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  XIcon,
  Trash2Icon,
  DownloadIcon,
  ImagePlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { useGenerationQueue, type GenerationJob } from "@/contexts/generation-queue"
import { useCredits } from "@/contexts/credits"
import { cn, formatModelName } from "@/lib/utils"
import { downloadVideo, downloadImage } from "@/lib/download"
import { VideoIcon } from "lucide-react"

export function HeaderActions() {
  const router = useRouter()
  const [isDark, setIsDark] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [showQueue, setShowQueue] = React.useState(false)
  const [previewJob, setPreviewJob] = React.useState<GenerationJob | null>(null)
  const queueRef = React.useRef<HTMLDivElement>(null)

  const { jobs, activeCount, clearJob, clearCompleted } = useGenerationQueue()
  const { balance, loading: creditsLoading } = useCredits()

  React.useEffect(() => {
    setIsDark(!document.documentElement.classList.contains("light"))
  }, [])

  // Close queue on outside click (desktop only)
  React.useEffect(() => {
    if (!showQueue) return
    const handleClick = (e: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(e.target as Node)) {
        setShowQueue(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showQueue])

  // Lock body scroll when mobile sheet or preview modal is open
  React.useEffect(() => {
    if (showQueue || previewJob) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [showQueue, previewJob])

  const toggleTheme = () => {
    const html = document.documentElement
    if (isDark) {
      html.classList.remove("dark")
      html.classList.add("light")
      localStorage.setItem("theme", "light")
      setIsDark(false)
    } else {
      html.classList.remove("light")
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
      setIsDark(true)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const completedCount = jobs.filter((j) => j.status === "done" || j.status === "error").length

  const handleJobClick = (job: GenerationJob) => {
    if (job.status === "done" && (job.images.length > 0 || job.videos.length > 0)) {
      setPreviewJob(job)
      setShowQueue(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => router.push("/dashboard/buy-credits")}
      >
        <CoinsIcon className="h-4 w-4 text-amber-500" />
        <span className="hidden sm:inline">
          {creditsLoading ? "..." : (balance ?? 0).toLocaleString()}
        </span>
      </Button>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
        <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      </Button>

      {/* Notification bell with queue */}
      <div className="relative" ref={queueRef}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={() => setShowQueue(!showQueue)}
        >
          <BellIcon className="h-4 w-4" />
          {(activeCount > 0 || completedCount > 0) && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center">
              {activeCount > 0 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              )}
              <span className={cn(
                "relative inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white",
                activeCount > 0 ? "bg-violet-500" : "bg-muted-foreground/50"
              )}>
                {activeCount > 0 ? activeCount : completedCount}
              </span>
            </span>
          )}
        </Button>

        {/* Desktop dropdown popup (hidden on mobile) */}
        {showQueue && (
          <div className="hidden sm:block absolute right-0 top-full mt-2 w-[380px] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl z-50">
            <QueueContent
              jobs={jobs}
              completedCount={completedCount}
              onClearCompleted={clearCompleted}
              onClearJob={clearJob}
              onJobClick={handleJobClick}
              onClose={() => setShowQueue(false)}
              isMobile={false}
            />
          </div>
        )}

        {/* Mobile full-screen sheet */}
        {showQueue && (
          <MobileSheet onClose={() => setShowQueue(false)}>
            <QueueContent
              jobs={jobs}
              completedCount={completedCount}
              onClearCompleted={clearCompleted}
              onClearJob={clearJob}
              onJobClick={handleJobClick}
              onClose={() => setShowQueue(false)}
              isMobile={true}
            />
          </MobileSheet>
        )}
      </div>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/dashboard/gallery")}>
        <ImageIcon className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </Button>

      {/* Image Preview Modal */}
      {previewJob && (
        <JobPreviewModal
          job={previewJob}
          onClose={() => setPreviewJob(null)}
        />
      )}
    </div>
  )
}

/* ─── Mobile Sheet (slides up from bottom) ─── */
function MobileSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const startY = React.useRef(0)
  const currentY = React.useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`
    }
  }

  const handleTouchEnd = () => {
    const diff = currentY.current - startY.current
    if (diff > 120) {
      onClose()
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)"
      sheetRef.current.style.transition = "transform 0.2s ease"
      setTimeout(() => {
        if (sheetRef.current) sheetRef.current.style.transition = ""
      }, 200)
    }
  }

  return (
    <div className="sm:hidden fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-t border-border bg-card shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─── Queue Content (shared between mobile sheet & desktop dropdown) ─── */
function QueueContent({
  jobs,
  completedCount,
  onClearCompleted,
  onClearJob,
  onJobClick,
  onClose,
  isMobile,
}: {
  jobs: GenerationJob[]
  completedCount: number
  onClearCompleted: () => void
  onClearJob: (id: string) => void
  onJobClick: (job: GenerationJob) => void
  onClose: () => void
  isMobile: boolean
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Antrean Generate</h3>
        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Hapus yang selesai"
            >
              <Trash2Icon className="h-3 w-3" />
              Bersihkan
            </button>
          )}
          {isMobile && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className={cn("overflow-y-auto", isMobile ? "max-h-[70vh]" : "max-h-[400px]")}>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <BellIcon className="h-6 w-6 mb-2 opacity-30" />
            <p className="text-xs">Belum ada antrean</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <JobItem
                key={job.id}
                job={job}
                onClear={() => onClearJob(job.id)}
                onClick={() => onJobClick(job)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ─── Individual Job Item ─── */
function JobItem({
  job,
  onClear,
  onClick,
}: {
  job: GenerationJob
  onClear: () => void
  onClick: () => void
}) {
  const statusIcon = {
    uploading: <Loader2Icon className="h-4 w-4 text-blue-400 animate-spin" />,
    generating: <Loader2Icon className="h-4 w-4 text-violet-400 animate-spin" />,
    done: <CheckCircle2Icon className="h-4 w-4 text-green-400" />,
    error: <XCircleIcon className="h-4 w-4 text-red-400" />,
  }

  const isClickable = job.status === "done" && (job.images.length > 0 || job.videos.length > 0)
  const isVideo = job.type === "video"
  const timeAgo = getTimeAgo(job.createdAt)

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition",
        isClickable
          ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70"
          : "hover:bg-muted/30"
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") onClick() } : undefined}
    >
      <div className="mt-0.5 shrink-0">{statusIcon[job.status]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{job.prompt}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {isVideo && <span className="text-[10px] text-blue-400">🎬 Video</span>}
          <span className="text-[10px] text-muted-foreground">{formatModelName(job.model)}</span>
          <span className="text-[10px] text-muted-foreground/50">•</span>
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>
        {job.progress && (
          <p className="text-[10px] text-violet-400 mt-1">{job.progress}</p>
        )}
        {job.error && (
          <p className="text-[10px] text-red-400 mt-1 truncate">{job.error}</p>
        )}
        {job.status === "done" && job.images.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {job.images.slice(0, 4).map((img, i) => (
              <div key={i} className="relative h-10 w-10 overflow-hidden rounded-md border border-border">
                <Image src={img.url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
            <span className="text-[10px] text-violet-400 ml-1">Tap untuk lihat →</span>
          </div>
        )}
        {job.status === "done" && isVideo && job.videos.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/50">
              <VideoIcon className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-[10px] text-violet-400 ml-1">{job.videos.length} video • Tap untuk lihat →</span>
          </div>
        )}
      </div>
      {(job.status === "done" || job.status === "error") && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear() }}
          className="mt-0.5 shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
          title="Hapus notifikasi"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function isMediaExpired(url?: string, proxyUrl?: string): boolean {
  try {
    const targetUrl = url || proxyUrl
    if (!targetUrl) return false
    let checkStr = targetUrl
    if (targetUrl.includes("/api/ai/video-download")) {
      const u = new URL(targetUrl, window.location.origin)
      const encoded = u.searchParams.get("url")
      if (encoded) checkStr = encoded
    }
    const parsed = new URL(checkStr)
    const expires = parsed.searchParams.get("Expires")
    if (expires) {
      return Date.now() / 1000 > parseInt(expires, 10)
    }
  } catch { /* ignore */ }
  return false
}

/* ─── Job Preview Modal (full-screen image/video viewer with gallery save) ─── */
function JobPreviewModal({ job, onClose }: { job: GenerationJob; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [savedItems, setSavedItems] = React.useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = React.useState(false)
  const isVideo = job.type === "video"
  const images = job.images
  const videos = job.videos
  const itemCount = isVideo ? videos.length : images.length

  const goNext = () => setCurrentIndex((p) => Math.min(p + 1, itemCount - 1))
  const goPrev = () => setCurrentIndex((p) => Math.max(p - 1, 0))

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount])

  // Swipe gesture for mobile
  const touchStartX = React.useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (diff > 60) goPrev()
    else if (diff < -60) goNext()
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      if (isVideo) {
        await downloadVideo(url, filename)
      } else {
        await downloadImage(url, filename)
      }
    } catch {
      window.open(url, "_blank")
    }
  }

  const handleSaveToGallery = async () => {
    const currentUrl = isVideo ? videos[currentIndex]?.url : images[currentIndex]?.url
    if (!currentUrl || isSaving) return

    const itemKey = `${isVideo ? "v" : "i"}-${currentIndex}`
    if (savedItems.has(itemKey)) return

    setIsSaving(true)
    try {
      const currentItem = isVideo ? videos[currentIndex] : images[currentIndex]
      const res = await fetch("/api/gallery/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: currentUrl,
          type: isVideo ? "video" : "image",
          prompt: job.prompt,
          model: job.model,
          aspectRatio: "9:16",
          mediaGenerationId: (currentItem as { mediaGenerationId?: string })?.mediaGenerationId || undefined,
        }),
      })
      if (res.ok) {
        setSavedItems((prev) => new Set(prev).add(itemKey))
      }
    } catch (err) {
      console.error("Failed to save to gallery:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const currentItem = isVideo ? videos[currentIndex] : images[currentIndex]
  // Fallback to rawUrl if available (videos)
  const rawUrl = isVideo ? (currentItem as any)?.rawUrl : undefined
  const currentUrl = currentItem?.url
  const expired = isMediaExpired(rawUrl, currentUrl)
  const fileExt = isVideo ? "mp4" : "png"
  const currentItemKey = `${isVideo ? "v" : "i"}-${currentIndex}`
  const isCurrentSaved = savedItems.has(currentItemKey)

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">{job.prompt}</p>
          <p className="text-[11px] text-white/50 mt-0.5">{formatModelName(job.model)} • {itemCount} {isVideo ? "video" : "gambar"}</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm text-white/90 transition hover:bg-white/25 active:scale-95 ml-3 border border-white/10"
        >
          <XIcon className="h-4 w-4" />
          <span className="text-xs font-medium">Tutup</span>
        </button>
      </div>

      {/* Main content area */}
      <div
        className="flex-1 relative flex items-center justify-center px-4 sm:px-16 overflow-hidden"
        onClick={onClose}
      >
        {/* Navigation arrows (desktop) */}
        {itemCount > 1 && currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="hidden sm:flex absolute left-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        )}
        {itemCount > 1 && currentIndex < itemCount - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="hidden sm:flex absolute right-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}

        <div
          className={cn("relative w-full max-w-3xl", isVideo ? "max-h-[70vh]" : "max-h-[65vh] sm:max-h-[70vh] aspect-square")}
          onClick={(e) => e.stopPropagation()}
        >
          {expired ? (
            <div className="flex h-[300px] sm:h-[400px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-inner">
              {isVideo ? <VideoIcon className="mb-3 h-12 w-12 text-white/30" /> : <ImageIcon className="mb-3 h-12 w-12 text-white/30" />}
              <p className="text-lg font-semibold text-white/80">Link Kedaluwarsa</p>
              <p className="mt-2 max-w-sm text-sm text-white/50">Link media ini hanya berlaku selama 24 jam. Jika sudah tersimpan di Gallery, Anda bisa melihatnya di sana.</p>
            </div>
          ) : isVideo ? (
            <video
              key={currentIndex}
              src={currentUrl}
              className="w-full max-h-[70vh] rounded-2xl object-contain"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <Image
              src={currentUrl || ""}
              alt={`Generated ${currentIndex + 1}`}
              fill
              className="object-contain rounded-2xl"
              unoptimized
            />
          )}
        </div>
      </div>

      {/* Dots indicator */}
      {itemCount > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {Array.from({ length: itemCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentIndex
                  ? "w-6 bg-violet-400"
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Thumbnails row (images only) */}
      {!isVideo && images.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 pb-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                i === currentIndex
                  ? "border-violet-400 ring-2 ring-violet-400/30"
                  : "border-white/10 opacity-50 hover:opacity-80"
              )}
            >
              <Image src={img.url} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-2 px-4 pb-6 pt-2 sm:pb-8">
        <button
          onClick={() => handleDownload(currentUrl || "", `jenna-${job.id}-${currentIndex + 1}.${fileExt}`)}
          disabled={expired}
          className={cn("flex h-11 items-center gap-2 rounded-xl px-5 text-sm transition", expired ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-white/10 text-white/90 hover:bg-white/20 active:scale-95")}
        >
          <DownloadIcon className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={handleSaveToGallery}
          disabled={isSaving || isCurrentSaved || expired}
          className={cn(
            "flex h-11 items-center gap-2 rounded-xl px-5 text-sm transition active:scale-95",
            isCurrentSaved
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : isSaving || expired
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/10 text-white/90 hover:bg-white/20"
          )}
        >
          {isCurrentSaved ? (
            <>
              <CheckCircle2Icon className="h-4 w-4" />
              Tersimpan
            </>
          ) : isSaving ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <ImagePlusIcon className="h-4 w-4" />
              Simpan ke Gallery
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm text-white/90 transition hover:bg-white/20 active:scale-95 sm:hidden"
        >
          <XIcon className="h-4 w-4" />
          Tutup
        </button>
        {itemCount > 1 && (
          <span className="text-xs text-white/40 ml-2 hidden sm:inline">
            {currentIndex + 1} / {itemCount}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Helper ─── */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "baru saja"
  if (seconds < 60) return `${seconds}d lalu`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m lalu`
  const hours = Math.floor(minutes / 60)
  return `${hours}j lalu`
}
