"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  SendIcon,
  PlusIcon,
  ChevronDownIcon,
  Loader2Icon,
  DownloadIcon,
  XIcon,
  EyeIcon,
  ImagePlusIcon,
  UploadIcon,
  ImageIcon,
  ArrowUpCircleIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { LottieLoading } from "@/components/lottie-loading"
import { useGenerationQueue, type GenerationJob, CREDIT_COST_IMAGE } from "@/contexts/generation-queue"
import type { ImageModel, AspectRatio, GeneratedImage } from "@/lib/api/google-flow"
import { upscaleImage, downloadBase64Image } from "@/lib/api/google-flow"
import { getCharactersAndVoices } from "@/app/dashboard/characters/actions"

/* ─── Constants ─── */
const ASPECT_RATIOS: AspectRatio[] = ["16:9", "4:3", "1:1", "3:4", "9:16"]
const IMAGE_COUNTS = [1, 2, 3, 4]
const MODELS: { id: ImageModel; name: string; icon: string; maxRefs: number }[] = [
  { id: "imagen-4", name: "Imagen 4", icon: "✨", maxRefs: 3 },
  { id: "nano-banana-2", name: "Nano Banana 2", icon: "🔥", maxRefs: 10 },
  { id: "nano-banana-pro", name: "Nano Banana Pro", icon: "🚀", maxRefs: 10 },
]

interface ReferenceImage {
  file?: File
  preview: string
  galleryUrl?: string
  fromGallery?: boolean
}

interface GalleryItem {
  id: string
  gcsUrl: string
  mediaGenerationId?: string
  prompt?: string
}

interface CharacterItem {
  id: string
  characterRefId: string
  displayName: string
  imageUrl1?: string | null
  imageUrl2?: string | null
  email?: string
}

