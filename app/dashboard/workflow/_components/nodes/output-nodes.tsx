"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { ImageIcon, Loader2Icon, RefreshCwIcon, XIcon, DownloadIcon, FolderPlusIcon } from "lucide-react"
import { downloadImage, downloadVideo } from "@/lib/download"
import { NodeShell, HandleIcon, getPortColor } from "../node-shell"
import { useConnectedValue } from "../use-connected-value"
import { saveToGallery, isVideoUrl } from "../actions/gallery"

/* ─── Gallery (Save) Node ─── */
export function GalleryNodeComponent({ data, id: nodeId }: NodeProps) {
  const connectedMedia = useConnectedValue("media") as string | null
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">("idle")
  const { updateNodeData } = useReactFlow()
  const prevMediaRef = useRef<string | null>(null)

  const handleSave = useCallback(async (url: string) => {
    if (url.startsWith("blob:")) {
      setSaveStatus("error")
      updateNodeData(nodeId, { status: "error" })
      alert("Tidak dapat menyimpan video hasil lokal (seperti Concat) ke Gallery. Silakan download langsung.")
      return
    }

    setSaveStatus("saving")
    updateNodeData(nodeId, { status: "running" })
    try {
      await saveToGallery({ url, prompt: "Workflow auto-save" })
      setSaveStatus("done"); updateNodeData(nodeId, { status: "done" })
    } catch {
      setSaveStatus("error"); updateNodeData(nodeId, { status: "error" })
    }
  }, [nodeId, updateNodeData])

  useEffect(() => {
    if (connectedMedia && connectedMedia !== prevMediaRef.current) {
      prevMediaRef.current = connectedMedia
      handleSave(connectedMedia)
    }
  }, [connectedMedia, handleSave])

  const mediaPreview = connectedMedia || (data.media as string | undefined)
  const isVideo = mediaPreview ? isVideoUrl(mediaPreview) : false

  return (
    <NodeShell label="Save to Gallery" icon="💾" nodeType="galleryNode" status={(data._runStatus || data.status) as string}>
      <HandleIcon icon={ImageIcon} side="left" title="Input: Media" />
      <Handle type="target" position={Position.Left} id="media"
        style={{ background: getPortColor("media"), width: 10, height: 10, border: "2px solid var(--background)" }} />
      <div className="py-2">
        {mediaPreview ? (
          <div className="rounded-lg overflow-hidden border border-border mb-2">
            {isVideo ? <video src={mediaPreview} className="w-full h-auto max-h-32 object-cover" muted />
              : /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaPreview} alt="Gallery" className="w-full h-auto max-h-32 object-cover" />}
          </div>
        ) : null}
        <div className="text-center">
          {saveStatus === "saving" ? <p className="text-[11px] text-blue-400 flex items-center justify-center gap-1"><Loader2Icon className="h-3 w-3 animate-spin" /> Menyimpan...</p>
            : saveStatus === "done" ? <p className="text-[11px] text-emerald-400">✅ Tersimpan di Gallery</p>
              : saveStatus === "error" ? <p className="text-[11px] text-red-400">❌ Gagal menyimpan</p>
                : <p className="text-muted-foreground text-[11px]">Simpan hasil ke Gallery</p>}
        </div>
        {saveStatus === "error" && connectedMedia && (
          <button onClick={() => handleSave(connectedMedia)} className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] text-muted-foreground hover:text-foreground transition">
            <RefreshCwIcon className="h-3 w-3" /> Coba lagi
          </button>
        )}
      </div>
    </NodeShell>
  )
}

/* ─── Output / Preview Node ─── */
export function OutputNodeComponent({ data }: NodeProps) {
  const connectedMedia = useConnectedValue("media") as string | null
  const mediaUrl = connectedMedia || (data.media as string | undefined)
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false
  const [previewOpen, setPreviewOpen] = useState(false)
  const [savingGallery, setSavingGallery] = useState(false)

  const handleSaveToGallery = async (url: string) => {
    if (url.startsWith("blob:")) {
      alert("Tidak dapat menyimpan video hasil lokal (seperti Concat) ke Gallery. Silakan download langsung.")
      return
    }
    setSavingGallery(true)
    try {
      await saveToGallery({ url, prompt: "Workflow output preview" })
      alert("Berhasil disimpan ke gallery")
    } catch {
      alert("Gagal menyimpan ke gallery")
    } finally {
      setSavingGallery(false)
    }
  }

  return (
    <>
      <NodeShell label="Output" icon="👁️" nodeType="outputNode" status={(data._runStatus as string) || (mediaUrl ? "done" : (data.status as string))}>
        <HandleIcon icon={ImageIcon} side="left" title="Input: Media" />
        <Handle type="target" position={Position.Left} id="media"
          style={{ background: getPortColor("media"), width: 10, height: 10, border: "2px solid var(--background)" }} />
        <div className="text-center py-2">
          {mediaUrl ? (
            <div className="rounded-lg overflow-hidden border border-border cursor-pointer hover:border-blue-400/30 transition" onClick={() => setPreviewOpen(true)}>
              {isVideo ? <video src={mediaUrl} className="w-full h-auto max-h-40 object-cover" muted />
                : /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl} alt="Output" className="w-full h-auto max-h-40 object-cover" />}
            </div>
          ) : <p className="text-muted-foreground text-[11px]">Preview hasil akhir</p>}
        </div>
      </NodeShell>
      {previewOpen && mediaUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
          <div className="relative flex flex-col items-center gap-3 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewOpen(false)} className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition shadow-lg"><XIcon className="h-3.5 w-3.5" /></button>
            {isVideo ? <video src={mediaUrl} controls autoPlay className="w-full rounded-xl shadow-2xl max-h-[60vh]" />
              : /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl} alt="Preview" className="w-full rounded-xl object-contain shadow-2xl max-h-[60vh]" />}
            <div className="flex items-center gap-2">
              <button onClick={() => { if (isVideo) downloadVideo(mediaUrl, "workflow-output.mp4"); else downloadImage(mediaUrl, "workflow-output.png") }}
                className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition active:scale-95">
                <DownloadIcon className="h-3.5 w-3.5" /> Download
              </button>
              <button onClick={() => handleSaveToGallery(mediaUrl)} disabled={savingGallery}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50">
                {savingGallery ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <FolderPlusIcon className="h-3.5 w-3.5" />} Gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
