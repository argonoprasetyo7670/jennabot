"use client"

/**
 * ImageUploadCard — Upload slot with file picker and preview.
 * Supports upload from device. Gallery picker can be added later.
 */

import { useRef } from "react"
import Image from "next/image"
import { UploadCloudIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RefImage } from "../types"

interface ImageUploadCardProps {
  label: string
  icon: React.ReactNode
  color: "violet" | "blue" | "amber"
  image: RefImage | null
  onImageSet: (img: RefImage) => void
  onImageClear: () => void
  disabled?: boolean
}

const COLOR_MAP = {
  violet: { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/30" },
  blue: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/30" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/30" },
}

export function ImageUploadCard({ label, icon, color, image, onImageSet, onImageClear, disabled }: ImageUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const c = COLOR_MAP[color]

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onImageSet({ kind: "file", file, preview: URL.createObjectURL(file) })
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col items-center">
      <span className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", c.text)}>{label}</span>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} disabled={disabled} />

      {image ? (
        <div className={cn("group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2", c.border, c.ring, "ring-1")}>
          <Image src={image.preview} alt={label} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
            <button onClick={() => { if (!disabled) inputRef.current?.click() }} disabled={disabled}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-xs text-white backdrop-blur-sm hover:bg-white/30">
              <UploadCloudIcon className="h-3.5 w-3.5" /> Ganti
            </button>
            <button onClick={() => { if (!disabled) onImageClear() }} disabled={disabled}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/30 text-white backdrop-blur-sm hover:bg-red-500/50">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={disabled}
          className={cn("flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all hover:scale-[1.02]", c.border, "bg-card/50", disabled && "opacity-50 cursor-not-allowed")}>
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", c.bg, c.text)}>{icon}</div>
          <p className="text-xs font-medium text-foreground/70">Upload {label}</p>
        </button>
      )}
    </div>
  )
}
