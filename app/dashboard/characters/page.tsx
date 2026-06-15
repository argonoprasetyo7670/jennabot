"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  MicIcon, PlusIcon, Loader2Icon, PlayIcon, PauseIcon, XIcon,
  SparklesIcon, Volume2Icon, UploadIcon, SearchIcon, UsersIcon, CheckIcon,
} from "lucide-react"

// Reusable components
import { CharacterCard } from "@/components/characters/character-card"
import { VoiceCard } from "@/components/characters/voice-card"
import { EmptyState } from "@/components/characters/empty-state"
import { VOICE_DATA, VOICE_MAP, getVoicePreviewUrl, type VoiceGender } from "@/components/characters/voice-data"

// Server actions
import {
  getCharactersAndVoices,
  createCharacterAction,
  createVoiceAction,
  deleteCharacterAction,
  deleteVoiceAction,
} from "./actions"

// Client-side upload (needs binary file → stays as API route)
import { uploadImageAsset } from "@/lib/api/google-flow"

type Tab = "characters" | "voices"

interface CharacterItem {
  id: string
  characterRefId: string
  displayName: string
  personalityNotes: string | null
  imageRef1: string
  imageRef2: string | null
  imageUrl1: string | null
  imageUrl2: string | null
  voiceType: string | null
  voiceValue: string | null
}

interface VoiceItem {
  id: string
  voiceRefId: string
  displayName: string
  baseVoice: string
  dialog: string
  voicePerformance: string
  audioUrl: string | null
}

