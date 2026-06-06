"use client"

import { useState } from "react"
import { SendIcon } from "lucide-react"
import type { NodeTypes } from "@xyflow/react"
import {
  FileTextIcon, ImageIcon, VideoIcon, RefreshCwIcon, UploadIcon,
  LayoutGridIcon, ScissorsIcon, UserIcon, SlidersHorizontalIcon, MicIcon, Volume2Icon,
} from "lucide-react"
import { PromptNodeComponent } from "./nodes/prompt-node"
import { ImageGenNodeComponent } from "./nodes/image-gen-node"
import { VideoGenNodeComponent } from "./nodes/video-gen-node"
import { GalleryNodeComponent, OutputNodeComponent } from "./nodes/output-nodes"
import {
  ExtendVideoNodeComponent, UploadNodeComponent, ImageGridNodeComponent,
  ExtractFrameNodeComponent, PoseNodeComponent, CameraControlNodeComponent,
  VoiceNodeComponent, TTSNodeComponent,
} from "./nodes/utility-nodes"

/* ─── Node Type Registry ─── */
export const nodeTypes: NodeTypes = {
  promptNode: PromptNodeComponent,
  imageGenNode: ImageGenNodeComponent,
  videoGenNode: VideoGenNodeComponent,
  galleryNode: GalleryNodeComponent,
  outputNode: OutputNodeComponent,
  extendVideoNode: ExtendVideoNodeComponent,
  uploadNode: UploadNodeComponent,
  imageGridNode: ImageGridNodeComponent,
  extractFrameNode: ExtractFrameNodeComponent,
  poseNode: PoseNodeComponent,
  cameraControlNode: CameraControlNodeComponent,
  voiceNode: VoiceNodeComponent,
  ttsNode: TTSNodeComponent,
}

/* ─── Palette items ─── */
export const PALETTE_ITEMS = [
  { type: "promptNode", label: "Prompt", Icon: FileTextIcon },
  { type: "imageGenNode", label: "Image", Icon: ImageIcon },
  { type: "videoGenNode", label: "Video", Icon: VideoIcon },
  { type: "extendVideoNode", label: "Extend", Icon: RefreshCwIcon },
  { type: "uploadNode", label: "Upload", Icon: UploadIcon },
  { type: "imageGridNode", label: "Image Grid", Icon: LayoutGridIcon },
  { type: "extractFrameNode", label: "Extract Frame", Icon: ScissorsIcon },
  { type: "poseNode", label: "Pose", Icon: UserIcon },
  { type: "cameraControlNode", label: "Camera", Icon: SlidersHorizontalIcon },
  { type: "voiceNode", label: "Voice", Icon: MicIcon },
  { type: "ttsNode", label: "TTS", Icon: Volume2Icon },
]

/* ─── Agent Input Box ─── */
export function AgentInputBox({ onSend, disabled }: { onSend: (msg: string) => void; disabled: boolean }) {
  const [value, setValue] = useState("")
  const handleSend = () => {
    const msg = value.trim()
    if (!msg || disabled) return
    setValue("")
    onSend(msg)
  }
  return (
    <div className="flex items-end gap-1.5">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        placeholder="Ketik perintah..."
        rows={1}
        disabled={disabled}
        className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none disabled:opacity-50"
      />
      <button onClick={handleSend} disabled={disabled || !value.trim()}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition shrink-0 active:scale-95 disabled:opacity-40">
        <SendIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
