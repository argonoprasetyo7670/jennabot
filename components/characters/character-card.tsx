"use client"

import Image from "next/image"
import { ImageIcon, MicIcon, Trash2Icon, Loader2Icon } from "lucide-react"

interface CharacterCardProps {
  character: {
    id: string
    characterRefId: string
    displayName: string
    personalityNotes?: string | null
    imageRef1: string
    imageRef2?: string | null
    imageUrl1?: string | null
    imageUrl2?: string | null
    voiceType?: string | null
    voiceValue?: string | null
  }
  index?: number
  deleting?: boolean
  onDelete?: () => void
}

function ImageSlot({ url, label, gradient }: { url?: string | null; label: string; gradient: string }) {
  return (
    <div className="relative flex-1 overflow-hidden">
      {url ? (
        <Image src={url} alt={label} fill className="object-cover" unoptimized />
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground/30" /></div>
          <div className={`absolute inset-0 ${gradient}`} />
        </>
      )}
      <div className="absolute bottom-2 left-2">
        <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">{label}</span>
      </div>
    </div>
  )
}

export function CharacterCard({ character, index = 0, deleting, onDelete }: CharacterCardProps) {
  const voiceLabel = character.voiceType === "system"
    ? character.voiceValue
    : character.voiceType === "custom" ? "Custom Voice" : null

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card/50 transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      {/* Reference images */}
      <div className="flex gap-0.5 h-36 bg-muted/30">
        <ImageSlot url={character.imageUrl1} label="Ref 1" gradient="bg-gradient-to-br from-violet-500/20 to-blue-500/20" />
        {(character.imageRef2 || character.imageUrl2) && (
          <ImageSlot url={character.imageUrl2} label="Ref 2" gradient="bg-gradient-to-br from-blue-500/20 to-cyan-500/20" />
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 border-t border-border/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{character.displayName}</h4>
            {character.personalityNotes && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{character.personalityNotes}</p>
            )}
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
            >
              {deleting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <Trash2Icon className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mt-2">
          <span className="flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-400">
            <ImageIcon className="h-2.5 w-2.5" />{character.imageRef2 ? "2 refs" : "1 ref"}
          </span>
          {voiceLabel && (
            <span className="flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">
              <MicIcon className="h-2.5 w-2.5" />{voiceLabel}
            </span>
          )}
        </div>

        {/* Copyable ID
        <button
          onClick={() => navigator.clipboard.writeText(character.characterRefId)}
          className="mt-2 w-full rounded-lg bg-muted/40 px-2 py-1 text-[9px] text-muted-foreground/60 truncate text-left hover:bg-muted transition font-mono"
          title="Klik untuk copy Character ID"
        >
          {character.characterRefId.length > 50 ? character.characterRefId.slice(0, 50) + "..." : character.characterRefId}
        </button> */}
      </div>
    </div>
  )
}