export default function CharactersPage() {
  // ── Data ──
  const [tab, setTab] = useState<Tab>("characters")
  const [characters, setCharacters] = useState<CharacterItem[]>([])
  const [voices, setVoices] = useState<VoiceItem[]>([])
  const [loading, setLoading] = useState(true)

  // ── Create character form ──
  const [showCreateChar, setShowCreateChar] = useState(false)
  const [charName, setCharName] = useState("")
  const [charNotes, setCharNotes] = useState("")
  const [charVoiceMode, setCharVoiceMode] = useState<"none" | "system" | "custom">("none")
  const [charVoiceValue, setCharVoiceValue] = useState("")
  const [charImages, setCharImages] = useState<{ file: File; preview: string }[]>([])
  const [charCreating, setCharCreating] = useState(false)
  const [charStatus, setCharStatus] = useState("")

  // ── Create voice form ──
  const [showCreateVoice, setShowCreateVoice] = useState(false)
  const [voicePreset, setVoicePreset] = useState("")
  const [voiceName, setVoiceName] = useState("")
  const [voiceDialog, setVoiceDialog] = useState("")
  const [voicePerformance, setVoicePerformance] = useState("")
  const [voiceCreating, setVoiceCreating] = useState(false)

  // ── UI state ──
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [voiceSearch, setVoiceSearch] = useState("")
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"all" | VoiceGender>("all")

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // ── Cleanup audio on unmount ──
  useEffect(() => () => { audioRef.current?.pause() }, [])

  // ── Fetch data (server action) ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { characters: c, voices: v } = await getCharactersAndVoices()
      setCharacters(c)
      setVoices(v)
    } catch {
      setToast({ msg: "Gagal memuat data", type: "error" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Audio playback ──
  const playVoice = useCallback((nameOrUrl: string, id: string) => {
    if (playingVoice === id) {
      audioRef.current?.pause()
      setPlayingVoice(null)
      return
    }
    audioRef.current?.pause()
    const url = nameOrUrl.startsWith("http") ? nameOrUrl : getVoicePreviewUrl(nameOrUrl)
    const audio = new Audio(url)
    audio.onended = () => setPlayingVoice(null)
    audio.onerror = () => setPlayingVoice(null)
    audio.play().catch(() => setPlayingVoice(null))
    audioRef.current = audio
    setPlayingVoice(id)
  }, [playingVoice])

  // ── Image upload ──
  const handleCharImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles = Array.from(files).slice(0, 2 - charImages.length)
    setCharImages(prev => [...prev, ...newFiles.map(f => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 2))
    e.target.value = ""
  }

  const removeCharImage = (idx: number) => {
    setCharImages(prev => {
      if (prev[idx]) URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  // ── Create character (server action) ──
  const handleCreateCharacter = async () => {
    if (!charName.trim() || charImages.length === 0) return
    setCharCreating(true)
    try {
      // Convert images to base64 for server action (CDN upload)
      const imageDataList: { base64: string; type: string }[] = []
      for (const img of charImages) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            // Remove the data:image/xxx;base64, prefix
            resolve(result.split(",")[1])
          }
          reader.readAsDataURL(img.file)
        })
        imageDataList.push({ base64, type: img.file.type })
      }

      // Upload images to UseAPI for reference IDs
      const uploadedIds: string[] = []
      for (const img of charImages) {
        setCharStatus("Mengupload gambar...")
        const result = await uploadImageAsset(img.file)
        uploadedIds.push(result.mediaGenerationId)
      }

      setCharStatus("Membuat character...")
      const voice = charVoiceMode !== "none" && charVoiceValue ? charVoiceValue : undefined

      await createCharacterAction({
        displayName: charName.trim(),
        imageReference_1: uploadedIds[0],
        imageReference_2: uploadedIds[1],
        personalityNotes: charNotes.trim() || undefined,
        voice,
        imageData_1: imageDataList[0]?.base64,
        imageType_1: imageDataList[0]?.type,
        imageData_2: imageDataList[1]?.base64,
        imageType_2: imageDataList[1]?.type,
      })

      charImages.forEach(img => URL.revokeObjectURL(img.preview))
      resetCharForm()
      setToast({ msg: "Character berhasil dibuat!", type: "success" })
      fetchData()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Gagal membuat character", type: "error" })
    } finally {
      setCharCreating(false)
      setCharStatus("")
    }
  }

  const resetCharForm = () => {
    setCharName(""); setCharNotes(""); setCharVoiceMode("none"); setCharVoiceValue("")
    setCharImages([]); setShowCreateChar(false)
  }

  // ── Create voice (server action) ──
  const handleCreateVoice = async () => {
    if (!voicePreset || !voiceName.trim() || !voiceDialog.trim() || !voicePerformance.trim()) return
    setVoiceCreating(true)
    try {
      await createVoiceAction({
        voice: voicePreset,
        displayName: voiceName.trim(),
        dialog: voiceDialog.trim(),
        voicePerformance: voicePerformance.trim(),
      })
      setVoicePreset(""); setVoiceName(""); setVoiceDialog(""); setVoicePerformance("")
      setShowCreateVoice(false)
      setToast({ msg: "Custom voice berhasil dibuat!", type: "success" })
      fetchData()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Gagal membuat voice", type: "error" })
    } finally {
      setVoiceCreating(false)
    }
  }

  // ── Delete (server actions) ──
  const handleDeleteCharacter = async (refId: string) => {
    if (!confirm("Hapus character ini?")) return
    setDeletingId(refId)
    try {
      await deleteCharacterAction(refId)
      setCharacters(prev => prev.filter(c => c.characterRefId !== refId))
      setToast({ msg: "Character berhasil dihapus", type: "success" })
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Gagal menghapus", type: "error" })
    } finally { setDeletingId(null) }
  }

  const handleDeleteVoice = async (refId: string) => {
    if (!confirm("Hapus custom voice ini?")) return
    setDeletingId(refId)
    try {
      await deleteVoiceAction(refId)
      setVoices(prev => prev.filter(v => v.voiceRefId !== refId))
      setToast({ msg: "Voice berhasil dihapus", type: "success" })
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Gagal menghapus", type: "error" })
    } finally { setDeletingId(null) }
  }

  // ── Filtered voices ──
  const filteredVoiceData = VOICE_DATA.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      v.style.toLowerCase().includes(voiceSearch.toLowerCase())
    const matchGender = voiceGenderFilter === "all" || v.gender === voiceGenderFilter
    return matchSearch && matchGender
  })

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Characters" },
      ]} />

      <div className="flex-1 overflow-y-auto">
        {/* ── Header + Tabs ── */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {(["characters", "voices"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    tab === t
                      ? "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {t === "characters" ? <UsersIcon className="h-3.5 w-3.5" /> : <MicIcon className="h-3.5 w-3.5" />}
                  {t === "characters" ? "Characters" : "Voices"}
                  {!loading && (
                    <span className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                      tab === t ? "bg-violet-500/20 text-violet-300" : "bg-muted text-muted-foreground"
                    )}>{t === "characters" ? characters.length : voices.length}</span>
                  )}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => tab === "characters" ? setShowCreateChar(true) : setShowCreateVoice(true)}
              className="gap-1.5 bg-violet-600 text-white hover:bg-violet-500"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {tab === "characters" ? "Buat Character" : "Buat Voice"}
            </Button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="mx-auto max-w-5xl px-4 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 animate-fade-up">
              <Loader2Icon className="h-8 w-8 text-violet-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Memuat data...</p>
            </div>
          ) : tab === "characters" ? (
            characters.length === 0 ? (
              <EmptyState
                icon={<UsersIcon className="h-8 w-8 text-violet-400/50" />}
                title="Belum ada character"
                description="Buat character pertamamu — gabungkan reference images + voice untuk menjaga identitas konsisten."
                onAction={() => setShowCreateChar(true)}
                actionLabel="Buat Character Pertama"
              />
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {characters.map((char, i) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    index={i}
                    deleting={deletingId === char.characterRefId}
                    onDelete={() => handleDeleteCharacter(char.characterRefId)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-8">
              {/* Custom Voices */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-violet-400" />
                  Custom Voices
                  <span className="text-xs font-normal text-muted-foreground">({voices.length})</span>
                </h3>
                {voices.length === 0 ? (
                  <EmptyState
                    icon={<MicIcon className="h-8 w-8 text-violet-400/50" />}
                    title="Belum ada custom voice"
                    description="Buat voice kustom dari 30 preset dengan dialog dan gaya delivery sendiri."
                    onAction={() => setShowCreateVoice(true)}
                    actionLabel="Buat Custom Voice"
                    compact
                  />
                ) : (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {voices.map((v, i) => (
                      <VoiceCard
                        key={v.id}
                        voice={v}
                        voiceInfo={VOICE_MAP.get(v.baseVoice)}
                        index={i}
                        playing={playingVoice === v.id}
                        deleting={deletingId === v.voiceRefId}
                        onPlay={() => v.audioUrl ? playVoice(v.audioUrl, v.id) : null}
                        onDelete={() => handleDeleteVoice(v.voiceRefId)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* System Voices */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Volume2Icon className="h-4 w-4 text-blue-400" />
                  System Voice Presets
                  <span className="text-xs font-normal text-muted-foreground">(30)</span>
                </h3>

                {/* Search + Gender filter */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1 max-w-xs">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={voiceSearch}
                      onChange={e => setVoiceSearch(e.target.value)}
                      placeholder="Cari voice..."
                      className="h-8 w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
                    {(["all", "female", "male"] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setVoiceGenderFilter(g)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[10px] font-medium transition",
                          voiceGenderFilter === g
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {g === "all" ? "Semua" : g === "female" ? "♀ Wanita" : "♂ Pria"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  {filteredVoiceData.map(v => (
                    <button
                      key={v.name}
                      onClick={() => playVoice(v.name, v.name)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                        playingVoice === v.name
                          ? "border-violet-500/50 bg-violet-500/10"
                          : "border-border bg-card/50 hover:border-violet-500/30 hover:bg-card"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                        playingVoice === v.name
                          ? "bg-violet-500 text-white"
                          : "bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20"
                      )}>
                        {playingVoice === v.name ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground truncate">{v.name}</span>
                          <span className={cn(
                            "shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                            v.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400"
                          )}>
                            {v.gender === "female" ? "♀" : "♂"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{v.style}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Create Character Dialog ═══ */}
      <Dialog open={showCreateChar} onOpenChange={open => { if (!open && !charCreating) resetCharForm() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Character Baru</DialogTitle>
            <DialogDescription>
              Gabungkan 1-2 reference images + voice untuk menjaga identitas konsisten. Biaya: 3 kredit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Nama Character *</label>
              <input
                type="text" value={charName} onChange={e => setCharName(e.target.value.slice(0, 200))}
                placeholder="Contoh: Carol, Bob, Luna..."
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                disabled={charCreating}
              />
            </div>

            {/* Images */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-2 block">Reference Images * (1-2 gambar)</label>
              <div className="flex gap-3">
                {charImages.map((img, i) => (
                  <div key={i} className="relative h-28 w-28 rounded-xl overflow-hidden border border-border bg-muted/30">
                    <Image src={img.preview} alt={`Ref ${i + 1}`} fill className="object-cover" unoptimized />
                    {!charCreating && (
                      <button onClick={() => removeCharImage(i)} className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500/80 transition">
                        <XIcon className="h-3 w-3" />
                      </button>
                    )}
                    <div className="absolute bottom-1 left-1">
                      <span className="rounded bg-black/50 px-1 py-0.5 text-[8px] font-bold text-white backdrop-blur-sm">Ref {i + 1}</span>
                    </div>
                  </div>
                ))}
                {charImages.length < 2 && (
                  <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/10 text-muted-foreground/40 transition hover:border-violet-500/30 hover:text-violet-400 hover:bg-violet-500/5">
                    <UploadIcon className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-medium">Upload</span>
                    <span className="text-[9px] mt-0.5">PNG, JPG, WebP</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCharImageUpload} className="hidden" disabled={charCreating} />
                  </label>
                )}
              </div>
            </div>

            {/* Voice Picker */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-2 block">Voice (opsional)</label>
              <div className="space-y-2">
                {/* No voice */}
                <label className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all",
                  charVoiceMode === "none" ? "border-violet-500/40 bg-violet-500/5" : "border-border hover:border-border/80"
                )}>
                  <input type="radio" name="voiceMode" checked={charVoiceMode === "none"} onChange={() => { setCharVoiceMode("none"); setCharVoiceValue("") }} className="accent-violet-500" disabled={charCreating} />
                  <span className="text-xs font-medium text-foreground/80">Tanpa voice</span>
                </label>

                {/* System preset */}
                <div className={cn("rounded-lg border transition-all", charVoiceMode === "system" ? "border-violet-500/40 bg-violet-500/5" : "border-border")}>
                  <label className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer">
                    <input type="radio" name="voiceMode" checked={charVoiceMode === "system"} onChange={() => { setCharVoiceMode("system"); setCharVoiceValue("") }} className="accent-violet-500" disabled={charCreating} />
                    <span className="text-xs font-medium text-foreground/80">System Voice Preset</span>
                    <span className="text-[9px] text-muted-foreground/50 ml-1">30 voices</span>
                  </label>
                  {charVoiceMode === "system" && (
                    <div className="px-3 pb-3">
                      {charVoiceValue && (
                        <div className="flex items-center justify-between mb-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <CheckIcon className="h-3 w-3 text-violet-400" />
                            <span className="text-xs font-medium text-violet-300">{charVoiceValue}</span>
                            {(() => { const info = VOICE_MAP.get(charVoiceValue); return info ? <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold", info.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400")}>{info.gender === "female" ? "♀ Wanita" : "♂ Pria"}</span> : null })()}
                          </div>
                          <button onClick={() => playVoice(charVoiceValue, `modal-sys-${charVoiceValue}`)} className={cn("flex h-6 w-6 items-center justify-center rounded-md transition", playingVoice === `modal-sys-${charVoiceValue}` ? "bg-violet-500 text-white" : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30")}>
                            {playingVoice === `modal-sys-${charVoiceValue}` ? <PauseIcon className="h-2.5 w-2.5" /> : <PlayIcon className="h-2.5 w-2.5" />}
                          </button>
                        </div>
                      )}
                      <ScrollArea className="h-48 rounded-lg border border-border">
                        <div className="p-1 space-y-0.5">
                          {VOICE_DATA.map(v => (
                            <div key={v.name} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-all", charVoiceValue === v.name ? "bg-violet-500/15 text-violet-300" : "hover:bg-muted text-foreground")} onClick={() => setCharVoiceValue(v.name)}>
                              <div className={cn("h-2 w-2 shrink-0 rounded-full border transition", charVoiceValue === v.name ? "border-violet-500 bg-violet-500" : "border-muted-foreground/30")} />
                              <span className="text-xs font-medium flex-1 truncate">{v.name}</span>
                              <span className={cn("shrink-0 rounded px-1 py-0.5 text-[8px] font-bold", v.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400")}>{v.gender === "female" ? "♀" : "♂"}</span>
                              <span className="text-[9px] text-muted-foreground/50 truncate max-w-[80px]">{v.style}</span>
                              <button type="button" onClick={e => { e.stopPropagation(); playVoice(v.name, `modal-sys-${v.name}`) }} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded transition", playingVoice === `modal-sys-${v.name}` ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground hover:bg-violet-500/20 hover:text-violet-400")}>
                                {playingVoice === `modal-sys-${v.name}` ? <PauseIcon className="h-2 w-2" /> : <PlayIcon className="h-2 w-2" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>

                {/* Custom voice */}
                {voices.length > 0 && (
                  <div className={cn("rounded-lg border transition-all", charVoiceMode === "custom" ? "border-violet-500/40 bg-violet-500/5" : "border-border")}>
                    <label className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer">
                      <input type="radio" name="voiceMode" checked={charVoiceMode === "custom"} onChange={() => { setCharVoiceMode("custom"); setCharVoiceValue("") }} className="accent-violet-500" disabled={charCreating} />
                      <span className="text-xs font-medium text-foreground/80">Custom Voice</span>
                      <span className="text-[9px] text-muted-foreground/50 ml-1">{voices.length} voices</span>
                    </label>
                    {charVoiceMode === "custom" && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {voices.map(v => {
                          const info = VOICE_MAP.get(v.baseVoice)
                          return (
                            <div key={v.voiceRefId} onClick={() => setCharVoiceValue(v.voiceRefId)} className={cn("flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer transition-all", charVoiceValue === v.voiceRefId ? "border-violet-500/40 bg-violet-500/10" : "border-border/50 hover:border-border")}>
                              <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full border transition", charVoiceValue === v.voiceRefId ? "border-violet-500 bg-violet-500" : "border-muted-foreground/30")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-foreground">{v.displayName}</span>
                                  <span className="text-[10px] text-muted-foreground/50">({v.baseVoice})</span>
                                  {info && <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold", info.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400")}>{info.gender === "female" ? "♀" : "♂"}</span>}
                                </div>
                                <p className="text-[10px] text-muted-foreground/50 truncate">&ldquo;{v.dialog}&rdquo;</p>
                              </div>
                              {v.audioUrl && (
                                <button type="button" onClick={e => { e.stopPropagation(); playVoice(v.audioUrl!, `modal-custom-${v.id}`) }} className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition", playingVoice === `modal-custom-${v.id}` ? "bg-violet-500 text-white" : "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20")}>
                                  {playingVoice === `modal-custom-${v.id}` ? <PauseIcon className="h-2.5 w-2.5" /> : <PlayIcon className="h-2.5 w-2.5" />}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Personality Notes */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Personality Notes (opsional)</label>
              <textarea
                value={charNotes} onChange={e => setCharNotes(e.target.value.slice(0, 2000))}
                placeholder="Deskripsi kepribadian, gaya bicara, latar belakang karakter..."
                rows={3}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
                disabled={charCreating}
              />
              <span className="text-[10px] text-muted-foreground/50 mt-0.5 block text-right">{charNotes.length}/2000</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={resetCharForm} disabled={charCreating} size="sm">Batal</Button>
            <Button onClick={handleCreateCharacter} disabled={charCreating || !charName.trim() || charImages.length === 0} size="sm" className="gap-1.5 bg-violet-600 text-white hover:bg-violet-500">
              {charCreating ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> {charStatus || "Membuat..."}</> : <><SparklesIcon className="h-3.5 w-3.5" /> Buat Character (3 kredit)</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Create Voice Dialog ═══ */}
      <Dialog open={showCreateVoice} onOpenChange={open => { if (!open && !voiceCreating) setShowCreateVoice(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Custom Voice</DialogTitle>
            <DialogDescription>Buat voice kustom dari preset dengan dialog dan gaya delivery sendiri. Biaya: 3 kredit.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Base Voice Picker */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-2 block">Base Voice Preset *</label>
              <ScrollArea className="h-52 rounded-lg border border-border">
                <div className="p-1 space-y-0.5">
                  {VOICE_DATA.map(v => (
                    <div key={v.name} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 cursor-pointer transition-all", voicePreset === v.name ? "bg-violet-500/15 text-violet-300" : "hover:bg-muted text-foreground")} onClick={() => setVoicePreset(v.name)}>
                      <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full border transition", voicePreset === v.name ? "border-violet-500 bg-violet-500" : "border-muted-foreground/30")} />
                      <span className="text-xs font-medium flex-1">{v.name}</span>
                      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold", v.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400")}>{v.gender === "female" ? "♀ Wanita" : "♂ Pria"}</span>
                      <span className="text-[9px] text-muted-foreground/50 w-24 truncate text-right">{v.style}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); playVoice(v.name, `create-${v.name}`) }} className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition", playingVoice === `create-${v.name}` ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground hover:bg-violet-500/20 hover:text-violet-400")}>
                        {playingVoice === `create-${v.name}` ? <PauseIcon className="h-2.5 w-2.5" /> : <PlayIcon className="h-2.5 w-2.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Nama Voice *</label>
              <input type="text" value={voiceName} onChange={e => setVoiceName(e.target.value.slice(0, 200))} placeholder="Contoh: Narator Ceria, Deep Narrator..." className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
            </div>

            {/* Dialog */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Dialog Preview * <span className="font-normal text-muted-foreground">(teks yang akan diucapkan)</span></label>
              <input type="text" value={voiceDialog} onChange={e => setVoiceDialog(e.target.value.slice(0, 120))} placeholder="Contoh: Halo, selamat datang di Jenna Bot Pro!" className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
              <span className="text-[10px] text-muted-foreground/50 mt-0.5 block text-right">{voiceDialog.length}/120</span>
            </div>

            {/* Voice Performance */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Gaya Delivery * <span className="font-normal text-muted-foreground">(deskripsi cara bicara)</span></label>
              <input type="text" value={voicePerformance} onChange={e => setVoicePerformance(e.target.value.slice(0, 120))} placeholder="Contoh: Ceria dan energik, Deep brooding tone..." className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
              <span className="text-[10px] text-muted-foreground/50 mt-0.5 block text-right">{voicePerformance.length}/120</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateVoice(false)} disabled={voiceCreating} size="sm">Batal</Button>
            <Button onClick={handleCreateVoice} disabled={voiceCreating || !voicePreset || !voiceName.trim() || !voiceDialog.trim() || !voicePerformance.trim()} size="sm" className="gap-1.5 bg-violet-600 text-white hover:bg-violet-500">
              {voiceCreating ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Membuat voice...</> : <><MicIcon className="h-3.5 w-3.5" /> Buat Voice (3 kredit)</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Toast ═══ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 animate-fade-up">
          <div className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${toast.type === "success" ? "border-green-500/30 bg-green-500/15 text-green-400" : "border-red-500/30 bg-red-500/15 text-red-400"}`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
