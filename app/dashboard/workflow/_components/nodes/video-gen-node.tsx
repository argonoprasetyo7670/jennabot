"use client"

import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  FileTextIcon, ImageIcon, VideoIcon, LayoutGridIcon, Loader2Icon, PlayIcon,
  XCircleIcon, XIcon, FolderPlusIcon, MonitorIcon, MoreHorizontalIcon, ScanEyeIcon, DownloadIcon, FrameIcon, PuzzleIcon,
  PencilIcon, CopyIcon, UsersIcon,
  ExpandIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NodeShell, NodeCloseBtn, HandleIcon, getPortColor } from "../node-shell"
import { useConnectedPrompt, useConnectedValue, useAllConnectedValues } from "../use-connected-value"
import { useVideoGenerateNode } from "../hooks/use-video-generate-node"
import { VIDEO_MODELS, VIDEO_ASPECT_RATIOS, DEFAULTS } from "../node-defaults"
import { getCharactersAndVoices } from "@/app/dashboard/characters/actions"

interface CharacterItem {
  id: string
  characterRefId: string
  displayName: string
  imageUrl1?: string | null
  imageUrl2?: string | null
}

export function VideoGenNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements, getNodes, setNodes } = useReactFlow()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const title = (nd.title as string) || "Video Generate"

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
    const newId = `video_${Date.now()}`
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

  const connectedPrompt = useConnectedPrompt()
  const connectedImage = useConnectedValue("startImage") as string | null   // display URL
  const connectedMediaId = useConnectedValue("startImage", "mediaGenerationId") as string | null
  const connectedEndMediaId = useConnectedValue("endImage", "mediaGenerationId") as string | null
  const connectedEmail = useConnectedValue("startImage", "_uploadEmail") as string | null
  const activePrompt = connectedPrompt || (nd._localPrompt as string) || ""

  // Character picker state
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [characterList, setCharacterList] = useState<CharacterItem[]>([])
  const [characterLoading, setCharacterLoading] = useState(false)

  const selectedCharacters = (nd._selectedCharacters as CharacterItem[]) || []

  // imageMode forced to "reference" if characters exist or omni-flash is selected
  const isOmniFlash = (nd.model as string) === "omni-flash"
  const forceReference = selectedCharacters.length > 0 || isOmniFlash
  const imageMode = forceReference ? "reference" : ((nd.imageMode as string) || "start")

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
    updateNodeData(nodeId, { _selectedCharacters: newChars, imageMode: newChars.length > 0 ? "reference" : nd.imageMode })
  }

  const removeCharacter = (refId: string) => {
    const updated = selectedCharacters.filter(c => c.characterRefId !== refId)
    updateNodeData(nodeId, { _selectedCharacters: updated, imageMode: updated.length > 0 ? "reference" : nd.imageMode })
  }

  const connectedCharacters = (useConnectedValue("prompt", "_selectedCharacters") as CharacterItem[]) || []
  const mergedCharacters = [...selectedCharacters, ...connectedCharacters].filter((c, idx, self) => self.findIndex(s => s.characterRefId === c.characterRefId) === idx)

  const {
    isGenerating, isUpscaling, error, localPrompt, elapsed, previewOpen, savingGallery,
    generatedVideoUrl, rawVideoUrl,
    setLocalPrompt, setPreviewOpen,
    handleGenerate, handleUpscale, handleDownload, handleSaveGallery, fmtTime,
  } = useVideoGenerateNode(nodeId, nd, activePrompt, connectedImage, connectedMediaId, connectedEndMediaId, connectedEmail, imageMode, mergedCharacters)

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
          <div className="px-2 py-1.5 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Mode Input</label>
            <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/50 relative">
              {forceReference && (
                <div className="absolute inset-0 z-10 cursor-not-allowed" title={isOmniFlash ? "Omni Flash tidak mendukung Start Frame" : "Karakter aktif memaksa mode referensi"} />
              )}
              <button
                onClick={() => { updateNodeData(nodeId, { imageMode: "start" }); setMenuOpen(false) }}
                disabled={isGenerating || forceReference}
                className={cn("flex-1 flex items-center justify-center py-1 text-[10px] font-medium rounded-md transition-all", imageMode === "start" ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground", forceReference && "opacity-50")}
              >
                Frame
              </button>
              <button
                onClick={() => { updateNodeData(nodeId, { imageMode: "reference" }); setMenuOpen(false) }}
                disabled={isGenerating || selectedCharacters.length > 0}
                className={cn("flex-1 flex items-center justify-center py-1 text-[10px] font-medium rounded-md transition-all", imageMode === "reference" ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground")}
              >
                Aset
              </button>
            </div>
          </div>
          <div className="h-px bg-border/50 my-1" />
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
          icon="🎬"
          nodeType="videoGenNode"
          status={(nd._runStatus || nd.status) as string}
          nodeId={nodeId}
          headerActions={headerActions}
          selected={selected}
        >
          {/* ─── Left Handle: Prompt (pink) ─── */}
          <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "20%", transform: "translateY(-50%)" }}>Prompt</span>
          <Handle type="target" position={Position.Left} id="prompt"
            className="!border-[4px] !border-[#f472b6]"
            style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "20%", zIndex: 10 }} />

          {imageMode === "start" ? (
            <>
              {/* ─── Frame Mode: Start Image (green) ─── */}
              <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "45%", transform: "translateY(-50%)" }}>Start</span>
              <Handle type="target" position={Position.Left} id="startImage"
                className="!border-[4px] !border-[#34d399]"
                style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "45%", zIndex: 10 }} />
              {/* ─── Frame Mode: End Image (green, optional) ─── */}
              <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#34d399]/70 pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "65%", transform: "translateY(-50%)" }}>End <span className="opacity-60">(opt)</span></span>
              <Handle type="target" position={Position.Left} id="endImage"
                className="!border-[4px] !border-[#34d399]"
                style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "65%", zIndex: 10 }} />
            </>
          ) : (
            <>
              {/* ─── Assets Mode: References (green, multi-connection) ─── */}
              <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "50%", transform: "translateY(-50%)" }}>Assets</span>
              <Handle type="target" position={Position.Left} id="startImage"
                isConnectableStart={false}
                className="!border-[4px] !border-[#34d399]"
                style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "50%", zIndex: 10 }} />
            </>
          )}

          {/* ─── Right Handle: Output Video (cyan) ─── */}
          <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#06b6d4] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "40%", transform: "translateY(-50%)" }}>Video</span>
          <Handle type="source" position={Position.Right} id="selectedVideo"
            className="!border-[4px] !border-[#06b6d4]"
            style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "40%", zIndex: 10 }} />

          {/* Preview */}
          <div
            className={cn("relative w-full aspect-video rounded-xl border bg-muted/20 overflow-hidden mb-2 cursor-pointer", generatedVideoUrl ? "border-blue-400/30" : "border-border")}
            onClick={() => generatedVideoUrl && setPreviewOpen(true)}
          >
            {generatedVideoUrl && !isGenerating ? (
              <>
                <video src={generatedVideoUrl} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                  <PlayIcon className="h-8 w-8 text-white drop-shadow" />
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setPreviewOpen(true) }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
                  >
                    <ExpandIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); handleUpscale("1080p") }}
                    disabled={isUpscaling}
                    className="px-2 py-1 text-[9px] font-medium rounded-md bg-black/60 text-white hover:bg-violet-600 transition-colors backdrop-blur-sm"
                  >
                    Upscale 1080p (Free)
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleUpscale("4K") }}
                    disabled={isUpscaling}
                    className="px-2 py-1 text-[9px] font-medium rounded-md bg-black/60 text-amber-400 hover:bg-amber-600 hover:text-white transition-colors backdrop-blur-sm"
                  >
                    Upscale 4K (50 Credits)
                  </button>
                </div>
              </>
            ) : isGenerating || isUpscaling ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Loader2Icon className="h-6 w-6 text-cyan-400 animate-spin" />
                <p className="text-[10px] text-muted-foreground">{isUpscaling ? "Upscaling..." : "Generating"} {fmtTime(elapsed)}</p>
                <div className="w-2/3 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse"
                    style={{ width: `${Math.min(95, elapsed * 0.8)}%`, transition: "width 1s" }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground/40">
                <VideoIcon className="h-8 w-8" />
              </div>
            )}
          </div>

          {/* Selected Image/Characters Area */}
          {(connectedImage || mergedCharacters.length > 0) && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {connectedImage && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-2 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={connectedImage} alt="Input" className="h-6 w-6 rounded object-cover border border-border" />
                  <p className="text-[10px] text-muted-foreground">{imageMode === "start" ? "Start frame" : "Aset referensi"}</p>
                </div>
              )}

              {/* Selected Characters */}
              {mergedCharacters.map((char) => {
                const isFromPrompt = connectedCharacters.some(c => c.characterRefId === char.characterRefId)
                return (
                  <div key={char.characterRefId} className="group flex h-8 items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/5 px-2 relative" title={isFromPrompt ? "Karakter dari Prompt Node" : "Karakter dari Video Node"}>
                    {char.imageUrl1 ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={char.imageUrl1} alt={char.displayName} className="h-5 w-5 rounded object-cover" />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/20">
                        <UsersIcon className="h-3 w-3 text-violet-400" />
                      </div>
                    )}
                    <span className="text-[10px] font-medium text-violet-300 max-w-[50px] truncate">{char.displayName}</span>
                    {!isFromPrompt && (
                      <button onClick={(e) => { e.stopPropagation(); removeCharacter(char.characterRefId) }}
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow-sm z-20">
                        <XIcon className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Prompt input */}
          <div className="space-y-1.5">
            <button
              onClick={e => { e.stopPropagation(); openCharacterPicker() }}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-[10px] font-medium text-violet-400 hover:text-violet-300 transition disabled:opacity-30"
            >
              <UsersIcon className="h-3 w-3" />
              Character
            </button>

            <div className="relative">
              <input type="text"
                value={connectedPrompt || localPrompt}
                onChange={e => { if (!connectedPrompt) setLocalPrompt(e.target.value) }}
                placeholder={connectedPrompt ? "Prompt dari node..." : "Describe the video..."}
                disabled={isGenerating} readOnly={!!connectedPrompt}
                className="w-full rounded-xl border border-border bg-muted/20 pl-3 pr-9 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 disabled:opacity-50" />
              <button onClick={handleGenerate} disabled={isGenerating}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-30">
                {isGenerating ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PlayIcon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1.5 mt-1.5">
              <XCircleIcon className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400 leading-tight">{error}</p>
            </div>
          )}
        </NodeShell>

        {/* Floating Settings bar (Model, Aspect Ratio & Duration) */}
        <div className="flex items-center justify-center mt-1.5">
          <div className="flex items-center gap-2 rounded-full bg-card border border-border/50 shadow-sm px-3 py-1.5 flex-wrap">
            <select
              value={(nd.model as string) || DEFAULTS.videoModel}
              onChange={e => updateNodeData(nodeId, { model: e.target.value })}
              disabled={isGenerating}
              className="bg-transparent text-xs font-medium text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {VIDEO_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-1">
              <MonitorIcon className="h-3 w-3 text-muted-foreground" />
              <select
                value={(nd.aspectRatio as string) || DEFAULTS.videoAspectRatio}
                onChange={e => updateNodeData(nodeId, { aspectRatio: e.target.value })}
                disabled={isGenerating}
                className="bg-transparent text-xs text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                {VIDEO_ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
              </select>
            </div>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
              {(["4s", "6s", "8s", "10s"] as const).map(d => (
                <button key={d} onClick={() => updateNodeData(nodeId, { duration: d })}
                  disabled={isGenerating || (nd.model !== "omni-flash" && d === "10s")}
                  className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-medium transition",
                    ((nd.duration as string) || DEFAULTS.videoDuration) === d ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                    (nd.model !== "omni-flash" && d === "10s") && "opacity-30 cursor-not-allowed")}
                  title={(nd.model !== "omni-flash" && d === "10s") ? "Hanya untuk Omni Flash" : ""}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Popup */}
      {previewOpen && generatedVideoUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
          <div className="relative flex flex-col items-center gap-3 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewOpen(false)} className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition shadow-lg">
              <XIcon className="h-3.5 w-3.5" />
            </button>
            <video src={generatedVideoUrl} controls autoPlay className="w-full rounded-xl shadow-2xl max-h-[60vh]" />
            <div className="flex items-center gap-2">
              <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95">
                <DownloadIcon className="h-3.5 w-3.5" /> Download
              </button>
              <button onClick={handleSaveGallery} disabled={savingGallery} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50">
                {savingGallery ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <FolderPlusIcon className="h-3.5 w-3.5" />} Gallery
              </button>
            </div>
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
