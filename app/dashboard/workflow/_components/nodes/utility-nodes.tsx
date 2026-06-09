"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Handle, Position, useReactFlow, useEdges } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import {
  VideoIcon, ImageIcon, LayoutGridIcon, Loader2Icon, PlayIcon,
  RefreshCwIcon, XIcon, UploadIcon, ScissorsIcon, UserIcon,
  SlidersHorizontalIcon, MicIcon, Volume2Icon, FileTextIcon,
  CheckCircle2Icon, AlertCircleIcon, MoreHorizontalIcon, PencilIcon, CopyIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NodeShell, NodeCloseBtn, HandleIcon, getPortColor } from "../node-shell"
import { useConnectedValue } from "../use-connected-value"
import { DEFAULTS, toDurationSeconds } from "../node-defaults"

/* ─── Extend Video Node ─── */
export function ExtendVideoNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Read connected values
  const connectedPrompt = useConnectedValue("prompt") as string | null
  const connectedVideo = useConnectedValue("video") as string | null
  const connectedMediaId = useConnectedValue("video", "_videoMediaId") as string | null
  const connectedMediaIdAlt = useConnectedValue("video", "mediaGenerationId") as string | null
  const mediaId = connectedMediaId || connectedMediaIdAlt || (nd._sourceMediaId as string) || null

  // Check if edges exist (separate from data)
  const edges = useEdges()
  const hasVideoEdge = edges.some(e => e.target === nodeId && e.targetHandle === "video")
  const hasPromptEdge = edges.some(e => e.target === nodeId && e.targetHandle === "prompt")

  // Determine effective prompt: connected prompt overrides local
  const effectivePrompt = connectedPrompt || (nd._extendPrompt as string) || ""

  const resultUrl = nd._resultUrl as string | undefined

  const handleExtend = async () => {
    if (!mediaId) { setError("Video belum di-generate. Generate video dulu, lalu extend."); return }
    const prompt = effectivePrompt.trim() || "Continue the video naturally with smooth motion"

    setIsProcessing(true); setError(null); setElapsed(0)
    updateNodeData(nodeId, { status: "running", _resultUrl: undefined, _resultMediaId: undefined })
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const { extendVideo } = await import("@/lib/api/google-flow")
      const result = await extendVideo({
        mediaGenerationId: mediaId,
        prompt,
        model: (nd.extendModel as "veo-3.1-lite-low-priority") || undefined,
      })

      const vid = result.videos[0]
      updateNodeData(nodeId, {
        status: "done",
        selectedVideo: vid?.url || "",
        _resultUrl: vid?.url || "",
        _rawVideoUrl: vid?.rawUrl || "",
        _resultMediaId: vid?.mediaGenerationId || "",
        _videoMediaId: vid?.mediaGenerationId || "",
        mediaGenerationId: vid?.mediaGenerationId || "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal extend video")
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsProcessing(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Extend Video" icon="🔄" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        {/* Input: Prompt (pink) */}
        <Handle type="target" position={Position.Left} id="prompt"
          className="!border-[4px] !border-[#f472b6] !left-[-8px]"
          style={{ width: 16, height: 16, background: "var(--card)", top: "25%", zIndex: 10 }} />
        {/* Input: Video (cyan) */}
        <Handle type="target" position={Position.Left} id="video"
          className="!border-[4px] !border-[#06b6d4] !left-[-8px]"
          style={{ width: 16, height: 16, background: "var(--card)", top: "55%", zIndex: 10 }} />
        {/* Output: Extended Video (cyan) */}
        <Handle type="source" position={Position.Right} id="selectedVideo"
          className="!border-[4px] !border-[#06b6d4] !right-[-8px]"
          style={{ width: 16, height: 16, background: "var(--card)", top: "40%", zIndex: 10 }} />

        {/* Preview */}
        <div className="relative w-full aspect-video rounded-xl border border-border bg-muted/20 overflow-hidden mb-2">
          {resultUrl ? <video src={resultUrl} className="w-full h-full object-cover" muted controls />
            : isProcessing ? <div className="flex flex-col items-center justify-center h-full gap-2"><Loader2Icon className="h-6 w-6 text-cyan-400 animate-spin" /><p className="text-[10px] text-muted-foreground">Extending... {fmtTime(elapsed)}</p></div>
              : <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground/40"><RefreshCwIcon className="h-6 w-6" /><p className="text-[10px]">{mediaId ? "✅ Ready to extend" : hasVideoEdge ? "⏳ Generate video dulu" : "Connect video"}</p></div>}
        </div>

        {/* Source info */}
        {mediaId && !isProcessing && (
          <div className="flex items-center gap-1.5 rounded-lg bg-cyan-500/8 border border-cyan-500/20 px-2 py-1 mb-2">
            <VideoIcon className="h-3 w-3 text-cyan-400 shrink-0" />
            <p className="text-[9px] text-cyan-400 truncate">ID: ...{mediaId.slice(-20)}</p>
          </div>
        )}

        {/* Prompt */}
        <textarea value={connectedPrompt || (nd._extendPrompt as string) || ""} onChange={e => { if (!connectedPrompt) updateNodeData(nodeId, { _extendPrompt: e.target.value }) }} readOnly={!!connectedPrompt} placeholder={hasPromptEdge ? "Prompt dari node..." : "Deskripsi kelanjutan video..."} rows={2} className={cn("w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 resize-none mb-2", connectedPrompt && "bg-pink-500/5 border-pink-500/20")} />

        {/* Actions */}
        <div className="flex items-center gap-2 mb-1">
          <button onClick={handleExtend} disabled={isProcessing || !mediaId} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95">{isProcessing ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <PlayIcon className="h-3 w-3" />} Extend +8s</button>
        </div>
        {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      </NodeShell>
    </div>
  )
}


/* ─── Upload Node ─── */
export function UploadNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements, getNodes, setNodes } = useReactFlow()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>((nd._preview as string) || null)
  const [fileType, setFileType] = useState<"image" | "video">((nd._fileType as "image" | "video") || "image")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadedId = nd.mediaGenerationId as string | undefined
  const uploadedEmail = nd._uploadEmail as string | undefined

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const title = (nd.title as string) || "Upload Media"

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  const handleDuplicate = useCallback(() => {
    setMenuOpen(false)
    const nodes = getNodes()
    const currentNode = nodes.find(n => n.id === nodeId)
    if (!currentNode) return
    const newId = `upload_${Date.now()}`
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

  const handleFile = async (file: File) => {
    const isVideo = file.type.startsWith("video/")
    const url = URL.createObjectURL(file)
    setPreview(url)
    setFileType(isVideo ? "video" : "image")
    setUploadError(null)

    // Set blob URL immediately for preview + downstream video start-image
    updateNodeData(nodeId, {
      status: isVideo ? "done" : "uploading",
      selectedImage: isVideo ? undefined : url,
      selectedVideo: isVideo ? url : undefined,
      mediaGenerationId: undefined,
      _uploadEmail: undefined,
      _preview: url,
      _fileType: isVideo ? "video" : "image",
    })

    // For images: upload to Google Flow so mediaGenerationId is ready for reference use
    if (!isVideo) {
      setUploading(true)
      try {
        const { uploadImageAsset } = await import("@/lib/api/google-flow")
        const result = await uploadImageAsset(file)
        updateNodeData(nodeId, {
          status: "done",
          mediaGenerationId: result.mediaGenerationId,
          _uploadEmail: result.email,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload gagal"
        setUploadError(msg)
        // Keep blob URL — Image Gen node will fallback to re-uploading it
        updateNodeData(nodeId, { status: "done" })
      } finally {
        setUploading(false)
      }
    }
  }

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
          <button onClick={handleRename} className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/50 rounded-lg transition">
            <PencilIcon className="h-3 w-3" /> Rename
          </button>
          <button onClick={handleDuplicate} className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/50 rounded-lg transition">
            <CopyIcon className="h-3 w-3" /> Duplicate
          </button>
          <div className="h-px bg-border/50 my-1 mx-1" />
          <button onClick={() => { deleteElements({ nodes: [{ id: nodeId }] }); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition">
            <XIcon className="h-3 w-3" /> Hapus Node
          </button>
        </div>
      )}
    </div>
  )

  return (
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
        icon="⬆️" 
        nodeType="uploadNode" 
        status={(nd._runStatus || nd.status) as string} 
        nodeId={nodeId}
        headerActions={headerActions}
        selected={selected}
      >
        {/* ─── Right Handle: Image (Frame URL) ─── */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "30%", transform: "translateY(-50%)" }}>Image</span>
        <Handle type="source" position={Position.Right} id="selectedImage" className="!border-[4px] !border-[#34d399]" style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "30%", zIndex: 10 }} />
        
        {/* ─── Right Handle: Video (URL) ─── */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#06b6d4] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "50%", transform: "translateY(-50%)" }}>Video</span>
        <Handle type="source" position={Position.Right} id="selectedVideo" className="!border-[4px] !border-[#06b6d4]" style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "50%", zIndex: 10 }} />
        
        {/* ─── Right Handle: Asset Reference (ID) ─── */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "70%", transform: "translateY(-50%)" }}>Asset Ref</span>
        <Handle type="source" position={Position.Right} id="mediaGenerationId" className="!border-[4px] !border-[#34d399]" style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "70%", zIndex: 10 }} />

        <div
          onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className={cn("relative w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition hover:border-blue-400/50", preview ? "border-border aspect-[4/3]" : "border-border/60 py-6")}
        >
          {preview ? (
            fileType === "video"
              ? <video src={preview} className="w-full h-full object-cover" muted />
              : /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Upload" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <UploadIcon className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground text-center">Klik atau drag &amp; drop<br />gambar / video</p>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm gap-1.5">
              <Loader2Icon className="h-5 w-5 text-blue-400 animate-spin" />
              <p className="text-[10px] text-muted-foreground">Uploading..</p>
            </div>
          )}
        </div>

        {!uploading && preview && fileType === "image" && (
          <div className="mt-1.5">
            {uploadedId ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-2 py-1">
                <CheckCircle2Icon className="h-3 w-3 text-emerald-400 shrink-0" />
                <p className="text-[10px] text-emerald-400">Siap sebagai reference</p>
                {uploadedEmail && <p className="text-[9px] text-muted-foreground/50 ml-auto truncate">{uploadedEmail.split("@")[0]}@…</p>}
              </div>
            ) : uploadError ? (
              <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 px-2 py-1">
                <AlertCircleIcon className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400 leading-tight">Upload gagal — akan retry saat generate</p>
              </div>
            ) : null}
          </div>
        )}

        {preview && (
          <button
            onClick={e => {
              e.stopPropagation()
              setPreview(null); setUploadError(null)
              updateNodeData(nodeId, { status: undefined, selectedImage: undefined, selectedVideo: undefined, mediaGenerationId: undefined, _uploadEmail: undefined, _preview: null })
            }}
            className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground hover:text-foreground transition"
          >
            <XIcon className="h-3 w-3" /> Hapus
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />
      </NodeShell>
    </div>
  )
}

