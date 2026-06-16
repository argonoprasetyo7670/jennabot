"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import {
  ImageIcon, Loader2Icon, PlayIcon,
  XCircleIcon, XIcon, CheckCircle2Icon, DownloadIcon,
  FolderPlusIcon, MonitorIcon, MoreHorizontalIcon, HashIcon,
  SparklesIcon, PlusIcon, PencilIcon, CopyIcon, UsersIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NodeShell, getPortColor } from "../node-shell"
import { useConnectedPrompt, useAllConnectedValues, useConnectedValue } from "../use-connected-value"
import { useImageGenerateNode } from "../hooks/use-image-generate-node"
import { IMAGE_MODELS, IMAGE_ASPECT_RATIOS, DEFAULTS } from "../node-defaults"
import { getCharactersAndVoices } from "@/app/dashboard/characters/actions"

interface CharacterItem {
  id: string
  characterRefId: string
  displayName: string
  imageUrl1?: string | null
  imageUrl2?: string | null
}

export function ImageGenNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>
  const { updateNodeData, deleteElements, getNodes, setNodes } = useReactFlow()
  const refInputRef = useRef<HTMLInputElement>(null!)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const title = (nodeData.title as string) || "Gemini 3 (Nano Banana Pro)"

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  const handleDuplicate = useCallback(() => {
    setMenuOpen(false)
    const nodes = getNodes()
    const currentNode = nodes.find(n => n.id === nodeId)
    if (!currentNode) return
    const newId = `image_${Date.now()}`
    const newNode = {
      ...currentNode,
      id: newId,
      position: { x: currentNode.position.x + 40, y: currentNode.position.y + 40 },
      data: { ...currentNode.data, title: `${title} (copy)` },
      selected: false,
    }
    setNodes([...nodes, newNode])
  }, [getNodes, setNodes, nodeId, title])

  const handleRename = useCallback(() => {
    setMenuOpen(false)
    setIsEditingTitle(true)
  }, [])

  // Character picker state
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [characterList, setCharacterList] = useState<CharacterItem[]>([])
  const [characterLoading, setCharacterLoading] = useState(false)
  
  const selectedCharacters = (nodeData._selectedCharacters as CharacterItem[]) || []

  const openCharacterPicker = useCallback(async () => {
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
    
    let newChars
    if (exists) {
      newChars = selectedCharacters.filter(c => c.characterRefId !== char.characterRefId)
      setLocalPrompt(localPrompt.replace(mention, '').replace(/\s{2,}/g, ' ').trim())
    } else {
      newChars = [...selectedCharacters, char]
      const trimmed = localPrompt.trim()
      setLocalPrompt(trimmed ? `${mention} ${trimmed}` : mention)
    }
    updateNodeData(nodeId, { _selectedCharacters: newChars })
  }

  const removeCharacter = (refId: string) => {
    const updated = selectedCharacters.filter(c => c.characterRefId !== refId)
    updateNodeData(nodeId, { _selectedCharacters: updated })
  }

  const connectedPrompt = useConnectedPrompt()

  // Collect ALL reference connections (model + background + product upload nodes)
  const allRefMediaIds = useAllConnectedValues("references", "mediaGenerationId")
  const allRefEmails = useAllConnectedValues("references", "_uploadEmail")

  // Flatten to arrays — filter out null/empty values
  const connectedRefIds = allRefMediaIds
    .map(r => r.value as string)
    .filter(Boolean)
  const connectedRefEmail = (allRefEmails.find(r => r.value)?.value as string) || null

  const connectedCharacters = (useConnectedValue("prompt", "_selectedCharacters") as CharacterItem[]) || []
  const activePrompt = connectedPrompt || (nodeData._localPrompt as string) || ""

  const mergedCharacters = [...selectedCharacters, ...connectedCharacters].filter((c, idx, self) => self.findIndex(s => s.characterRefId === c.characterRefId) === idx)

  const {
    isGenerating, error, localPrompt, refImages, previewIdx, savingGallery,
    generatedImages, selectedIdx,
    setLocalPrompt, setPreviewIdx,
    handleGenerate, handleSelect, handleDownload, handleSaveToGallery,
    handleUploadRef, handleRemoveRef,
  } = useImageGenerateNode(nodeId, nodeData, activePrompt, connectedRefIds, connectedRefEmail, mergedCharacters)

  const previewImage = previewIdx !== null ? generatedImages[previewIdx] : null

  // Map aspect ratio string → Tailwind aspect class
  const ar = (nodeData.aspectRatio as string) || DEFAULTS.imageAspectRatio
  const arClass: Record<string, string> = {
    "1:1": "aspect-square",
    "4:3": "aspect-[4/3]",
    "3:4": "aspect-[3/4]",
    "16:9": "aspect-video",
    "9:16": "aspect-[9/16]",
  }
  const previewAspect = arClass[ar] || "aspect-[9/16]"

  const headerActions = (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <MoreHorizontalIcon className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-fade-in p-1 cursor-default" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleRename}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/50 rounded-lg transition"
          >
            <PencilIcon className="h-3 w-3" /> Rename
          </button>
          <button
            onClick={handleDuplicate}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/50 rounded-lg transition"
          >
            <CopyIcon className="h-3 w-3" /> Duplicate
          </button>
          <div className="h-px bg-border/50 my-1 mx-1" />
          <button
            onClick={() => { deleteElements({ nodes: [{ id: nodeId }] }); setMenuOpen(false) }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition"
          >
            <XIcon className="h-3 w-3" /> Hapus Node
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="relative group">
        <NodeShell 
          label={isEditingTitle ? (
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => updateNodeData(nodeId, { title: e.target.value })}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={e => e.key === "Enter" && setIsEditingTitle(false)}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none border-b border-border w-full"
            />
          ) : (
            <span className="cursor-text" onClick={() => setIsEditingTitle(true)} title="Klik untuk mengubah nama">{title}</span>
          )} 
          icon="✨" 
          nodeType="imageGenNode" 
          status={(nodeData._runStatus || nodeData.status) as string} 
          nodeId={nodeId} 
          headerActions={headerActions}
          selected={selected}
        >

          {/* ─── Left Handle: Prompt ─── */}
          <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "20%", transform: "translateY(-50%)" }}>Prompt</span>
          <Handle
            type="target"
            position={Position.Left}
            id="prompt"
            className="!border-[4px] !border-[#f472b6]"
            style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "20%", zIndex: 10 }}
          />

          {/* ─── Left Handle: References ─── */}
          <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "35%", transform: "translateY(-50%)" }}>References</span>
          <Handle
            type="target"
            position={Position.Left}
            id="references"
            className="!border-[4px] !border-[#34d399]"
            style={{
              width: 16,
              height: 16,
              background: "var(--card)",
              left: -8,
              top: "35%",
              zIndex: 10
            }}
          />

          {/* ─── Right Handles: Dynamic Outputs ─── */}
          {Array.from({ length: (nodeData.count as number) || DEFAULTS.imageCount || 1 }).map((_, idx, arr) => {
            const topPercent = arr.length === 1 ? 20 : 20 + (60 / (arr.length - 1)) * idx
            const isSelected = idx === selectedIdx
            return (
              <div key={`handle-out-${idx}`}>
                <div
                  className="absolute right-6 flex items-center justify-end pointer-events-none select-none z-10"
                  style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
                >
                  {generatedImages.length > 0 && (
                    <span className={cn(
                      "text-[9px] font-medium px-1 rounded shadow-sm transition-all duration-300",
                      isSelected ? "bg-violet-500 text-white opacity-100" : "text-muted-foreground bg-card/80 border border-border/50 opacity-0 group-hover:opacity-100"
                    )}>Img {idx + 1}</span>
                  )}
                </div>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={idx === 0 ? "selectedImage" : `image_${idx}`}
                  className="!border-[4px] !border-[#34d399]"
                  style={{
                    width: 16,
                    height: 16,
                    background: "var(--card)",
                    right: -8,
                    top: `${topPercent}%`,
                    transform: "translateY(-50%)",
                    zIndex: 10
                  }}
                />
              </div>
            )
          })}

          {/* ─── Preview Area (Checkerboard) ─── */}
          <div className="px-4 pb-2">
            <div
              className={cn("relative w-full rounded-xl border bg-muted/10 overflow-hidden cursor-pointer flex items-center justify-center", previewAspect, generatedImages.length > 0 ? "border-blue-400/30" : "border-border/30")}
              onClick={() => generatedImages.length > 0 && setPreviewIdx(selectedIdx)}
            >
              {/* Checkerboard background */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(45deg, #888 25%, transparent 25%), linear-gradient(-45deg, #888 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #888 75%), linear-gradient(-45deg, transparent 75%, #888 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }} />

              {generatedImages.length > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedImages[selectedIdx]?.url} alt="Generated" className="w-full h-full object-cover relative z-10" />
                  {generatedImages.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                      {generatedImages.map((_, idx) => (
                        <button key={idx} onClick={e => { e.stopPropagation(); handleSelect(idx) }}
                          className={cn("h-1.5 rounded-full transition-all", idx === selectedIdx ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80")} />
                      ))}
                    </div>
                  )}
                </>
              ) : isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 relative z-10">
                  <Loader2Icon className="h-6 w-6 text-blue-400 animate-spin" />
                  <p className="text-[10px] text-muted-foreground">Generating...</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* ─── Uploaded Reference & Character Thumbnails ─── */}
          {(refImages.length > 0 || mergedCharacters.length > 0) && (
            <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap">
              {/* Selected Characters */}
              {mergedCharacters.map((char) => {
                const isFromPrompt = connectedCharacters.some(c => c.characterRefId === char.characterRefId)
                return (
                  <div key={char.characterRefId} className="relative group flex h-10 items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/5 px-2" title={isFromPrompt ? "Karakter dari Prompt Node" : "Karakter dari Image Node"}>
                    {char.imageUrl1 ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={char.imageUrl1} alt={char.displayName} className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-500/20">
                        <UsersIcon className="h-3 w-3 text-violet-400" />
                      </div>
                    )}
                    <span className="text-[10px] font-medium text-violet-300 max-w-[50px] truncate">{char.displayName}</span>
                    {!isFromPrompt && (
                      <button onClick={(e) => { e.stopPropagation(); removeCharacter(char.characterRefId) }}
                        className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow-sm">
                        <XIcon className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                )
              })}
              {/* Reference Images */}
              {refImages.map((ref, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.preview} alt={`Ref ${idx + 1}`} className={cn("h-10 w-10 rounded-lg object-cover border", ref.uploading ? "border-amber-400/50 opacity-60" : ref.error ? "border-red-400/50" : "border-border/50")} />
                  {ref.uploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2Icon className="h-3 w-3 text-amber-400 animate-spin" /></div>}
                  {ref.error && <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg"><XCircleIcon className="h-3 w-3 text-red-400" /></div>}
                  <button onClick={e => { e.stopPropagation(); handleRemoveRef(idx) }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground shadow-sm">
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={refInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
            onChange={async e => { if (e.target.files) { await handleUploadRef(e.target.files); e.target.value = "" } }}
          />

          {/* ─── Footer ─── */}
          <div className="flex items-center justify-between px-4 pb-4 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); e.preventDefault(); refInputRef.current?.click() }}
                disabled={isGenerating || refImages.length >= 10}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition disabled:opacity-30"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add Image
              </button>
              <button
                onClick={e => { e.stopPropagation(); e.preventDefault(); openCharacterPicker() }}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-[11px] font-medium text-violet-400 hover:text-violet-300 transition disabled:opacity-30"
              >
                <UsersIcon className="h-3.5 w-3.5" />
                Character
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/30 transition disabled:opacity-50"
            >
              {isGenerating ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : "Run Model"}
              {!isGenerating && <span className="text-muted-foreground ml-1">→</span>}
            </button>
          </div>

          {/* ─── Errors ─── */}
          {error && (
            <div className="mx-4 mb-4 flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5">
              <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400 leading-tight">{error}</p>
            </div>
          )}
        </NodeShell>

        {/* Settings bar */}
        <div className="flex items-center justify-center mt-1.5">
          <div className="flex items-center gap-2 rounded-full bg-card border border-border/50 shadow-sm px-3 py-1.5">
            <select
              value={(nodeData.model as string) || DEFAULTS.imageModel}
              onChange={e => updateNodeData(nodeId, { model: e.target.value })}
              disabled={isGenerating}
              className="bg-transparent text-xs font-medium text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {IMAGE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-1">
              <MonitorIcon className="h-3 w-3 text-muted-foreground" />
              <select
                value={(nodeData.aspectRatio as string) || DEFAULTS.imageAspectRatio}
                onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })}
                disabled={isGenerating}
                className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                {IMAGE_ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
              </select>
            </div>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-1">
              <HashIcon className="h-3 w-3 text-muted-foreground" />
              <select
                value={(nodeData.count as number) || DEFAULTS.imageCount}
                onChange={e => updateNodeData(nodeId, { count: Number(e.target.value) })}
                disabled={isGenerating}
                className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                <option value={1}>×1</option><option value={2}>×2</option><option value={4}>×4</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Popup */}
      {previewImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewIdx(null)}>
          <div className="relative flex flex-col items-center gap-3 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewIdx(null)} className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition shadow-lg">
              <XIcon className="h-3.5 w-3.5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage.url} alt="Preview" className="w-full rounded-xl object-contain shadow-2xl max-h-[60vh]" />
            <div className="flex items-center gap-2">
              <button onClick={() => { handleSelect(previewIdx!); setPreviewIdx(null) }} className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 transition active:scale-95">
                <CheckCircle2Icon className="h-3.5 w-3.5" /> Pilih
              </button>
              <button onClick={() => handleDownload(previewImage.url, previewIdx!)} className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95">
                <DownloadIcon className="h-3.5 w-3.5" /> Download
              </button>
              <button onClick={() => handleSaveToGallery(previewImage.url)} disabled={savingGallery} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50">
                {savingGallery ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <FolderPlusIcon className="h-3.5 w-3.5" />} Gallery
              </button>
            </div>
            {generatedImages.length > 1 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <button onClick={() => setPreviewIdx(Math.max(0, previewIdx! - 1))} disabled={previewIdx === 0} className="px-2 py-1 rounded hover:bg-card/80 transition disabled:opacity-30">← Sebelumnya</button>
                <span>{previewIdx! + 1} / {generatedImages.length}</span>
                <button onClick={() => setPreviewIdx(Math.min(generatedImages.length - 1, previewIdx! + 1))} disabled={previewIdx === generatedImages.length - 1} className="px-2 py-1 rounded hover:bg-card/80 transition disabled:opacity-30">Selanjutnya →</button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Character Picker Dialog */}
      {showCharacterPicker && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCharacterPicker(false)}>
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
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={char.imageUrl1} alt={char.displayName} className="w-full h-full object-cover" />
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
                        <div className="px-2 py-1.5 text-left">
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
    </>
  )
}
