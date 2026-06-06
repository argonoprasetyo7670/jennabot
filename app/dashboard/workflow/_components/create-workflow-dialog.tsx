"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  PlusIcon, XIcon, SearchIcon, FilterIcon,
  UploadIcon, CheckCircle2Icon, Loader2Icon, ChevronLeftIcon,
  AlertCircleIcon,
} from "lucide-react"
import {
  createWorkflow, TEMPLATES, STANDARD_REFS,
  type TemplateInfo, type TemplateRef,
} from "./workflow-store"

/* ─── Color classes ─── */
const COLOR_CLASSES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  violet: { border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-400", glow: "hover:shadow-violet-500/20" },
  pink: { border: "border-pink-500/30", bg: "bg-pink-500/10", text: "text-pink-400", glow: "hover:shadow-pink-500/20" },
  blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", glow: "hover:shadow-blue-500/20" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", glow: "hover:shadow-amber-500/20" },
  rose: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-400", glow: "hover:shadow-rose-500/20" },
  slate: { border: "border-slate-400/30", bg: "bg-slate-400/10", text: "text-slate-300", glow: "hover:shadow-slate-400/20" },
  cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "hover:shadow-cyan-500/20" },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "hover:shadow-emerald-500/20" },
  indigo: { border: "border-indigo-500/30", bg: "bg-indigo-500/10", text: "text-indigo-400", glow: "hover:shadow-indigo-500/20" },
  orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", glow: "hover:shadow-orange-500/20" },
  red: { border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400", glow: "hover:shadow-red-500/20" },
  green: { border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", glow: "hover:shadow-green-500/20" },
}

/* ─── State for picked (not yet uploaded) files ─── */
type PickedFile = { file: File; preview: string }

interface Props {
  onCreated: (id: string) => void
  onClose: () => void
  categories: string[]
}

export function CreateWorkflowDialog({ onCreated, onClose, categories }: Props) {
  const [newName, setNewName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("blank")
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Step 2: picked files (local only, no upload yet)
  const [pickedFiles, setPickedFiles] = useState<Record<string, PickedFile>>({})

  // Upload/create state
  const [isCreating, setIsCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [error, setError] = useState<string>("")

  const refInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const selectedTemplateInfo = TEMPLATES.find(t => t.id === selectedTemplate)
  const requiredRefs: TemplateRef[] = selectedTemplateInfo?.requiredRefs || []
  const allPicked = requiredRefs.length > 0 && requiredRefs.every(r => !!pickedFiles[r.id])

  // Filtered + grouped templates
  const filteredTemplates = TEMPLATES.filter(t => {
    if (activeCategory && t.category !== activeCategory && t.id !== "blank") return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    }
    return true
  })

  const groupedTemplates = (() => {
    const map = new Map<string, TemplateInfo[]>()
    for (const t of filteredTemplates) {
      if (!map.has(t.category)) map.set(t.category, [])
      map.get(t.category)!.push(t)
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
  })()

  const handleSelectTemplate = (t: TemplateInfo) => {
    setSelectedTemplate(t.id)
    setPickedFiles({})
    setError("")
    if (t.id !== "blank" && !newName.trim()) setNewName(t.name)
  }

  const close = () => {
    if (isCreating) return
    setNewName(""); setSelectedTemplate("blank"); setSearchQuery("")
    setActiveCategory(null); setCreateStep(1); setPickedFiles({})
    setError(""); setUploadProgress("")
    onClose()
  }

  const pickFile = (ref: TemplateRef, file: File) => {
    const preview = URL.createObjectURL(file)
    setPickedFiles(prev => ({ ...prev, [ref.id]: { file, preview } }))
    setError("")
  }

  /**
   * handleCreate — called from "Buat" button.
   * Step 1 → Step 2 if template needs refs.
   * Step 2 (or blank) → upload all files in parallel, then createWorkflow.
   */
  const handleCreate = async () => {
    if (!newName.trim()) return

    // Move to step 2 if needed
    if (createStep === 1 && requiredRefs.length > 0) {
      setCreateStep(2)
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const preloadedNodes: Record<string, Record<string, unknown>> = {}

      if (requiredRefs.length > 0) {
        const { uploadImageAsset } = await import("./actions/upload-asset")

        // Upload refs SEQUENTIALLY so all land on the SAME Google account.
        // The first upload auto-selects an account and returns its email.
        // All subsequent uploads pass that email to pin to the same account.
        // This is critical: the generate API can only use refs from one account.
        let pinnedEmail: string | undefined

        for (let i = 0; i < requiredRefs.length; i++) {
          const ref = requiredRefs[i]
          const picked = pickedFiles[ref.id]
          if (!picked) throw new Error(`Foto ${ref.label} belum dipilih`)

          setUploadProgress(`Mengupload foto ${i + 1} dari ${requiredRefs.length}: ${ref.label}...`)

          const result = await uploadImageAsset(picked.file, pinnedEmail)

          // Pin all subsequent uploads to the same Google account
          if (!pinnedEmail && result.email) {
            pinnedEmail = result.email
          }

          preloadedNodes[ref.id] = {
            status: "done",
            selectedImage: picked.preview,
            mediaGenerationId: result.mediaGenerationId,
            _uploadEmail: result.email,
            _preview: picked.preview,
            _fileType: "image",
          }
        }

        setUploadProgress("Upload selesai, membuat workflow...")
      }

      const wf = createWorkflow(
        newName.trim(),
        selectedTemplate === "blank" ? undefined : selectedTemplate,
        Object.keys(preloadedNodes).length > 0 ? preloadedNodes : undefined
      )

      close()
      onCreated(wf.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat workflow")
    } finally {
      setIsCreating(false)
      setUploadProgress("")
    }
  }

  const pickedCount = requiredRefs.filter(r => !!pickedFiles[r.id]).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-3xl mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-fade-up max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            {createStep === 2 && !isCreating && (
              <button onClick={() => setCreateStep(1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition">
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {createStep === 1 ? "Buat Workflow Baru" : "Pilih Foto Referensi"}
                </h2>
                {requiredRefs.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className={cn("h-1.5 w-4 rounded-full transition-all", createStep === 1 ? "bg-violet-500" : "bg-muted")} />
                    <span className={cn("h-1.5 w-4 rounded-full transition-all", createStep === 2 ? "bg-violet-500" : "bg-muted")} />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {createStep === 1
                  ? "Pilih template untuk memulai atau buat dari kosong"
                  : `Pilih ${requiredRefs.length} foto — upload otomatis saat klik Buat`
                }
              </p>
            </div>
          </div>
          <button onClick={close} disabled={isCreating} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition disabled:opacity-40">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Name Input ── */}
        <div className="px-5 pb-3 shrink-0">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Workflow</label>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !isCreating && handleCreate()}
            disabled={isCreating}
            placeholder="contoh: Model Promo Flow"
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:opacity-50"
          />
        </div>

        {/* ════ STEP 1: Template Grid ════ */}
        {createStep === 1 && (
          <>
            <div className="px-5 pb-3 shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari template..."
                    className="w-full rounded-lg border border-border bg-muted/20 pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/40" />
                </div>
                <span className="text-[10px] text-muted-foreground/50 shrink-0">{filteredTemplates.length} template</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button onClick={() => setActiveCategory(null)}
                  className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap transition-all shrink-0 border",
                    !activeCategory ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50")}>
                  <FilterIcon className="h-2.5 w-2.5" /> Semua
                </button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap transition-all shrink-0 border",
                      activeCategory === cat ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50")}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
              {groupedTemplates.length === 0
                ? <div className="flex items-center justify-center py-12"><p className="text-sm text-muted-foreground/50">Tidak ada template yang cocok</p></div>
                : (
                  <div className="space-y-4">
                    {groupedTemplates.map(group => (
                      <div key={group.category}>
                        {!activeCategory && <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">{group.category}</p>}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {group.items.map(t => {
                            const c = COLOR_CLASSES[t.color] || COLOR_CLASSES.violet
                            const isSelected = selectedTemplate === t.id
                            return (
                              <button key={t.id} onClick={() => handleSelectTemplate(t)}
                                className={cn("group/card flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-200 text-center hover:scale-[1.02] hover:shadow-md",
                                  isSelected ? `${c.border} ring-2 ring-violet-500/30 ${c.bg}` : `border-border/50 bg-muted/10 hover:bg-muted/30 ${c.glow}`)}>
                                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-transform group-hover/card:scale-110", c.bg)}>
                                  {t.icon}
                                </div>
                                <div>
                                  <p className={cn("text-xs font-semibold leading-tight", isSelected ? c.text : "text-foreground")}>{t.name}</p>
                                  <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground/60 line-clamp-2">{t.description}</p>
                                  {t.requiredRefs && <p className="mt-1 text-[8px] text-violet-400/70 font-medium">📎 3 foto referensi</p>}
                                </div>
                                {isSelected && <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[8px] font-bold text-violet-400 uppercase tracking-wide">✓ Dipilih</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </>
        )}

        {/* ════ STEP 2: Pick Refs (no upload yet) ════ */}
        {createStep === 2 && (
          <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
            <div className="space-y-4 py-2">
              {/* Info banner */}
              <div className="rounded-xl bg-violet-500/8 border border-violet-500/20 px-4 py-3">
                <p className="text-xs text-violet-300 leading-relaxed">
                  Pilih <strong>3 foto referensi</strong> di bawah. Foto akan diupload otomatis saat klik tombol <strong>Buat</strong>.
                </p>
              </div>

              {/* Upload progress overlay (only shown during creation) */}
              {isCreating && (
                <div className="rounded-xl bg-card border border-violet-500/30 px-4 py-4 flex items-center gap-3">
                  <Loader2Icon className="h-5 w-5 text-violet-400 animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{uploadProgress || "Memproses..."}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Jangan tutup dialog ini</p>
                  </div>
                </div>
              )}

              {/* 3 pick slots */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {requiredRefs.map(ref => {
                  const picked = pickedFiles[ref.id]
                  const hasPick = !!picked

                  return (
                    <div key={ref.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{ref.icon}</span>
                        <span className="text-xs font-semibold text-foreground">{ref.label}</span>
                        {hasPick && <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-400 ml-auto" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">{ref.description}</p>

                      <div
                        onClick={() => !isCreating && refInputRefs.current[ref.id]?.click()}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={e => {
                          e.preventDefault(); e.stopPropagation()
                          const f = e.dataTransfer.files[0]
                          if (f && !isCreating) pickFile(ref, f)
                        }}
                        className={cn(
                          "relative rounded-xl border-2 border-dashed overflow-hidden transition-all",
                          isCreating ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                          picked?.preview ? "aspect-[3/4]" : "py-10",
                          hasPick
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border/60 hover:border-violet-400/50 hover:bg-violet-500/5"
                        )}
                      >
                        {picked?.preview
                          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={picked.preview} alt={ref.label} className="w-full h-full object-cover" />
                          : (
                            <div className="flex flex-col items-center justify-center gap-2 h-full">
                              <UploadIcon className="h-6 w-6 text-muted-foreground/30" />
                              <p className="text-[10px] text-muted-foreground/50 text-center px-2">Klik atau drag &amp; drop</p>
                            </div>
                          )
                        }
                        {hasPick && !isCreating && (
                          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-emerald-500/90 py-1.5">
                            <CheckCircle2Icon className="h-3 w-3 text-white" />
                            <span className="text-[10px] text-white font-medium">Siap</span>
                          </div>
                        )}
                      </div>

                      <input
                        ref={el => { refInputRefs.current[ref.id] = el }}
                        type="file" accept="image/*" className="hidden" disabled={isCreating}
                        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(ref, f); e.target.value = "" }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Pick progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${(pickedCount / requiredRefs.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">{pickedCount}/{requiredRefs.length} dipilih</span>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <AlertCircleIcon className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border/50 shrink-0 bg-card">
          <div className="text-xs text-muted-foreground/50">
            {selectedTemplate !== "blank" && !isCreating && (
              <span className="flex items-center gap-1">
                Template: <span className="font-medium text-foreground/70">{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={close} disabled={isCreating} className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition disabled:opacity-40">Batal</button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isCreating || (createStep === 2 && !allPicked)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/35 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCreating
                ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Mengupload...</>
                : createStep === 1 && requiredRefs.length > 0
                  ? <span className="flex items-center gap-1">Lanjut <span className="text-white/70">→</span></span>
                  : <><PlusIcon className="h-4 w-4" /> Buat</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