/* ─── Image Grid Node ─── */
export function ImageGridNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isProcessing, setIsProcessing] = useState(false)
  const connectedImages = useConnectedValue("images") as string[] | string | null
  const imgArr = Array.isArray(connectedImages) ? connectedImages : connectedImages ? [connectedImages] : []
  const layout = (nd.layout as string) || "2x2"
  const resultUrl = nd._gridResult as string | undefined
  const handleCompose = async () => {
    if (imgArr.length === 0) return; setIsProcessing(true); updateNodeData(nodeId, { status: "running" })
    try {
      const cols = layout === "1x4" ? 4 : layout === "3x3" ? 3 : 2; const rows = layout === "1x4" ? 1 : layout === "3x3" ? 3 : 2
      const cellW = 512, cellH = 512, canvas = document.createElement("canvas")
      canvas.width = cellW * cols; canvas.height = cellH * rows; const ctx = canvas.getContext("2d")!
      const images = await Promise.all(imgArr.slice(0, cols * rows).map(url => new Promise<HTMLImageElement>((res, rej) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => res(img); img.onerror = () => rej(new Error("Load failed")); img.src = url })))
      images.forEach((img, i) => { ctx.drawImage(img, (i % cols) * cellW, Math.floor(i / cols) * cellH, cellW, cellH) })
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
      updateNodeData(nodeId, { status: "done", selectedImage: dataUrl, _gridResult: dataUrl })
    } catch { updateNodeData(nodeId, { status: "error" }) } finally { setIsProcessing(false) }
  }
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Image Grid" icon="⊞" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        <HandleIcon icon={ImageIcon} side="left" title="Input: Images" /><Handle type="target" position={Position.Left} id="images" style={{ background: getPortColor("images"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={LayoutGridIcon} side="right" title="Output: Grid" /><Handle type="source" position={Position.Right} id="selectedImage" style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="relative w-full aspect-square rounded-xl border border-border bg-muted/20 overflow-hidden mb-2">
          {resultUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={resultUrl} alt="Grid" className="w-full h-full object-cover" /> : (
            <div className="grid gap-0.5 h-full p-2" style={{ gridTemplateColumns: `repeat(${layout === "1x4" ? 4 : layout === "3x3" ? 3 : 2}, 1fr)` }}>
              {Array.from({ length: layout === "1x4" ? 4 : layout === "3x3" ? 9 : 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center overflow-hidden">
                  {imgArr[i] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={imgArr[i]} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-3 w-3 text-muted-foreground/20" />}
                </div>))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={layout} onChange={e => updateNodeData(nodeId, { layout: e.target.value })} className="flex-1 rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none"><option value="2x2">2×2 Grid</option><option value="3x3">3×3 Grid</option><option value="1x4">1×4 Strip</option></select>
          <button onClick={handleCompose} disabled={isProcessing || imgArr.length === 0} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95">{isProcessing ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <LayoutGridIcon className="h-3 w-3" />} Compose</button>
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Extract Frame Node ─── */
export function ExtractFrameNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedVideo = useConnectedValue("video") as string | null
  const [timestamp, setTimestamp] = useState((nd._timestamp as number) || 0)
  const [duration, setDuration] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const frameUrl = nd._frameUrl as string | undefined
  const handleExtract = async () => {
    if (!connectedVideo) return; setIsExtracting(true); updateNodeData(nodeId, { status: "running" })
    try {
      const video = document.createElement("video"); video.crossOrigin = "anonymous"; video.src = connectedVideo
      await new Promise<void>((res, rej) => { video.onloadedmetadata = () => { setDuration(video.duration); res() }; video.onerror = () => rej(new Error("Gagal load video")) })
      video.currentTime = Math.min(timestamp, video.duration)
      await new Promise<void>(res => { video.onseeked = () => res() })
      const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL("image/png")
      updateNodeData(nodeId, { status: "done", selectedImage: dataUrl, _frameUrl: dataUrl, _timestamp: timestamp })
    } catch { updateNodeData(nodeId, { status: "error" }) } finally { setIsExtracting(false) }
  }
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Extract Frame" icon="🎞️" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        <HandleIcon icon={VideoIcon} side="left" title="Input: Video" /><Handle type="target" position={Position.Left} id="video" style={{ background: getPortColor("video"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={ImageIcon} side="right" title="Output: Frame" /><Handle type="source" position={Position.Right} id="selectedImage" style={{ background: getPortColor("selectedImage"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="relative w-full aspect-video rounded-xl border border-border bg-muted/20 overflow-hidden mb-2">
          {frameUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={frameUrl} alt="Frame" className="w-full h-full object-cover" />
            : <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground/40"><ScissorsIcon className="h-6 w-6" /><p className="text-[10px]">{connectedVideo ? "Set timestamp" : "Connect video"}</p></div>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground w-8">{timestamp.toFixed(1)}s</span><input type="range" min={0} max={Math.max(duration, 1)} step={0.1} value={timestamp} onChange={e => setTimestamp(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" /><span className="text-[10px] text-muted-foreground/50">{duration.toFixed(1)}s</span></div>
          <button onClick={handleExtract} disabled={isExtracting || !connectedVideo} className="w-full flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95">{isExtracting ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <ScissorsIcon className="h-3 w-3" />} Extract Frame</button>
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Pose Node ─── */
export function PoseNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>((nd._posePreview as string) || null)
  const connectedImage = useConnectedValue("image") as string | null
  const activeImage = preview || connectedImage
  const poses = [{ id: "standing", label: "Berdiri", prompt: "standing pose, full body" }, { id: "sitting", label: "Duduk", prompt: "sitting pose, relaxed" }, { id: "walking", label: "Berjalan", prompt: "walking pose, mid-stride" }, { id: "action", label: "Action", prompt: "dynamic action pose" }, { id: "custom", label: "Custom", prompt: "" }]
  const selectedPose = (nd.poseType as string) || "standing"
  const posePrompt = poses.find(p => p.id === selectedPose)?.prompt || ""
  const handleFile = (file: File) => { const url = URL.createObjectURL(file); setPreview(url); updateNodeData(nodeId, { status: "done", _posePreview: url, poseData: url, posePrompt }) }
  useEffect(() => {
    if (activeImage) updateNodeData(nodeId, { status: "done", poseData: activeImage, posePrompt })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPose, activeImage])
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Pose Control" icon="🧍" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        <HandleIcon icon={ImageIcon} side="left" title="Input: Image" /><Handle type="target" position={Position.Left} id="image" style={{ background: getPortColor("image"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={UserIcon} side="right" title="Output: Pose" /><Handle type="source" position={Position.Right} id="poseData" style={{ background: getPortColor("poseData"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div onClick={(e) => { e.stopPropagation(); if (!activeImage) fileRef.current?.click() }} className="relative w-full aspect-[3/4] rounded-xl border border-border bg-muted/20 overflow-hidden mb-2 cursor-pointer">
          {activeImage ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={activeImage} alt="Pose" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground/40"><UserIcon className="h-8 w-8" /><p className="text-[10px]">Upload pose image</p></div>}
        </div>
        <select value={selectedPose} onChange={e => updateNodeData(nodeId, { poseType: e.target.value })} className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none mb-1">{poses.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
        {activeImage && <button onClick={(e) => { e.stopPropagation(); setPreview(null); updateNodeData(nodeId, { status: undefined, poseData: undefined, _posePreview: null }) }} className="w-full flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground hover:text-foreground transition"><XIcon className="h-3 w-3" /> Reset</button>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />
      </NodeShell>
    </div>
  )
}

/* ─── Camera Control Node ─── */
export function CameraControlNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const movements = [{ id: "pan-lr", label: "Pan Left → Right", prompt: "camera panning smoothly from left to right" }, { id: "pan-rl", label: "Pan Right → Left", prompt: "camera panning smoothly from right to left" }, { id: "dolly-in", label: "Dolly In", prompt: "camera slowly dollying in toward the subject" }, { id: "dolly-out", label: "Dolly Out", prompt: "camera slowly dollying out from the subject" }, { id: "orbit", label: "Orbit 360°", prompt: "camera orbiting 360 degrees around the subject" }, { id: "zoom-in", label: "Zoom In", prompt: "camera zooming in on the subject" }, { id: "tilt-up", label: "Tilt Up", prompt: "camera tilting upward" }, { id: "crane", label: "Crane Shot", prompt: "cinematic crane shot rising above the scene" }, { id: "static", label: "Static", prompt: "static camera, no movement" }]
  const speeds = [{ id: "slow", label: "Lambat", mod: "very slowly" }, { id: "normal", label: "Normal", mod: "" }, { id: "fast", label: "Cepat", mod: "quickly" }]
  const movement = (nd.movement as string) || "pan-lr"; const speed = (nd.speed as string) || "normal"
  const movObj = movements.find(m => m.id === movement)!; const spdObj = speeds.find(s => s.id === speed)!
  const cameraPrompt = `${movObj.prompt}${spdObj.mod ? `, ${spdObj.mod}` : ""}`
  useEffect(() => {
    updateNodeData(nodeId, { cameraParams: cameraPrompt, status: "done" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movement, speed])
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Camera Control" icon="🎥" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        <HandleIcon icon={SlidersHorizontalIcon} side="right" title="Output: Camera Prompt" /><Handle type="source" position={Position.Right} id="cameraParams" style={{ background: getPortColor("cameraParams"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="space-y-2">
          <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Gerakan Kamera</label>
            <select value={movement} onChange={e => updateNodeData(nodeId, { movement: e.target.value })} className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none">{movements.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
          <div><label className="text-[10px] text-muted-foreground mb-0.5 block">Kecepatan</label>
            <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">{speeds.map(s => (
              <button key={s.id} onClick={() => updateNodeData(nodeId, { speed: s.id })} className={cn("flex-1 px-2 py-1 rounded-full text-[10px] font-medium transition", speed === s.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>{s.label}</button>
            ))}</div></div>
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-2 py-1.5"><p className="text-[10px] text-muted-foreground mb-0.5">Output:</p><p className="text-[10px] text-foreground/70 italic">&quot;{cameraPrompt}&quot;</p></div>
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Voice Node ─── */
export function VoiceNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>((nd._audioUrl as string) || null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream); chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: "audio/webm" }); const url = URL.createObjectURL(blob); setAudioUrl(url); updateNodeData(nodeId, { audio: url, _audioUrl: url, status: "done" }); stream.getTracks().forEach(t => t.stop()) }
      recorder.start(); mediaRef.current = recorder; setIsRecording(true); setRecordDuration(0)
      recTimerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000)
    } catch { /* mic denied */ }
  }
  const stopRecording = () => { mediaRef.current?.stop(); setIsRecording(false); if (recTimerRef.current) clearInterval(recTimerRef.current) }
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Voice" icon="🎙️" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        <HandleIcon icon={MicIcon} side="right" title="Output: Audio" /><Handle type="source" position={Position.Right} id="audio" style={{ background: getPortColor("audio"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="flex flex-col items-center gap-3 py-2">
          <button onClick={isRecording ? stopRecording : startRecording} className={cn("flex h-14 w-14 items-center justify-center rounded-full transition-all", isRecording ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30" : "bg-muted/50 border-2 border-border text-muted-foreground hover:text-foreground hover:border-blue-400/50")}>
            {isRecording ? <div className="h-4 w-4 rounded-sm bg-white" /> : <MicIcon className="h-6 w-6" />}
          </button>
          {isRecording && <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /><span className="text-xs text-red-400 font-mono">{Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, "0")}</span></div>}
          {audioUrl && !isRecording && <audio src={audioUrl} controls className="w-full h-8" />}
          <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition"><UploadIcon className="h-3 w-3" /> Upload audio</button>
        </div>
        {audioUrl && <button onClick={() => { setAudioUrl(null); updateNodeData(nodeId, { audio: undefined, _audioUrl: null, status: undefined }) }} className="w-full flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground hover:text-foreground transition mt-1"><XIcon className="h-3 w-3" /> Reset</button>}
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setAudioUrl(url); updateNodeData(nodeId, { audio: url, _audioUrl: url, status: "done" }) }; e.target.value = "" }} />
      </NodeShell>
    </div>
  )
}

