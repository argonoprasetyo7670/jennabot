"use client"

import { PlayIcon, PauseIcon, Trash2Icon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VoiceInfo } from "@/components/characters/voice-data"

interface VoiceCardProps {
  voice: {
    id: string
    voiceRefId: string
    displayName: string
    baseVoice: string
    dialog: string
    voicePerformance: string
    audioUrl?: string | null
  }
  voiceInfo?: VoiceInfo
  index?: number
  playing?: boolean
  deleting?: boolean
  onPlay?: () => void
  onDelete?: () => void
}

export function VoiceCard({ voice, voiceInfo, index = 0, playing, deleting, onPlay, onDelete }: VoiceCardProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 animate-fade-up",
        playing ? "border-violet-500/50 bg-violet-500/5" : "border-border bg-card/50 hover:border-violet-500/30"
      )}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      {/* Play button */}
      <button
        onClick={onPlay}
        disabled={!voice.audioUrl}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
          playing ? "bg-violet-500 text-white" : "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20",
          !voice.audioUrl && "opacity-30 cursor-not-allowed"
        )}
      >
        {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-medium text-foreground truncate">{voice.displayName}</h4>
          {voiceInfo && (
            <span className={cn(
              "shrink-0 rounded px-1 py-0.5 text-[8px] font-bold",
              voiceInfo.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400"
            )}>
              {voiceInfo.gender === "female" ? "♀" : "♂"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-violet-400 font-medium">{voice.baseVoice}</span>
          <span className="text-[10px] text-muted-foreground/50">•</span>
          <span className="text-[10px] text-muted-foreground truncate">&ldquo;{voice.dialog}&rdquo;</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate italic">{voice.voicePerformance}</p>
      </div>

      {/* Delete */}
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={deleting}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
        >
          {deleting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <Trash2Icon className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  )
}
