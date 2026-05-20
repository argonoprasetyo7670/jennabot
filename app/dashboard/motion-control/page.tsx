"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClipboardIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FilmIcon,
  KeyRoundIcon,
  Loader2Icon,
  RefreshCwIcon,
  SaveIcon,
  SendIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { downloadVideo } from "@/lib/download"

const CREDIT_COST = 120

type MotionTier = "pro" | "std"
type MotionOrientation = "video" | "image"

interface MotionTask {
  taskId?: string
  status: string
  generated: string[]
  tier: MotionTier
  balance?: number
  creditsDeducted?: number
}

const COMPLETED_STATUSES = new Set(["COMPLETED", "SUCCEEDED", "SUCCESS", "DONE"])
const FAILED_STATUSES = new Set(["FAILED", "ERROR", "CANCELED", "CANCELLED"])

function statusLabel(status: string) {
  const normalized = status.toUpperCase()
  if (COMPLETED_STATUSES.has(normalized)) return "Selesai"
  if (FAILED_STATUSES.has(normalized)) return "Gagal"
  return "Diproses"
}

export default function MotionControlPage() {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [rememberKey, setRememberKey] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [prompt, setPrompt] = useState("")
  const [tier, setTier] = useState<MotionTier>("pro")
  const [orientation, setOrientation] = useState<MotionOrientation>("video")
  const [cfgScale, setCfgScale] = useState(0.5)
  const [balance, setBalance] = useState<number | null>(null)
  const [task, setTask] = useState<MotionTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState("")
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const normalizedStatus = task?.status.toUpperCase() || ""
  const isDone = COMPLETED_STATUSES.has(normalizedStatus)
  const isFailed = FAILED_STATUSES.has(normalizedStatus)
  const canSubmit = apiKey.trim() && imageUrl.trim() && videoUrl.trim() && !loading

  const tierLabel = useMemo(() => (tier === "pro" ? "Kling 3 Pro" : "Kling 3 Standard"), [tier])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      const storedKey = localStorage.getItem("jenna:magnific-api-key")
      if (storedKey && !cancelled) {
        setApiKey(storedKey)
        setRememberKey(true)
      }
    }, 0)

    fetch("/api/credits")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && !cancelled) setBalance(data.balance ?? 0)
      })
      .catch(() => {
        // ignored
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const checkStatus = useCallback(async (currentTask = task) => {
    if (!currentTask?.taskId || !apiKey.trim()) return
    setPolling(true)
    setError("")

    try {
      const params = new URLSearchParams({
        taskId: currentTask.taskId,
        tier: currentTask.tier,
      })
      const res = await fetch(`/api/ai/motion-control?${params}`, {
        headers: {
          "x-magnific-api-key": apiKey.trim(),
        },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Gagal mengecek status")
        return
      }

      setTask((prev) => ({
        ...prev,
        ...data,
        generated: data.generated || prev?.generated || [],
      }))
    } catch {
      setError("Gagal menghubungi server")
    } finally {
      setPolling(false)
    }
  }, [apiKey, task])

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    if (!task?.taskId || isDone || isFailed) return

    pollRef.current = setInterval(() => {
      checkStatus(task)
    }, 8000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [checkStatus, isDone, isFailed, task])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError("")
    setTask(null)

    if (rememberKey) {
      localStorage.setItem("jenna:magnific-api-key", apiKey.trim())
    } else {
      localStorage.removeItem("jenna:magnific-api-key")
    }

    try {
      const res = await fetch("/api/ai/motion-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          imageUrl: imageUrl.trim(),
          videoUrl: videoUrl.trim(),
          webhookUrl: webhookUrl.trim(),
          prompt: prompt.trim(),
          tier,
          characterOrientation: orientation,
          cfgScale,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Gagal membuat task Motion Control")
        if (typeof data.balance === "number") setBalance(data.balance)
        return
      }

      setTask({
        taskId: data.taskId,
        status: data.status || "CREATED",
        generated: data.generated || [],
        tier: data.tier || tier,
        balance: data.balance,
        creditsDeducted: data.creditsDeducted,
      })
      if (typeof data.balance === "number") setBalance(data.balance)
      if (data.taskId) {
        setTimeout(() => checkStatus({
          taskId: data.taskId,
          status: data.status || "CREATED",
          generated: data.generated || [],
          tier: data.tier || tier,
        }), 1500)
      }
    } catch {
      setError("Gagal menghubungi server")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (url: string, index: number) => {
    const filename = `motion-control-${task?.taskId?.slice(0, 8) || index + 1}.mp4`
    try {
      await downloadVideo(url, filename)
    } catch {
      window.open(url, "_blank")
    }
  }

  const handleSave = async (url: string) => {
    if (savedUrls.has(url)) return
    try {
      const res = await fetch("/api/gallery/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          type: "video",
          prompt,
          model: tierLabel,
          aspectRatio: orientation,
          mediaGenerationId: task?.taskId,
          sourceAction: "motion-control",
        }),
      })
      if (res.ok) setSavedUrls((prev) => new Set(prev).add(url))
    } catch {
      // ignored
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Video Tools", href: "/dashboard" },
        { label: "Motion Control" },
      ]} />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[520px_minmax(0,1fr)]">
          <form onSubmit={handleSubmit} className="h-fit border border-border bg-card p-4 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontalIcon className="h-4 w-4 text-violet-400" />
                  Kling v3 Motion Control
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Biaya {CREDIT_COST} kredit per task</p>
              </div>
              <div className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Saldo: {balance ?? "..."}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <KeyRoundIcon className="h-3.5 w-3.5" />
                  API Key Magnific
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="mapi_..."
                    className="h-10 rounded-md border border-input bg-background px-3"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey((value) => !value)}
                    title={showApiKey ? "Sembunyikan API key" : "Tampilkan API key"}
                  >
                    {showApiKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                </div>
                <label className="mt-2 flex w-fit items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberKey}
                    onChange={(event) => setRememberKey(event.target.checked)}
                    className="size-3.5 accent-violet-500"
                  />
                  Ingat di perangkat ini
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Model</label>
                  <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border">
                    {(["pro", "std"] as MotionTier[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTier(value)}
                        className={cn(
                          "h-10 text-xs font-semibold transition",
                          tier === value ? "bg-violet-500 text-white" : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {value === "pro" ? "Pro" : "Standard"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Orientasi</label>
                  <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border">
                    {(["video", "image"] as MotionOrientation[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setOrientation(value)}
                        className={cn(
                          "h-10 text-xs font-semibold transition",
                          orientation === value ? "bg-cyan-500 text-white" : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {value === "video" ? "Video" : "Image"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">URL gambar karakter</label>
                <Input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-10 rounded-md border border-input bg-background px-3"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">URL video referensi</label>
                <Input
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-10 rounded-md border border-input bg-background px-3"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value.slice(0, 2500))}
                  placeholder="Tambahkan arahan gerakan, ekspresi, atau gaya kamera"
                  rows={4}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <div className="mt-1 text-right text-[10px] text-muted-foreground">{prompt.length}/2500</div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>CFG Scale</span>
                  <span>{cfgScale.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={cfgScale}
                  onChange={(event) => setCfgScale(Number(event.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Webhook URL</label>
                <Input
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-10 rounded-md border border-input bg-background px-3"
                />
              </div>

              {error && (
                <div className="flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-md">
                {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                Generate Motion
              </Button>
            </div>
          </form>

          <div className="min-h-[620px] border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FilmIcon className="h-4 w-4 text-cyan-400" />
                  Hasil Motion Control
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tierLabel} - {orientation === "video" ? "orientasi video" : "orientasi image"}</p>
              </div>
              {task?.taskId && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(task.taskId || "")}
                    className="rounded-md"
                  >
                    <ClipboardIcon className="h-3.5 w-3.5" />
                    Task ID
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => checkStatus()}
                    disabled={polling}
                    className="rounded-md"
                  >
                    <RefreshCwIcon className={cn("h-3.5 w-3.5", polling && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4">
              {task && (
                <div className={cn(
                  "mb-4 flex items-center justify-between gap-3 rounded-md border p-3 text-sm",
                  isDone ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
                    isFailed ? "border-red-500/30 bg-red-500/10 text-red-300" :
                      "border-violet-500/30 bg-violet-500/10 text-violet-300"
                )}>
                  <div className="flex items-center gap-2">
                    {isDone ? <CheckCircle2Icon className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
                    <span>{statusLabel(task.status)}</span>
                  </div>
                  <span className="text-xs opacity-80">{task.status}</span>
                </div>
              )}

              {!task && (
                <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <FilmIcon className="h-16 w-16 opacity-30" strokeWidth={1} />
                  <p className="text-sm font-medium">Belum ada task Motion Control</p>
                </div>
              )}

              {task && task.generated.length === 0 && !isDone && !isFailed && (
                <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 text-center">
                  <Loader2Icon className="h-10 w-10 animate-spin text-violet-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Video sedang diproses</p>
                    <p className="mt-1 text-xs text-muted-foreground">Status diperbarui otomatis</p>
                  </div>
                </div>
              )}

              {task && task.generated.length > 0 && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {task.generated.map((url, index) => (
                    <div key={url} className="overflow-hidden rounded-md border border-border bg-background">
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(url)}
                        className="block aspect-video w-full bg-black"
                      >
                        <video src={url} className="h-full w-full object-contain" muted loop autoPlay playsInline />
                      </button>
                      <div className="flex items-center justify-between gap-2 border-t border-border p-2">
                        <span className="truncate text-[10px] text-muted-foreground">Video {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon-xs" onClick={() => setPreviewUrl(url)} title="Preview">
                            <EyeIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleSave(url)} title="Simpan">
                            <SaveIcon className={cn("h-3.5 w-3.5", savedUrls.has(url) && "text-emerald-400")} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleDownload(url, index)} title="Download">
                            <DownloadIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewUrl(null)}>
          <button
            type="button"
            className="absolute right-4 top-4 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-white/10"
            onClick={() => setPreviewUrl(null)}
          >
            Tutup
          </button>
          <video
            src={previewUrl}
            className="max-h-[86vh] max-w-[92vw]"
            controls
            autoPlay
            playsInline
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
