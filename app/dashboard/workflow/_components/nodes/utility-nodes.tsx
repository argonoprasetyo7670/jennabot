"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Handle, Position, useReactFlow, useEdges } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import {
  VideoIcon, ImageIcon, LayoutGridIcon, Loader2Icon, PlayIcon,
  RefreshCwIcon, XIcon, UploadIcon, ScissorsIcon, UserIcon,
  SlidersHorizontalIcon, MicIcon, Volume2Icon, FileTextIcon,
  CheckCircle2Icon, AlertCircleIcon, MoreHorizontalIcon, PencilIcon, CopyIcon,
  LinkIcon, DownloadIcon
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

/* ─── Image Grid Node (4x Gen) ─── */
export function ImageGridNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const connectedPrompt = useConnectedValue("prompt") as string | null
  const [localPrompt, setLocalPrompt] = useState((nd._localPrompt as string) || "")
  const activePrompt = connectedPrompt || localPrompt

  const resultUrl = nd._gridResult as string | undefined

  const handleGenerateAndCompose = async () => {
    if (!activePrompt.trim()) return
    setIsProcessing(true)
    updateNodeData(nodeId, { status: "running" })
    
    try {
      const { generateImages } = await import("@/lib/api/google-flow")
      // Generate 4 images
      const result = await generateImages({
        prompt: activePrompt.trim(),
        model: "nano-banana-pro",
        aspectRatio: "1:1",
        count: 4,
      })

      if (!result.images || result.images.length === 0) {
        throw new Error("Gagal generate gambar")
      }

      // We might get less than 4 if there's an issue, but let's pad them if needed
      const imgUrls = result.images.map(i => i.url)
      while (imgUrls.length < 4) imgUrls.push(imgUrls[imgUrls.length - 1] || "")

      // Canvas composition 2x2
      const cellW = 512, cellH = 512, cols = 2, rows = 2
      const canvas = document.createElement("canvas")
      canvas.width = cellW * cols; canvas.height = cellH * rows
      const ctx = canvas.getContext("2d")!

      const images = await Promise.all(imgUrls.slice(0, 4).map(url => new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => res(img)
        img.onerror = () => rej(new Error("Load failed"))
        img.src = url
      })))

      images.forEach((img, i) => { ctx.drawImage(img, (i % cols) * cellW, Math.floor(i / cols) * cellH, cellW, cellH) })
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92)

      // Optionally save the grid to gallery to get a CDN URL
      const { saveToGallery } = await import("../actions/gallery")
      try {
         const saved = await saveToGallery({ url: dataUrl, prompt: activePrompt.trim(), type: "image", model: "nano-banana-pro" })
         const finalUrl = saved.gcsUrl
         updateNodeData(nodeId, { status: "done", selectedImage: finalUrl, _gridResult: finalUrl })
      } catch (e) {
         console.error("Gallery save failed:", e)
         updateNodeData(nodeId, { status: "done", selectedImage: dataUrl, _gridResult: dataUrl })
      }

    } catch (e) { 
      console.error("Grid generation failed:", e)
      updateNodeData(nodeId, { status: "error" }) 
    } finally { 
      setIsProcessing(false) 
    }
  }

  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Grid Gen (4x)" icon="⊞" status={(nd._runStatus || nd.status) as string} nodeId={nodeId} selected={selected}>
        {/* Left Handle: Prompt (pink) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "30%", transform: "translateY(-50%)" }}>Prompt</span>
        <Handle type="target" position={Position.Left} id="prompt" className="!border-[4px] !border-[#f472b6]" style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "30%", zIndex: 10 }} />
        
        {/* Right Handle: Grid Output (green) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "50%", transform: "translateY(-50%)" }}>Grid</span>
        <Handle type="source" position={Position.Right} id="selectedImage" className="!border-[4px] !border-[#34d399]" style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "50%", zIndex: 10 }} />
        
        <div className="relative w-full aspect-square rounded-xl border border-border bg-muted/20 overflow-hidden mb-2">
          {resultUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={resultUrl} alt="Grid" className="w-full h-full object-cover" /> : (
            <div className="grid gap-0.5 h-full p-2 grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-muted/30 flex flex-col items-center justify-center overflow-hidden">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/20 mb-1" />
                  <span className="text-[9px] text-muted-foreground/40 font-medium">Img {i+1}</span>
                </div>))}
            </div>
          )}
        </div>
        
        <div className="space-y-2 mb-1">
          <textarea value={connectedPrompt || localPrompt} onChange={e => { if (!connectedPrompt) { setLocalPrompt(e.target.value); updateNodeData(nodeId, { _localPrompt: e.target.value }) } }} placeholder={connectedPrompt ? "Prompt dari node..." : "Deskripsi grid 4x gambar..."} readOnly={!!connectedPrompt} rows={2} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none" />
          <button onClick={handleGenerateAndCompose} disabled={isProcessing || !activePrompt.trim()} className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-2 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95">{isProcessing ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Generating 4x...</> : <><LayoutGridIcon className="h-3.5 w-3.5" /> Generate 2x2 Grid</>}</button>
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
interface VoiceData {
  voice_id: string
  name: string
  category: string
  labels: Record<string, string>
}
export function TTSNodeComponent({ data, id: nodeId }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedPrompt = useConnectedValue("prompt") as string | null
  const [localText, setLocalText] = useState((nd._ttsText as string) || "")
  const [isGenerating, setIsGenerating] = useState(false)
  const activeText = connectedPrompt || localText
  const [voices, setVoices] = useState<VoiceData[]>([])

  useEffect(() => {
    fetch("/api/ai/voices")
      .then(r => r.json())
      .then(d => { if (d.voices) setVoices(d.voices) })
      .catch(console.error)
  }, [])

  // Default fallback voice (Adam)
  const selectedVoice = (nd.voice as string) || "pNInz6obbf5AWCGq5RmY"

  const handleGenerate = async () => {
    if (!activeText.trim()) return
    setIsGenerating(true)
    updateNodeData(nodeId, { status: "running" })
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: activeText.trim(), voiceId: selectedVoice }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Gagal generate audio")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      updateNodeData(nodeId, { status: "done", audio: url, _audioUrl: url })
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Gagal generate audio")
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (activeText.trim()) updateNodeData(nodeId, { _ttsText: activeText, voice: selectedVoice })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeText, selectedVoice])

  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Text to Speech" icon="🗣️" status={(nd._runStatus || nd.status) as string} nodeId={nodeId}>
        <HandleIcon icon={FileTextIcon} side="left" title="Input: Text" /><Handle type="target" position={Position.Left} id="prompt" style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <HandleIcon icon={Volume2Icon} side="right" title="Output: Audio" /><Handle type="source" position={Position.Right} id="audio" style={{ background: getPortColor("audio"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="space-y-2">
          <select value={selectedVoice} onChange={e => updateNodeData(nodeId, { voice: e.target.value })} className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[10px] text-foreground focus:outline-none">
            {voices.length === 0 ? <option value={selectedVoice}>Memuat voices...</option> : voices.map(v => (
              <option key={v.voice_id} value={v.voice_id}>{v.name} ({v.labels?.accent || "Default"})</option>
            ))}
          </select>
          <textarea value={connectedPrompt || localText} onChange={e => { if (!connectedPrompt) { setLocalText(e.target.value); updateNodeData(nodeId, { _ttsText: e.target.value }) } }} placeholder={connectedPrompt ? "Teks dari node..." : "Ketik teks..."} readOnly={!!connectedPrompt} rows={3} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none" />
          <button onClick={handleGenerate} disabled={!activeText.trim() || isGenerating} className={cn("w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-40", isGenerating ? "bg-muted/50 text-muted-foreground border border-border" : "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm hover:shadow-md")} title="Generate Audio">
            {isGenerating ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><Volume2Icon className="h-3.5 w-3.5" /> Generate Audio</>}
          </button>
          <p className="text-[10px] text-muted-foreground/50 text-center">{activeText.length} karakter (membutuhkan 3 kredit)</p>
          {!!(nd._audioUrl || nd.audio) && (
            <div className="mt-3 w-full rounded-lg border border-border bg-background/50 p-2">
              <audio src={(nd._audioUrl as string) || (nd.audio as string)} controls className="h-8 w-full" />
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  )
}

/* ─── Concatenate Node ─── */
export function ConcatenateNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Try to use connected values or fallback to node state (if they somehow exist)
  const mediaId1 = useConnectedValue("video1", "mediaGenerationId") as string | null
  const mediaId2 = useConnectedValue("video2", "mediaGenerationId") as string | null
  const mediaId3 = useConnectedValue("video3", "mediaGenerationId") as string | null
  const mediaId4 = useConnectedValue("video4", "mediaGenerationId") as string | null

  // URL fallback (for preview mostly, if they pass video URL as well)
  const vidUrl1 = useConnectedValue("video1", "selectedVideo") as string | null
  const vidUrl2 = useConnectedValue("video2", "selectedVideo") as string | null
  const vidUrl3 = useConnectedValue("video3", "selectedVideo") as string | null
  const vidUrl4 = useConnectedValue("video4", "selectedVideo") as string | null

  const trimStart1 = (nd.trimStart1 as number) || 0
  const trimEnd1 = (nd.trimEnd1 as number) || 0
  const trimStart2 = (nd.trimStart2 as number) || 0
  const trimEnd2 = (nd.trimEnd2 as number) || 0
  const trimStart3 = (nd.trimStart3 as number) || 0
  const trimEnd3 = (nd.trimEnd3 as number) || 0
  const trimStart4 = (nd.trimStart4 as number) || 0
  const trimEnd4 = (nd.trimEnd4 as number) || 0

  const resultUrl = nd._resultVideoUrl as string | undefined

  const handleConcatenate = async () => {
    // Collect valid media inputs
    const inputs = []
    if (mediaId1) inputs.push({ mediaGenerationId: mediaId1, trimStart: trimStart1, trimEnd: trimEnd1 })
    if (mediaId2) inputs.push({ mediaGenerationId: mediaId2, trimStart: trimStart2, trimEnd: trimEnd2 })
    if (mediaId3) inputs.push({ mediaGenerationId: mediaId3, trimStart: trimStart3, trimEnd: trimEnd3 })
    if (mediaId4) inputs.push({ mediaGenerationId: mediaId4, trimStart: trimStart4, trimEnd: trimEnd4 })

    if (inputs.length < 2) {
      setError("Dibutuhkan minimal 2 video yang saling terhubung.")
      return
    }

    setIsProcessing(true)
    setError(null)
    updateNodeData(nodeId, { status: "running", _resultVideoUrl: undefined })

    try {
      const { concatenateVideos, downloadBase64Image } = await import("@/lib/api/google-flow")
      const result = await concatenateVideos(inputs)
      
      // Convert base64 to Blob URL
      const byteChars = atob(result.encodedVideo)
      const byteNumbers = new Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "video/mp4" })
      const url = URL.createObjectURL(blob)

      updateNodeData(nodeId, {
        status: "done",
        _resultVideoUrl: url,
        _jobId: result.jobId
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal concatenate video")
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return
    const a = document.createElement("a")
    a.href = resultUrl
    a.download = `concatenated_${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const renderSlot = (label: string, id: string, mediaId: string | null, vidUrl: string | null, trimStart: number, trimEnd: number, setterStart: string, setterEnd: string, top: string) => (
    <div className="relative mb-2 pb-2 border-b border-border/50 last:border-0 last:mb-0 last:pb-0">
      <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#06b6d4] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "10px", transform: "translateY(-50%)" }}>{label}</span>
      <Handle type="target" position={Position.Left} id={id}
        className="!border-[4px] !border-[#06b6d4]"
        style={{ width: 16, height: 16, background: "var(--card)", left: -20, top: "10px", zIndex: 10 }} />
      
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-8 h-8 rounded-md bg-muted/50 border border-border flex items-center justify-center overflow-hidden shrink-0">
          {vidUrl ? <video src={vidUrl} className="w-full h-full object-cover" muted /> : <VideoIcon className="h-3.5 w-3.5 text-muted-foreground/50" />}
        </div>
        <div className="flex flex-col overflow-hidden">
          <p className="text-[10px] font-medium text-foreground">{label}</p>
          <p className="text-[9px] text-muted-foreground truncate">{mediaId ? mediaId.slice(-12) : "Belum terhubung"}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[8px] text-muted-foreground uppercase tracking-wider block mb-0.5">Trim Start (s)</label>
          <input type="number" min={0} max={8} value={trimStart} onChange={e => updateNodeData(nodeId, { [setterStart]: Number(e.target.value) })} className="w-full bg-muted/30 border border-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex-1">
          <label className="text-[8px] text-muted-foreground uppercase tracking-wider block mb-0.5">Trim End (s)</label>
          <input type="number" min={0} max={8} value={trimEnd} onChange={e => updateNodeData(nodeId, { [setterEnd]: Number(e.target.value) })} className="w-full bg-muted/30 border border-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-blue-400" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Concatenate Video" icon="🔗" status={(nd._runStatus || nd.status) as string} nodeId={nodeId} selected={selected}>
        <div className="space-y-1 mb-3">
          {renderSlot("Video 1", "video1", mediaId1, vidUrl1, trimStart1, trimEnd1, "trimStart1", "trimEnd1", "20%")}
          {renderSlot("Video 2", "video2", mediaId2, vidUrl2, trimStart2, trimEnd2, "trimStart2", "trimEnd2", "40%")}
          {renderSlot("Video 3 (Opt)", "video3", mediaId3, vidUrl3, trimStart3, trimEnd3, "trimStart3", "trimEnd3", "60%")}
          {renderSlot("Video 4 (Opt)", "video4", mediaId4, vidUrl4, trimStart4, trimEnd4, "trimStart4", "trimEnd4", "80%")}
        </div>

        <button onClick={handleConcatenate} disabled={isProcessing} className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:shadow-md transition active:scale-95 mb-2">
          {isProcessing ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Menggabungkan...</> : <><LinkIcon className="h-3.5 w-3.5" /> Gabungkan Video</>}
        </button>

        {error && <p className="text-[10px] text-red-400 mt-1 mb-2 text-center">{error}</p>}

        {resultUrl && (
          <div className="mt-2 space-y-2">
            <div className="relative w-full aspect-video rounded-xl border border-border bg-black overflow-hidden">
              <video src={resultUrl} controls className="w-full h-full object-contain" />
            </div>
            <button onClick={handleDownload} className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-1.5 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95">
              <DownloadIcon className="h-3.5 w-3.5" /> Download MP4
            </button>
            <p className="text-[9px] text-muted-foreground text-center">Video tidak disimpan ke cloud. Harap download sebelum me-refresh halaman.</p>
          </div>
        )}
      </NodeShell>
    </div>
  )
}