/* ─── Text-to-Speech Node ─── */
export function TTSNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedPrompt = useConnectedValue("prompt") as string | null
  const [localText, setLocalText] = useState((nd._ttsText as string) || "")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const activeText = connectedPrompt || localText
  const voices = [{ id: "id-female", label: "Female — Indonesia", lang: "id-ID" }, { id: "id-male", label: "Male — Indonesia", lang: "id-ID" }, { id: "en-female", label: "Female — English", lang: "en-US" }, { id: "en-male", label: "Male — English", lang: "en-US" }]
  const selectedVoice = (nd.voice as string) || "id-female"; const voiceObj = voices.find(v => v.id === selectedVoice)!
  const handleSpeak = () => {
    if (!activeText.trim()) return; window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(activeText); u.lang = voiceObj.lang; u.rate = 1.0
    const av = window.speechSynthesis.getVoices(); const match = av.find(v => v.lang.startsWith(voiceObj.lang.split("-")[0])); if (match) u.voice = match
    u.onstart = () => setIsSpeaking(true); u.onend = () => { setIsSpeaking(false); updateNodeData(nodeId, { status: "done", audio: `tts://${selectedVoice}`, _ttsText: activeText }) }
    window.speechSynthesis.speak(u)
  }
  useEffect(() => {
    if (activeText.trim()) updateNodeData(nodeId, { audio: `tts://${selectedVoice}`, _ttsText: activeText })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeText, selectedVoice])
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Text to Speech" icon="🗣️" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        <HandleIcon icon={FileTextIcon} side="left" title="Input: Text" /><Handle type="target" position={Position.Left} id="prompt" style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={Volume2Icon} side="right" title="Output: Audio" /><Handle type="source" position={Position.Right} id="audio" style={{ background: getPortColor("audio"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="space-y-2">
          <select value={selectedVoice} onChange={e => updateNodeData(nodeId, { voice: e.target.value })} className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-xs text-foreground focus:outline-none">{voices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
          <textarea value={connectedPrompt || localText} onChange={e => { if (!connectedPrompt) { setLocalText(e.target.value); updateNodeData(nodeId, { _ttsText: e.target.value }) } }} placeholder={connectedPrompt ? "Teks dari node..." : "Ketik teks..."} readOnly={!!connectedPrompt} rows={3} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none" />
          <button onClick={isSpeaking ? () => { window.speechSynthesis.cancel(); setIsSpeaking(false) } : handleSpeak} disabled={!activeText.trim()} className={cn("w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-40", isSpeaking ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm hover:shadow-md")}>
            {isSpeaking ? <><div className="h-3 w-3 rounded-sm bg-red-400" /> Stop</> : <><Volume2Icon className="h-3.5 w-3.5" /> Play Preview</>}
          </button>
          <p className="text-[10px] text-muted-foreground/50 text-center">{activeText.length} karakter</p>
        </div>
      </NodeShell>
    </div>
  )
}
