"use client"

/**
 * TemplateForm — Left column: image uploads, option selectors, dialogue editors, backsound toggle, generate button.
 * Option selectors (Pose, Action, Language) mirror review-product for consistent UX.
 */

import { ArrowLeftIcon, UserIcon, ImageIcon, PackageIcon, Loader2Icon, SendIcon, Volume2Icon, VolumeXIcon, PenLineIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { CREDIT_COST_IMAGE, CREDIT_COST_VIDEO } from "@/contexts/generation-queue"
import { POSES, ACTIONS, LANGUAGES } from "../hooks/use-template-state"
import type { TemplateRegistryEntry } from "@/lib/templates"
import type { RefImage } from "../types"
import { ImageUploadCard } from "./image-upload-card"

interface TemplateFormProps {
  template: TemplateRegistryEntry
  // Images
  modelImage: RefImage | null
  productImage: RefImage | null
  backgroundImage: RefImage | null
  onModelImage: (img: RefImage | null) => void
  onProductImage: (img: RefImage | null) => void
  onBackgroundImage: (img: RefImage | null) => void
  // Option selectors
  selectedPose: string | null
  onPoseChange: (id: string | null) => void
  selectedAction: string | null
  onActionChange: (id: string | null) => void
  selectedLang: string
  onLangChange: (id: string) => void
  // Dialogues
  dialogues: string[]
  onUpdateDialogue: (index: number, value: string) => void
  // Custom Prompt
  customPrompt: string
  onCustomPromptChange: (value: string) => void
  // Backsound
  backsound: boolean
  onToggleBacksound: () => void
  // Generation
  allImagesReady: boolean
  isGenerating: boolean
  currentScene: number
  progress: string
  onGenerate: () => void
  onBack: () => void
}

export function TemplateForm({
  template,
  modelImage, productImage, backgroundImage,
  onModelImage, onProductImage, onBackgroundImage,
  selectedPose, onPoseChange,
  selectedAction, onActionChange,
  selectedLang, onLangChange,
  dialogues, onUpdateDialogue,
  customPrompt, onCustomPromptChange,
  backsound, onToggleBacksound,
  allImagesReady, isGenerating, currentScene, progress,
  onGenerate, onBack,
}: TemplateFormProps) {
  const sceneCount = template.template.scenes.length
  const totalCost = sceneCount * (CREDIT_COST_IMAGE + CREDIT_COST_VIDEO)

  return (
    <div className="space-y-6">
      {/* Back Button + Template Info */}
      <div>
        <button onClick={onBack} disabled={isGenerating}
          className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
          <ArrowLeftIcon className="h-3.5 w-3.5" /> Pilih template lain
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{template.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-foreground">{template.name}</h2>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </div>
        </div>
      </div>

      {/* Image Uploads */}
      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          📸 Upload Gambar Referensi
        </label>
        <div className="grid grid-cols-3 gap-3">
          <ImageUploadCard
            label="Model / Talent"
            icon={<UserIcon className="h-6 w-6" />}
            color="violet"
            image={modelImage}
            onImageSet={(img) => onModelImage(img)}
            onImageClear={() => onModelImage(null)}
            disabled={isGenerating}
          />
          <ImageUploadCard
            label="Produk"
            icon={<PackageIcon className="h-6 w-6" />}
            color="amber"
            image={productImage}
            onImageSet={(img) => onProductImage(img)}
            onImageClear={() => onProductImage(null)}
            disabled={isGenerating}
          />
          <ImageUploadCard
            label="Background"
            icon={<ImageIcon className="h-6 w-6" />}
            color="blue"
            image={backgroundImage}
            onImageSet={(img) => onBackgroundImage(img)}
            onImageClear={() => onBackgroundImage(null)}
            disabled={isGenerating}
          />
        </div>
      </div>

      {/* Option Selectors (same as review-product) */}
      <div className="space-y-4">
        {/* Pose */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🧍 Pose</label>
          <div className="flex flex-wrap gap-2">
            {POSES.map((pose) => (
              <button key={pose.id} onClick={() => onPoseChange(selectedPose === pose.id ? null : pose.id)}
                disabled={isGenerating}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  selectedPose === pose.id ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                {pose.label}
              </button>
            ))}
          </div>
        </div>
        {/* Aksi */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🤲 Aksi</label>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((act) => (
              <button key={act.id} onClick={() => onActionChange(selectedAction === act.id ? null : act.id)}
                disabled={isGenerating}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  selectedAction === act.id ? "border-amber-500 bg-amber-500/20 text-amber-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                {act.label}
              </button>
            ))}
          </div>
        </div>
        {/* Bahasa */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🌐 Bahasa</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button key={lang.id} onClick={() => onLangChange(lang.id)}
                disabled={isGenerating}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  selectedLang === lang.id ? "border-green-500 bg-green-500/20 text-green-300" : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:bg-muted/50")}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instruksi Tambahan */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <PenLineIcon className="mr-1 inline h-3.5 w-3.5" />
          Instruksi Tambahan <span className="font-normal">(opsional)</span>
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          disabled={isGenerating}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-card/50 px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          placeholder="Contoh: Model memakai gamis hijau emerald, gaya TikTok, fokus detail produk..."
        />
      </div>

      {/* Dialogue per Scene */}
      <div>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          💬 Dialogue per Scene
        </label>
        <div className="space-y-3">
          {template.template.scenes.map((scene, i) => (
            <div key={scene.scene} className="rounded-xl border border-border/50 bg-card/30 p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground/60">
                  {scene.scene}
                </span>
                <span className="text-xs font-medium text-foreground/70">{scene.name}</span>
              </div>
              <textarea
                value={dialogues[i] || ""}
                onChange={(e) => onUpdateDialogue(i, e.target.value)}
                disabled={isGenerating}
                rows={2}
                className="w-full resize-none rounded-lg border border-border/30 bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                placeholder={scene.defaultDialogue}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Backsound Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2">
          {backsound ? <Volume2Icon className="h-4 w-4 text-violet-400" /> : <VolumeXIcon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium text-foreground/80">Background Music</span>
        </div>
        <button onClick={onToggleBacksound} disabled={isGenerating}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            backsound ? "bg-violet-500" : "bg-muted",
          )}>
          <div className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            backsound ? "translate-x-5.5" : "translate-x-0.5"
          )} />
        </button>
      </div>

      {/* Generate Button */}
      <div className="flex flex-col items-center gap-2">
        <button onClick={onGenerate} disabled={!allImagesReady || isGenerating}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
            allImagesReady && !isGenerating
              ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              : "bg-muted text-muted-foreground/40 cursor-not-allowed"
          )}>
          {isGenerating ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin" />
              {progress || `Scene ${currentScene}/${sceneCount}...`}
            </>
          ) : (
            <>
              <SendIcon className="h-4 w-4" />
              Generate {sceneCount} Scene
            </>
          )}
        </button>
        <span className="text-[11px] text-muted-foreground">
          ±{totalCost} credits ({sceneCount} scene × {CREDIT_COST_IMAGE + CREDIT_COST_VIDEO} credits/scene)
        </span>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {template.template.scenes.map((_, i) => (
              <div key={i} className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                i < currentScene ? "bg-violet-500" : i === currentScene ? "bg-violet-500/50 animate-pulse" : "bg-muted"
              )} />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">{progress}</p>
        </div>
      )}
    </div>
  )
}