export default function AIImageGeneratorPage() {
  const [selectedRatio, setSelectedRatio] = useState(4) // 9:16 default
  const [selectedCount, setSelectedCount] = useState(1)
  const [selectedModel, setSelectedModel] = useState(2) // nano-banana-pro default
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showGalleryPicker, setShowGalleryPicker] = useState(false)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  const [upscaling, setUpscaling] = useState<string | null>(null) // "2k" | "4k" | null
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [mentionSearch, setMentionSearch] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  // Character picker state
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [characterList, setCharacterList] = useState<CharacterItem[]>([])
  const [characterLoading, setCharacterLoading] = useState(false)
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterItem[]>([])

  const { jobs, submitJob } = useGenerationQueue()

  // Track the active job
  const activeJob = activeJobId ? jobs.find((j) => j.id === activeJobId) : null
  const isGenerating = activeJob?.status === "uploading" || activeJob?.status === "generating"
  const generatedImages = activeJob?.status === "done" ? activeJob.images : []
  const error = activeJob?.status === "error" ? activeJob.error : null

  const currentModel = MODELS[selectedModel]
  const creditCost = (IMAGE_COUNTS[selectedCount] || 1) * CREDIT_COST_IMAGE

  // Close settings popup on outside click
  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
        setShowModelDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showSettings])

  // Close plus menu on outside click
  useEffect(() => {
    if (!showPlusMenu) return
    const handleClick = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showPlusMenu])

  // Fetch characters for picker
  const openCharacterPicker = useCallback(async () => {
    setShowPlusMenu(false)
    setShowCharacterPicker(true)
    setCharacterLoading(true)
    try {
      const { characters } = await getCharactersAndVoices()
      setCharacterList(characters as CharacterItem[])
    } catch { /* ignore */ } finally {
      setCharacterLoading(false)
    }
  }, [])

  const toggleCharacter = (char: CharacterItem) => {
    const exists = selectedCharacters.find(c => c.characterRefId === char.characterRefId)
    const mention = `[${char.displayName}]`

    if (exists) {
      setSelectedCharacters(prev => prev.filter(c => c.characterRefId !== char.characterRefId))
      setPrompt(p => p.replace(mention, '').replace(/\s{2,}/g, ' ').trim())
    } else {
      setSelectedCharacters(prev => [...prev, char])
      setPrompt(p => {
        const trimmed = p.trim()
        return trimmed ? `${mention} ${trimmed}` : mention
      })
    }
  }

  const removeCharacter = (refId: string) => {
    setSelectedCharacters(prev => prev.filter(c => c.characterRefId !== refId))
  }

  const filteredCharacters = mentionSearch !== null
    ? characterList.filter(c => c.displayName.toLowerCase().includes(mentionSearch))
    : []

  const selectMention = (char: CharacterItem) => {
    if (!textareaRef.current) return
    const cursor = textareaRef.current.selectionStart
    const textBeforeCursor = prompt.slice(0, cursor)
    const textAfterCursor = prompt.slice(cursor)

    const match = textBeforeCursor.match(/(?:\s|^)@([^ ]*)$/)
    if (match) {
      const mentionStart = cursor - match[0].length + (match[0].startsWith(" ") ? 1 : 0)
      const newPrompt = prompt.slice(0, mentionStart) + `[${char.displayName}] ` + textAfterCursor
      setPrompt(newPrompt)
      
      if (!selectedCharacters.some(c => c.characterRefId === char.characterRefId)) {
        setSelectedCharacters(prev => [...prev, char])
      }
    }
    
    setMentionSearch(null)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setPrompt(val)

    const cursor = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(/(?:\s|^)@([^ ]*)$/)
    
    if (match) {
      setMentionSearch(match[1].toLowerCase())
      setMentionIndex(0)
      if (characterList.length === 0 && !characterLoading) {
        setCharacterLoading(true)
        getCharactersAndVoices().then(res => {
          setCharacterList(res.characters as CharacterItem[])
          setCharacterLoading(false)
        }).catch(() => setCharacterLoading(false))
      }
    } else {
      setMentionSearch(null)
    }
  }

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return
    setShowSettings(false)

    // Build references for the queue
    const refs = referenceImages.map((ref) => ({
      file: ref.file,
      galleryUrl: ref.galleryUrl,
    }))

    // Collect character ref IDs
    const charRefs = selectedCharacters.map(c => c.characterRefId)

    const jobId = submitJob(
      {
        prompt: prompt.trim(),
        model: currentModel.id,
        aspectRatio: ASPECT_RATIOS[selectedRatio],
        count: IMAGE_COUNTS[selectedCount],
        characters: charRefs.length > 0 ? charRefs : undefined,
        email: selectedCharacters.length > 0 ? selectedCharacters[0].email : undefined,
      },
      refs.length > 0 ? refs : undefined
    )

    setActiveJobId(jobId)
  }

  // NOTE: Auto-save to gallery is handled by GenerationQueueProvider (contexts/generation-queue.tsx).
  // Do NOT add page-level auto-save here — it causes duplicates.

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = currentModel.maxRefs - referenceImages.length
    const newRefs: ReferenceImage[] = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setReferenceImages((prev) => [...prev, ...newRefs])
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowPlusMenu(false)
  }

  const removeReference = (index: number) => {
    setReferenceImages((prev) => {
      const updated = [...prev]
      if (!updated[index].fromGallery) URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSearch !== null && filteredCharacters.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % filteredCharacters.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + filteredCharacters.length) % filteredCharacters.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        selectMention(filteredCharacters[mentionIndex])
        return
      }
      if (e.key === "Escape") {
        setMentionSearch(null)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  /** Download via server proxy — works on all browsers including Safari/iOS */
  const handleDownload = async (url: string, filename: string) => {
    try {
      const proxyUrl = `/api/ai/image-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
      const res = await fetch(proxyUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, "_blank")
    }
  }

  const handleUpscale = async (img: GeneratedImage, resolution: "2k" | "4k") => {
    if (!img.mediaGenerationId || upscaling) return
    setUpscaling(resolution)
    try {
      const result = await upscaleImage(img.mediaGenerationId, resolution)
      downloadBase64Image(result.encodedImage, `upscaled-${resolution}-${Date.now()}.jpg`)
    } catch (err) {
      alert(`Upscale gagal: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setUpscaling(null)
    }
  }

  const [savedImages, setSavedImages] = useState<Set<string>>(new Set())

  const handleSaveToGallery = async (img: GeneratedImage) => {
    if (savedImages.has(img.url)) return
    try {
      const res = await fetch("/api/gallery/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: img.url,
          type: "image",
          prompt: activeJob?.prompt || "",
          model: activeJob?.model || "",
          aspectRatio: img.aspectRatio || "",
          mediaGenerationId: img.mediaGenerationId || "",
          sourceAction: "image-generator",
        }),
      })
      if (res.ok) {
        setSavedImages(prev => new Set(prev).add(img.url))
      }
    } catch { /* ignore */ }
  }

  const fetchGallery = useCallback(async () => {
    setGalleryLoading(true)
    try {
      const res = await fetch("/api/gallery")
      const data = await res.json()
      if (res.ok) setGalleryItems(data.items || [])
    } catch { /* ignore */ } finally {
      setGalleryLoading(false)
    }
  }, [])

  const openGalleryPicker = () => {
    setShowPlusMenu(false)
    setShowGalleryPicker(true)
    fetchGallery()
  }

  const selectGalleryItem = (item: GalleryItem) => {
    if (referenceImages.length >= currentModel.maxRefs) return
    setReferenceImages((prev) => [
      ...prev,
      { preview: item.gcsUrl, galleryUrl: item.gcsUrl, fromGallery: true },
    ])
    setShowGalleryPicker(false)
  }

  const isEmpty = generatedImages.length === 0 && !isGenerating

  return (
    <div className="relative flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Tools", href: "/dashboard" },
        { label: "AI Image Generator" },
      ]} />

      {/* ── Main Canvas ── */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 pb-40">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-2 animate-fade-up">
            <div className="relative">
              <LottieLoading size={140} />
              <div className="absolute -inset-4 rounded-full bg-violet-500/8 blur-2xl -z-10 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/70">
                {activeJob?.progress || "Sedang membuat gambar..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Menggunakan {currentModel.name}</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 animate-fade-up">
            <div className="text-muted-foreground/30">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 8V28M32 28L24 20M32 28L40 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 36C20 36 22 32 26 32C30 32 30 36 32 36C34 36 34 32 38 32C42 32 44 36 44 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M26 36V44M38 36V44M32 36V48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="26" cy="46" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="38" cy="46" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="32" cy="50" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M28 56H36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Mulai berkreasi atau lepaskan media</p>
          </div>
        ) : (
          <div className="w-full max-w-5xl grid gap-4 p-4" style={{
            gridTemplateColumns: generatedImages.length === 1 ? "1fr" : "repeat(2, 1fr)",
          }}>
            {generatedImages.map((img, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-muted/30 animate-fade-up">
                <div className="relative aspect-square cursor-pointer" onClick={() => setPreviewImage(img)}>
                  <Image src={img.url} alt={`Generated ${i + 1}`} fill className="object-contain" unoptimized />
                </div>
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    {img.seed !== undefined ? `Seed: ${img.seed}` : `Image ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPreviewImage(img)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Preview">
                      <EyeIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                    <button onClick={() => handleDownload(img.url, `generated-${i + 1}.png`)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Download">
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button onClick={() => handleSaveToGallery(img)} disabled={savedImages.has(img.url)} className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition hover:bg-muted ${savedImages.has(img.url) ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`} title="Simpan ke Gallery">
                      <ImagePlusIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{savedImages.has(img.url) ? "Tersimpan ✓" : "Gallery"}</span>
                    </button>
                    {img.mediaGenerationId && currentModel.id !== "imagen-4" && (
                      <button
                        onClick={() => handleUpscale(img, "2k")}
                        disabled={upscaling !== null}
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition hover:bg-violet-500/20 hover:text-violet-400 disabled:opacity-40"
                        title="Upscale 2K"
                      >
                        {upscaling === "2k" ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <ArrowUpCircleIcon className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">2K</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-md">
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
              <span className="flex-1">{error}</span>
              <button onClick={() => setActiveJobId(null)} className="shrink-0 text-red-400/60 hover:text-red-400">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Prompt Bar ── */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="flex justify-center pb-2">
          <span className="text-[11px] text-muted-foreground">
            Pembuatan akan menggunakan <span className="text-foreground/60 underline underline-offset-2">{creditCost} poin</span>
          </span>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-4">
          {(referenceImages.length > 0 || selectedCharacters.length > 0) && (
            <div className="flex gap-2 mb-2 px-1 overflow-x-auto pb-1">
              {/* Selected Characters */}
              {selectedCharacters.map((char) => (
                <div key={char.characterRefId} className="relative h-14 shrink-0 overflow-hidden rounded-xl border-2 border-violet-500/40 bg-violet-500/5 flex items-center gap-1.5 px-2">
                  {char.imageUrl1 ? (
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                      <Image src={char.imageUrl1} alt={char.displayName} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                      <UsersIcon className="h-4 w-4 text-violet-400" />
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-violet-300 max-w-[60px] truncate">{char.displayName}</span>
                  <button onClick={() => removeCharacter(char.characterRefId)} className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[8px] shadow-sm">
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-violet-500/30 text-center">
                    <span className="text-[7px] text-white/80">Character</span>
                  </div>
                </div>
              ))}
              {/* Reference Images */}
              {referenceImages.map((ref, i) => (
                <div key={`ref-${i}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                  <Image src={ref.preview} alt={`Ref ${i + 1}`} fill className="object-cover" unoptimized />
                  <button onClick={() => removeReference(i)} className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[8px] shadow-sm">
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                  {ref.fromGallery && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-center">
                      <span className="text-[7px] text-white/70">Gallery</span>
                    </div>
                  )}
                </div>
              ))}
              {referenceImages.length < currentModel.maxRefs && (
                <button onClick={() => setShowPlusMenu(true)} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground/40 transition hover:border-border hover:text-muted-foreground">
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card/95 p-2 pl-3 backdrop-blur-xl shadow-2xl">
            {mentionSearch !== null && (filteredCharacters.length > 0 || characterLoading) && (
              <div className="absolute bottom-full left-12 mb-2 w-64 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                {characterLoading && filteredCharacters.length === 0 ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  filteredCharacters.map((char, i) => (
                    <button
                      key={char.characterRefId}
                      onClick={() => selectMention(char)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all",
                        mentionIndex === i ? "bg-violet-500/10 text-violet-400" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      {char.imageUrl1 ? (
                        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md">
                          <Image src={char.imageUrl1} alt={char.displayName} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
                          <UsersIcon className="h-3 w-3 text-violet-400" />
                        </div>
                      )}
                      <span className="truncate font-medium">{char.displayName}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            <div className="relative" ref={plusMenuRef}>
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
                <PlusIcon className="h-5 w-5" />
              </button>
              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                  <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <UploadIcon className="h-4 w-4" />
                    <span>Upload dari device</span>
                  </button>
                  <button onClick={openGalleryPicker} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>Pilih dari Gallery</span>
                  </button>
                  <button onClick={openCharacterPicker} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition hover:bg-violet-500/10 hover:text-violet-400">
                    <UsersIcon className="h-4 w-4" />
                    <span>Pilih Character</span>
                    {selectedCharacters.length > 0 && (
                      <span className="ml-auto rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-400">{selectedCharacters.length}</span>
                    )}
                  </button>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleFileUpload} />

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              placeholder="Apa yang ingin Anda buat?"
              rows={1}
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              style={{ lineHeight: "1.5" }}
            />

            <div className="mb-1 flex shrink-0 items-center gap-1.5">
              <div className="relative" ref={settingsRef}>
                {/* Mobile: gear icon only */}
                <button onClick={() => setShowSettings(!showSettings)} className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground cursor-pointer transition-all hover:bg-muted">
                  <Settings2Icon className="h-4 w-4" />
                </button>
                {/* Desktop: full text */}
                <button onClick={() => setShowSettings(!showSettings)} className="hidden sm:flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1.5 text-[10px] text-muted-foreground cursor-pointer transition-all hover:bg-muted">
                  <span>{currentModel.icon}</span>
                  <span className="font-medium">{currentModel.name}</span>
                  <span className="ml-0.5 rounded bg-muted px-1 py-0.5 text-[9px]">x{IMAGE_COUNTS[selectedCount]}</span>
                  <ChevronDownIcon className={cn("h-3 w-3 transition-transform", showSettings && "rotate-180")} />
                </button>

                {/* Mobile: bottom sheet overlay */}
                {showSettings && (
                  <div className="sm:hidden fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm" onClick={() => { setShowSettings(false); setShowModelDropdown(false) }}>
                    <div className="w-full rounded-t-2xl border-t border-border bg-card p-4 pb-6 shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
                      {/* Drag handle */}
                      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Aspect Ratio</p>
                      <div className="flex gap-1.5 mb-3">
                        {ASPECT_RATIOS.map((ratio, i) => (
                          <button key={ratio} onClick={() => setSelectedRatio(i)} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2 text-[10px] font-medium transition-all", selectedRatio === i ? "border-border bg-muted text-foreground" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            <RatioIcon index={i} />
                            <span>{ratio}</span>
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Jumlah Gambar</p>
                      <div className="flex gap-1.5 mb-3">
                        {IMAGE_COUNTS.map((count, i) => (
                          <button key={count} onClick={() => setSelectedCount(i)} className={cn("flex flex-1 items-center justify-center rounded-lg border py-2.5 text-xs font-medium transition-all", selectedCount === i ? "border-border bg-muted text-foreground" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            x{count}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Model</p>
                      <div className="relative">
                        <button onClick={() => setShowModelDropdown(!showModelDropdown)} className="flex w-full items-center justify-between rounded-lg border border-transparent bg-muted/30 px-3 py-2.5 text-xs font-medium text-foreground/70 transition-all hover:bg-muted/50">
                          <span className="flex items-center gap-2">
                            <span>{currentModel.icon}</span>
                            <span>{currentModel.name}</span>
                          </span>
                          <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", showModelDropdown && "rotate-180")} />
                        </button>
                        {showModelDropdown && (
                          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                            {MODELS.map((model, i) => (
                              <button key={model.id} onClick={() => { setSelectedModel(i); setShowModelDropdown(false) }} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all", selectedModel === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                                <span>{model.icon}</span>
                                <span>{model.name}</span>
                                <span className="ml-auto text-[9px] text-muted-foreground/50">max {model.maxRefs} ref</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop: floating popup */}
                {showSettings && (
                  <div className="hidden sm:block absolute bottom-full right-0 mb-2 w-[320px] z-50">
                    <div className="rounded-2xl border border-border bg-card/95 p-3 backdrop-blur-xl shadow-2xl">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Aspect Ratio</p>
                      <div className="flex gap-1.5 mb-3">
                        {ASPECT_RATIOS.map((ratio, i) => (
                          <button key={ratio} onClick={() => setSelectedRatio(i)} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2 text-[10px] font-medium transition-all", selectedRatio === i ? "border-border bg-muted text-foreground" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            <RatioIcon index={i} />
                            <span>{ratio}</span>
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Jumlah Gambar</p>
                      <div className="flex gap-1.5 mb-3">
                        {IMAGE_COUNTS.map((count, i) => (
                          <button key={count} onClick={() => setSelectedCount(i)} className={cn("flex flex-1 items-center justify-center rounded-lg border py-2 text-xs font-medium transition-all", selectedCount === i ? "border-border bg-muted text-foreground" : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                            x{count}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Model</p>
                      <div className="relative">
                        <button onClick={() => setShowModelDropdown(!showModelDropdown)} className="flex w-full items-center justify-between rounded-lg border border-transparent bg-muted/30 px-3 py-2.5 text-xs font-medium text-foreground/70 transition-all hover:bg-muted/50">
                          <span className="flex items-center gap-2">
                            <span>{currentModel.icon}</span>
                            <span>{currentModel.name}</span>
                          </span>
                          <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", showModelDropdown && "rotate-180")} />
                        </button>
                        {showModelDropdown && (
                          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50">
                            {MODELS.map((model, i) => (
                              <button key={model.id} onClick={() => { setSelectedModel(i); setShowModelDropdown(false) }} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all", selectedModel === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                                <span>{model.icon}</span>
                                <span>{model.name}</span>
                                <span className="ml-auto text-[9px] text-muted-foreground/50">max {model.maxRefs} ref</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-all", prompt.trim() && !isGenerating ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40" : "bg-muted text-muted-foreground/40 cursor-not-allowed")}>
                {isGenerating ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview Dialog ── */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={previewImage.url} alt="Preview" width={1024} height={1024} className="max-h-[80vh] w-auto rounded-2xl object-contain" unoptimized style={{ width: "auto", height: "auto" }} />
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button onClick={() => handleDownload(previewImage.url, "generated-image.png")} className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm text-white backdrop-blur-sm transition hover:bg-white/20">
                <DownloadIcon className="h-4 w-4" /> Download
              </button>
              {previewImage.mediaGenerationId && currentModel.id !== "imagen-4" && (
                <>
                  <button onClick={() => handleUpscale(previewImage, "2k")} disabled={upscaling !== null} className="flex h-10 items-center gap-2 rounded-xl bg-violet-500/20 px-4 text-sm text-white backdrop-blur-sm transition hover:bg-violet-500/30 disabled:opacity-40">
                    {upscaling === "2k" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <ArrowUpCircleIcon className="h-4 w-4" />} 2K
                  </button>
                  <button onClick={() => handleUpscale(previewImage, "4k")} disabled={upscaling !== null} className="flex h-10 items-center gap-2 rounded-xl bg-violet-500/20 px-4 text-sm text-white backdrop-blur-sm transition hover:bg-violet-500/30 disabled:opacity-40">
                    {upscaling === "4k" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <ArrowUpCircleIcon className="h-4 w-4" />} 4K
                  </button>
                </>
              )}
              <button onClick={() => handleSaveToGallery(previewImage)} disabled={savedImages.has(previewImage.url)} className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm backdrop-blur-sm transition ${savedImages.has(previewImage.url) ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white hover:bg-white/20"}`}>
                <ImagePlusIcon className="h-4 w-4" /> Gallery
              </button>
              <button onClick={() => setPreviewImage(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Picker Dialog ── */}
      {showGalleryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowGalleryPicker(false)}>
          <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-border bg-card p-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Pilih dari Gallery</h3>
              <button onClick={() => setShowGalleryPicker(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {galleryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            ) : galleryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada gambar di gallery</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[60vh] pr-1">
                {galleryItems.map((item) => (
                  <button key={item.id} onClick={() => selectGalleryItem(item)} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/30 transition hover:border-violet-500/50 hover:ring-2 hover:ring-violet-500/20">
                    <Image src={item.gcsUrl} alt={item.prompt || "Gallery"} fill className="object-cover" unoptimized />
                    {item.prompt && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                        <p className="text-[9px] text-white/70 line-clamp-2">{item.prompt}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Character Picker Dialog ── */}
      {showCharacterPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCharacterPicker(false)}>
          <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-violet-500/20 bg-card p-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-foreground">Pilih Character</h3>
              </div>
              <button onClick={() => setShowCharacterPicker(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {characterLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-6 w-6 text-violet-400 animate-spin" />
              </div>
            ) : characterList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UsersIcon className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada character</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Buat character dulu di halaman Characters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-1">
                  {characterList.map((char) => {
                    const isSelected = selectedCharacters.some(c => c.characterRefId === char.characterRefId)
                    return (
                      <button
                        key={char.id}
                        onClick={() => toggleCharacter(char)}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border-2 transition-all",
                          isSelected
                            ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20"
                            : "border-border bg-muted/20 hover:border-violet-500/30 hover:bg-violet-500/5"
                        )}
                      >
                        <div className="aspect-square relative bg-muted/30">
                          {char.imageUrl1 ? (
                            <Image src={char.imageUrl1} alt={char.displayName} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <UsersIcon className="h-8 w-8 text-muted-foreground/20" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium text-foreground truncate">{char.displayName}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground">
                    {selectedCharacters.length} character dipilih
                  </span>
                  <button
                    onClick={() => setShowCharacterPicker(false)}
                    className="rounded-lg bg-violet-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-violet-600"
                  >
                    Selesai
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RatioIcon({ index }: { index: number }) {
  const sizes: Record<number, { w: number; h: number }> = {
    0: { w: 16, h: 10 }, 1: { w: 14, h: 11 }, 2: { w: 12, h: 12 },
    3: { w: 11, h: 14 }, 4: { w: 10, h: 16 },
  }
  const { w, h } = sizes[index] || { w: 12, h: 12 }
  return <span className="block rounded-[2px] border border-current opacity-60" style={{ width: w, height: h }} />
}
