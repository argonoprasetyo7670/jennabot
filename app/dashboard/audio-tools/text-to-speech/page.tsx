"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Loader2Icon,
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  Volume2Icon,
  MicIcon,
  ChevronDownIcon,
  SearchIcon,
  XIcon,
  SparklesIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"

/* ─── Types ─── */
interface Voice {
  voice_id: string
  name: string
  category: string
  labels: Record<string, string>
  preview_url: string | null
  description: string | null
}

interface TTSModel {
  id: string
  name: string
  description: string
  icon: string
}

/* ─── Constants ─── */
const MODELS: TTSModel[] = [
  {
    id: "eleven_multilingual_v2",
    name: "Multilingual v2",
    description: "Stabil, 29+ bahasa",
    icon: "🌍",
  },
  {
    id: "eleven_v3",
    name: "Eleven v3",
    description: "Ekspresi tinggi, dramatis",
    icon: "✨",
  },
  {
    id: "eleven_flash_v2_5",
    name: "Flash v2.5",
    description: "Ultra-cepat, ~75ms",
    icon: "⚡",
  },
]

const CREDIT_COST = 3
const MAX_CHARS = 5000

export default function TextToSpeechPage() {
  const [text, setText] = useState("")
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [selectedModel, setSelectedModel] = useState(0) // index into MODELS
  const [stability, setStability] = useState(0.5)
  const [similarityBoost, setSimilarityBoost] = useState(0.75)
  const [showVoicePicker, setShowVoicePicker] = useState(false)
  const [voiceSearch, setVoiceSearch] = useState("")
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  // Preview voice playback
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const voicePickerRef = useRef<HTMLDivElement>(null)

  // ── Fetch voices ──
  useEffect(() => {
    async function fetchVoices() {
      try {
        const res = await fetch("/api/ai/voices")
        const data = await res.json()
        if (res.ok && data.voices) {
          setVoices(data.voices)
          // Auto-select first voice
          if (data.voices.length > 0 && !selectedVoice) {
            setSelectedVoice(data.voices[0])
          }
        }
      } catch {
        /* ignore */
      } finally {
        setVoicesLoading(false)
      }
    }
    fetchVoices()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    if (!showSettings && !showVoicePicker) return
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
        setShowModelDropdown(false)
      }
      if (voicePickerRef.current && !voicePickerRef.current.contains(e.target as Node)) {
        setShowVoicePicker(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showSettings, showVoicePicker])

  // ── Audio player progress ──
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => {
      setProgress(audio.currentTime)
      setDuration(audio.duration || 0)
    }
    const onEnded = () => setIsPlaying(false)
    const onLoadedMetadata = () => setDuration(audio.duration || 0)
    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
    }
  }, [audioUrl])

  // ── Voice preview ──
  const handlePreviewVoice = useCallback((voice: Voice) => {
    if (!voice.preview_url) return
    // Stop any existing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    if (previewingVoice === voice.voice_id) {
      setPreviewingVoice(null)
      return
    }
    const audio = new Audio(voice.preview_url)
    previewAudioRef.current = audio
    setPreviewingVoice(voice.voice_id)
    audio.play()
    audio.onended = () => {
      setPreviewingVoice(null)
      previewAudioRef.current = null
    }
  }, [previewingVoice])

  // ── Generate ──
  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice || isGenerating) return
    setIsGenerating(true)
    setError(null)
    setAudioUrl(null)
    setIsPlaying(false)

    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice.voice_id,
          modelId: MODELS[selectedModel].id,
          stability,
          similarityBoost,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Error ${res.status}` }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Clean up previous audio
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate audio")
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
    }
    setProgress(val)
  }

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement("a")
    a.href = audioUrl
    a.download = `tts-${Date.now()}.mp3`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const filteredVoices = voices.filter(
    (v) =>
      v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      Object.values(v.labels || {}).some((l) =>
        l.toLowerCase().includes(voiceSearch.toLowerCase())
      )
  )

  const currentModel = MODELS[selectedModel]
  const charCount = text.length

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader
        breadcrumbs={[
          { label: "Jenna Bot Pro", href: "/dashboard" },
          { label: "Audio Tools" },
          { label: "Text to Speech" },
        ]}
      />

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

          {/* ── Voice & Model Selector Row ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Voice Selector */}
            <div className="relative flex-1" ref={voicePickerRef}>
              <button
                onClick={() => setShowVoicePicker(!showVoicePicker)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card/80 px-4 py-3 text-sm transition-all hover:bg-card backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400">
                    <MicIcon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Voice</p>
                    <p className="font-medium text-foreground">
                      {voicesLoading
                        ? "Memuat..."
                        : selectedVoice?.name || "Pilih Voice"}
                    </p>
                  </div>
                </div>
                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    showVoicePicker && "rotate-180"
                  )}
                />
              </button>

              {/* Voice Picker Dropdown */}
              {showVoicePicker && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-[400px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                  {/* Search */}
                  <div className="sticky top-0 border-b border-border bg-card/95 p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                      <SearchIcon className="h-4 w-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={voiceSearch}
                        onChange={(e) => setVoiceSearch(e.target.value)}
                        placeholder="Cari voice..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                      {voiceSearch && (
                        <button onClick={() => setVoiceSearch("")} className="text-muted-foreground hover:text-foreground">
                          <XIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Voice List */}
                  <div className="max-h-[320px] overflow-y-auto p-2">
                    {filteredVoices.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Tidak ada voice ditemukan
                      </p>
                    ) : (
                      filteredVoices.map((voice) => (
                        <div
                          key={voice.voice_id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedVoice(voice)
                            setShowVoicePicker(false)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setSelectedVoice(voice)
                              setShowVoicePicker(false)
                            }
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all cursor-pointer",
                            selectedVoice?.voice_id === voice.voice_id
                              ? "bg-emerald-500/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{voice.name}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {Object.entries(voice.labels || {}).slice(0, 3).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                                >
                                  {val}
                                </span>
                              ))}
                            </div>
                          </div>
                          {voice.preview_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreviewVoice(voice)
                              }}
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
                                previewingVoice === voice.voice_id
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {previewingVoice === voice.voice_id ? (
                                <PauseIcon className="h-3 w-3" />
                              ) : (
                                <Volume2Icon className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="relative sm:w-[200px]" ref={settingsRef}>
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card/80 px-4 py-3 text-sm transition-all hover:bg-card backdrop-blur-sm"
              >
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium text-foreground">
                    <span className="mr-1">{currentModel.icon}</span>
                    {currentModel.name}
                  </p>
                </div>
                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    showModelDropdown && "rotate-180"
                  )}
                />
              </button>
              {showModelDropdown && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl">
                  {MODELS.map((model, i) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(i)
                        setShowModelDropdown(false)
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-all",
                        selectedModel === i
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <span>{model.icon}</span>
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <p className="text-[10px] text-muted-foreground/60">{model.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Voice Settings (Stability & Similarity) ── */}
          <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-medium">Pengaturan Voice</span>
              <ChevronDownIcon className={cn("h-4 w-4 transition-transform", showSettings && "rotate-180")} />
            </button>
            {showSettings && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground">Stability</label>
                    <span className="text-xs font-mono text-foreground/60">{stability.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={stability}
                    onChange={(e) => setStability(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full bg-muted appearance-none cursor-pointer accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground/40">Lebih variatif</span>
                    <span className="text-[9px] text-muted-foreground/40">Lebih stabil</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground">Similarity Boost</label>
                    <span className="text-xs font-mono text-foreground/60">{similarityBoost.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={similarityBoost}
                    onChange={(e) => setSimilarityBoost(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full bg-muted appearance-none cursor-pointer accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground/40">Lebih kreatif</span>
                    <span className="text-[9px] text-muted-foreground/40">Mirip asli</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Text Input ── */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setText(e.target.value)
              }}
              placeholder="Ketik teks yang ingin diubah menjadi suara..."
              rows={6}
              className="w-full resize-none rounded-2xl border border-border bg-card/80 px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all backdrop-blur-sm"
            />
            <div className="absolute bottom-3 right-4 flex items-center gap-2">
              <span className={cn("text-[10px]", charCount > MAX_CHARS * 0.9 ? "text-amber-400" : "text-muted-foreground/40")}>
                {charCount.toLocaleString()}/{MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── Generate Button ── */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Menggunakan <span className="text-foreground/60 font-medium">{CREDIT_COST} poin</span>
            </span>
            <button
              onClick={handleGenerate}
              disabled={!text.trim() || !selectedVoice || isGenerating}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-all",
                text.trim() && selectedVoice && !isGenerating
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
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
                  <span>Generate Audio</span>
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

          {/* ── Audio Player ── */}
          {audioUrl && (
            <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-500/5 via-card/80 to-teal-500/5 p-6 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
              <audio ref={audioRef} src={audioUrl} preload="metadata" />

              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-5 w-5" />
                  ) : (
                    <PlayIcon className="h-5 w-5 ml-0.5" />
                  )}
                </button>

                {/* Progress */}
                <div className="flex-1 space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.01}
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1.5 rounded-full bg-muted/60 appearance-none cursor-pointer accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-md"
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatTime(progress)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  title="Download MP3"
                >
                  <DownloadIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Volume2Icon className="h-3 w-3 text-muted-foreground/40" />
                <p className="text-[10px] text-muted-foreground/40 truncate">
                  {selectedVoice?.name} • {currentModel.name} • Stability: {stability.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
