"use client"

/**
 * TemplateSelection — Grid of template cards for user to pick one.
 */

import { cn } from "@/lib/utils"
import { VIDEO_TEMPLATES, type TemplateRegistryEntry } from "@/lib/templates"

interface TemplateSelectionProps {
  onSelect: (entry: TemplateRegistryEntry) => void
}

const COLOR_CLASSES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  violet: { border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-400", glow: "hover:shadow-violet-500/20" },
  pink: { border: "border-pink-500/30", bg: "bg-pink-500/10", text: "text-pink-400", glow: "hover:shadow-pink-500/20" },
  blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", glow: "hover:shadow-blue-500/20" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", glow: "hover:shadow-amber-500/20" },
  rose: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-400", glow: "hover:shadow-rose-500/20" },
  slate: { border: "border-slate-400/30", bg: "bg-slate-400/10", text: "text-slate-300", glow: "hover:shadow-slate-400/20" },
  cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "hover:shadow-cyan-500/20" },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "hover:shadow-emerald-500/20" },
  indigo: { border: "border-indigo-500/30", bg: "bg-indigo-500/10", text: "text-indigo-400", glow: "hover:shadow-indigo-500/20" },
  orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", glow: "hover:shadow-orange-500/20" },
}

export function TemplateSelection({ onSelect }: TemplateSelectionProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">Pilih Template Video</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pilih kategori produk untuk mendapatkan 5 scene video promosi yang konsisten
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {VIDEO_TEMPLATES.map((entry) => {
          const c = COLOR_CLASSES[entry.color] || COLOR_CLASSES.violet
          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className={cn(
                "group flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all duration-200",
                "hover:scale-[1.03] hover:shadow-lg",
                c.border, c.glow,
                "bg-card/50 backdrop-blur-sm"
              )}
            >
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110", c.bg)}>
                {entry.icon}
              </div>
              <div className="text-center">
                <p className={cn("text-sm font-semibold", c.text)}>{entry.name}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/70">{entry.description}</p>
              </div>
              <span className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                {entry.category}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
