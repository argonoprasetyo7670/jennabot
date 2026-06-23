"use client"

import { useState } from "react"
import { SendIcon } from "lucide-react"
import type { NodeTypes } from "@xyflow/react"
import {
  FileTextIcon, ImageIcon, VideoIcon, RefreshCwIcon, UploadIcon,
  LayoutGridIcon, ScissorsIcon, UserIcon, SlidersHorizontalIcon, MicIcon, Volume2Icon,
  FolderPlusIcon, LinkIcon, GitBranchIcon, RepeatIcon, TimerIcon, FilterIcon,
  GitMergeIcon, VariableIcon, StickyNoteIcon, SparklesIcon, SplitIcon
} from "lucide-react"
import { PromptNodeComponent } from "./nodes/prompt-node"
import { ImageGenNodeComponent } from "./nodes/image-gen-node"
import { VideoGenNodeComponent } from "./nodes/video-gen-node"
import { GalleryNodeComponent, OutputNodeComponent } from "./nodes/output-nodes"
import {
  ExtendVideoNodeComponent, UploadNodeComponent, ImageGridNodeComponent,
  ExtractFrameNodeComponent, PoseNodeComponent, CameraControlNodeComponent,
  VoiceNodeComponent, TTSNodeComponent, ConcatenateNodeComponent,
} from "./nodes/utility-nodes"
import {
  IfElseNodeComponent, LoopNodeComponent, DelayNodeComponent, FilterNodeComponent,
  MergeNodeComponent, SetVariableNodeComponent, NoteNodeComponent, TextSplitterNodeComponent,
  GeminiNodeComponent
} from "./nodes/logic-nodes"

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
  concatNode: ConcatenateNodeComponent,
  ifElseNode: IfElseNodeComponent,
  loopNode: LoopNodeComponent,
  delayNode: DelayNodeComponent,
  filterNode: FilterNodeComponent,
  mergeNode: MergeNodeComponent,
  setVariableNode: SetVariableNodeComponent,
  noteNode: NoteNodeComponent,
  textSplitterNode: TextSplitterNodeComponent,
  geminiNode: GeminiNodeComponent,
}

/* ─── Palette items ─── */
export const PALETTE_ITEMS = [
  // Input / Basic
  { type: "promptNode", label: "Prompt", Icon: FileTextIcon, group: "Input" },
  { type: "uploadNode", label: "Upload", Icon: UploadIcon, group: "Input" },
  { type: "noteNode", label: "Note", Icon: StickyNoteIcon, group: "Input" },
  // AI Tools
  { type: "geminiNode", label: "Gemini", Icon: SparklesIcon, group: "AI" },
  { type: "imageGenNode", label: "Image", Icon: ImageIcon, group: "AI" },
  { type: "videoGenNode", label: "Video", Icon: VideoIcon, group: "AI" },
  { type: "ttsNode", label: "TTS", Icon: Volume2Icon, group: "AI" },
  // Utility / Media
  { type: "imageGridNode", label: "Image Grid", Icon: LayoutGridIcon, group: "Media" },
  { type: "extendVideoNode", label: "Extend", Icon: RefreshCwIcon, group: "Media" },
  { type: "concatNode", label: "Concat Video", Icon: LinkIcon, group: "Media" },
  { type: "poseNode", label: "Pose", Icon: UserIcon, group: "Media" },
  { type: "cameraControlNode", label: "Camera", Icon: SlidersHorizontalIcon, group: "Media" },
  { type: "voiceNode", label: "Voice", Icon: MicIcon, group: "Media" },
  // Logic & Flow
  { type: "ifElseNode", label: "If / Else", Icon: GitBranchIcon, group: "Logic" },
  { type: "loopNode", label: "Loop", Icon: RepeatIcon, group: "Logic" },
  { type: "filterNode", label: "Filter", Icon: FilterIcon, group: "Logic" },
  { type: "mergeNode", label: "Merge", Icon: GitMergeIcon, group: "Logic" },
  { type: "delayNode", label: "Delay", Icon: TimerIcon, group: "Logic" },
  { type: "textSplitterNode", label: "Splitter", Icon: SplitIcon, group: "Logic" },
  { type: "setVariableNode", label: "Variable", Icon: VariableIcon, group: "Logic" },
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
