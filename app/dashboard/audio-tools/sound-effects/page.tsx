"use client"

import { useState, useRef, useEffect } from "react"
import {
  Loader2Icon,
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  Volume2Icon,
  XIcon,
  SparklesIcon,
  TrashIcon,
  ClockIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"

/* ─── Types ─── */
interface GeneratedSFX {
  id: string
  text: string
  audioUrl: string
  duration: number | null
  timestamp: number
}

/* ─── Constants ─── */
const CREDIT_COST = 5
const MAX_CHARS = 1000
const MIN_DURATION = 0.5
const MAX_DURATION = 22

const EXAMPLE_PROMPTS = [
  "Suara hujan deras di atap rumah",
  "Ledakan besar dengan gema",
  "Notifikasi UI yang lembut dan futuristik",
  "Langkah kaki di atas salju",
  "Suara sambaran petir mendekat",
  "Mesin mobil sport berakselerasi",
  "Burung berkicau di pagi hari",
  "Pintu kayu berderit terbuka",
]

export default function SoundEffectsPage() {
  const [text, setText] = useState("")
  const [useDuration, setUseDuration] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // History of generated SFX (client-state only)
  const [history, setHistory] = useState<GeneratedSFX[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playProgress, setPlayProgress] = useState<Record<string, number>>({})
  const [playDuration, setPlayDuration] = useState<Record<string, number>>({})

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      history.forEach((sfx) => URL.revokeObjectURL(sfx.audioUrl))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Generate ──
  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = { text: text.trim() }
      if (useDuration) payload.durationSeconds = durationSeconds

      const res = await fetch("/api/ai/sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Error ${res.status}` }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const newSfx: GeneratedSFX = {
        id: crypto.randomUUID(),
        text: text.trim(),
        audioUrl: url,
        duration: useDuration ? durationSeconds : null,
        timestamp: Date.now(),
      }

      setHistory((prev) => [newSfx, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate sound effect")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  // ── Playback ──
  const togglePlay = (sfx: GeneratedSFX) => {
    // Stop any currently playing audio
    if (playingId && playingId !== sfx.id && audioRefs.current[playingId]) {
      audioRefs.current[playingId].pause()
      audioRefs.current[playingId].currentTime = 0
    }

    if (playingId === sfx.id) {
      audioRefs.current[sfx.id]?.pause()
      setPlayingId(null)
      return
    }

    if (!audioRefs.current[sfx.id]) {
      const audio = new Audio(sfx.audioUrl)
      audio.addEventListener("timeupdate", () => {
        setPlayProgress((p) => ({ ...p, [sfx.id]: audio.currentTime }))
      })
      audio.addEventListener("loadedmetadata", () => {
        setPlayDuration((d) => ({ ...d, [sfx.id]: audio.duration }))
      })
      audio.addEventListener("ended", () => {
        setPlayingId(null)
        setPlayProgress((p) => ({ ...p, [sfx.id]: 0 }))
      })
      audioRefs.current[sfx.id] = audio
    }

    audioRefs.current[sfx.id].play()
    setPlayingId(sfx.id)
  }

  const handleDownload = (sfx: GeneratedSFX) => {
    const a = document.createElement("a")
    a.href = sfx.audioUrl
    a.download = `sfx-${Date.now()}.mp3`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDelete = (sfx: GeneratedSFX) => {
    if (audioRefs.current[sfx.id]) {
      audioRefs.current[sfx.id].pause()
      delete audioRefs.current[sfx.id]
    }
    URL.revokeObjectURL(sfx.audioUrl)
    setHistory((prev) => prev.filter((s) => s.id !== sfx.id))
    if (playingId === sfx.id) setPlayingId(null)
  }

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const charCount = text.length

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader
        breadcrumbs={[
          { label: "Jenna Bot Pro", href: "/dashboard" },
          { label: "Audio Tools" },
          { label: "Sound Effects" },
        ]}
      />

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

          {/* ── Title ── */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/20">
              <Volume2Icon className="h-3 w-3" />
              Sound Effects Generator
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Deskripsikan sound effect yang Anda inginkan, AI akan membuatnya untuk Anda.
            </p>
          </div>

          {/* ── Input Area ── */}
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) setText(e.target.value)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Deskripsikan sound effect yang diinginkan..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-border bg-card/80 px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all backdrop-blur-sm"
              />
              <span className={cn("absolute bottom-3 right-4 text-[10px]", charCount > MAX_CHARS * 0.9 ? "text-amber-400" : "text-muted-foreground/40")}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>

            {/* Example Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setText(prompt)}
                  className="rounded-full border border-border bg-card/50 px-3 py-1 text-[10px] text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-cyan-500/30"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* ── Duration Toggle ── */}
          <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-sm text-muted-foreground">Durasi custom</span>
              </div>
              <button
                onClick={() => setUseDuration(!useDuration)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  useDuration ? "bg-cyan-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                    useDuration ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
            {useDuration && (
              <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Durasi</span>
                  <span className="text-xs font-mono text-foreground/60">{durationSeconds.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  step={0.5}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full bg-muted appearance-none cursor-pointer accent-cyan-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between">
                  <span className="text-[9px] text-muted-foreground/40">{MIN_DURATION}s</span>
                  <span className="text-[9px] text-muted-foreground/40">{MAX_DURATION}s</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Generate Button ── */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Menggunakan <span className="text-foreground/60 font-medium">{CREDIT_COST} poin</span>
            </span>
            <button
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-all",
                text.trim() && !isGenerating
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  <span>Menghasilkan...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  <span>Generate SFX</span>
                </>
              )}
            </button>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-in slide-in-from-top-2">
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="shrink-0 text-red-400/60 hover:text-red-400">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── History ── */}
          {history.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground/70">Hasil Generate</h3>
                <button
                  onClick={() => {
                    history.forEach((sfx) => {
                      if (audioRefs.current[sfx.id]) {
                        audioRefs.current[sfx.id].pause()
                        delete audioRefs.current[sfx.id]
                      }
                      URL.revokeObjectURL(sfx.audioUrl)
                    })
                    setHistory([])
                    setPlayingId(null)
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Bersihkan Semua
                </button>
              </div>

              <div className="space-y-2">
                {history.map((sfx) => {
                  const isActive = playingId === sfx.id
                  const prog = playProgress[sfx.id] || 0
                  const dur = playDuration[sfx.id] || 0

                  return (
                    <div
                      key={sfx.id}
                      className={cn(
                        "group rounded-xl border bg-card/80 p-4 backdrop-blur-sm transition-all",
                        isActive
                          ? "border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-blue-500/5"
                          : "border-border hover:border-border"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Play button */}
                        <button
                          onClick={() => togglePlay(sfx)}
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
                            isActive
                              ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {isActive ? (
                            <PauseIcon className="h-4 w-4" />
                          ) : (
                            <PlayIcon className="h-4 w-4 ml-0.5" />
                          )}
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="text-sm text-foreground/80 line-clamp-2">{sfx.text}</p>

                          {/* Progress bar */}
                          {dur > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100"
                                  style={{ width: `${dur > 0 ? (prog / dur) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                                {formatTime(prog)} / {formatTime(dur)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40">
                            {sfx.duration && <span>{sfx.duration}s</span>}
                            <span>{new Date(sfx.timestamp).toLocaleTimeString("id-ID")}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownload(sfx)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                            title="Download"
                          >
                            <DownloadIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sfx)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400"
                            title="Hapus"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Empty State ── */}
          {history.length === 0 && !isGenerating && (
            <div className="flex flex-col items-center gap-3 py-8 animate-fade-up">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 text-cyan-400/30">
                <Volume2Icon className="h-8 w-8" />
              </div>
              <p className="text-sm text-muted-foreground">
                Deskripsikan sound effect, lalu generate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
