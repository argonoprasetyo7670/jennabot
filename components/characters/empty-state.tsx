"use client"

import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  onAction: () => void
  actionLabel: string
  compact?: boolean
}

export function EmptyState({ icon, title, description, onAction, actionLabel, compact }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 animate-fade-up", compact ? "py-12" : "py-32")}>
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20">
          {icon}
        </div>
        <div className="absolute -inset-4 rounded-3xl bg-violet-500/5 blur-xl -z-10" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/80">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      </div>
      <Button onClick={onAction} className="gap-1.5 bg-violet-600 text-white hover:bg-violet-500" size="sm">
        <PlusIcon className="h-3.5 w-3.5" />
        {actionLabel}
      </Button>
    </div>
  )
}
