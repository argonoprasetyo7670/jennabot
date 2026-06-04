/**
 * State management hook for Video Template page.
 * Manages: template selection, reference images, dialogues, options, backsound toggle.
 *
 * Option selectors mirror review-product: Pose, Action, Language.
 */

import { useState, useCallback } from "react"
import type { RefImage, SceneResult } from "../types"
import type { TemplateRegistryEntry } from "@/lib/templates"

/* ─── Option Presets (same as review-product) ─── */
export const POSES = [
  { id: "berdiri", label: "🧍 Berdiri", prompt: "standing upright" },
  { id: "duduk", label: "🪑 Duduk", prompt: "sitting down" },
  { id: "bersandar", label: "😌 Bersandar", prompt: "leaning casually" },
  { id: "setengah-badan", label: "👤 Setengah Badan", prompt: "half-body shot, waist up" },
  { id: "closeup", label: "🔍 Close-up", prompt: "close-up framing" },
]

export const ACTIONS = [
  { id: "memegang", label: "✋ Memegang", prompt: "holding the product" },
  { id: "menunjuk", label: "👆 Menunjukkan", prompt: "pointing at and showing the product" },
  { id: "menggunakan", label: "🤲 Menggunakan", prompt: "actively using the product" },
  { id: "membuka", label: "📦 Membuka", prompt: "unboxing and opening the product" },
  { id: "membandingkan", label: "⚖️ Membandingkan", prompt: "comparing the product" },
  { id: "meletakkan", label: "📐 Meletakkan", prompt: "placing the product on the table" },
]

export const LANGUAGES = [
  { id: "id", label: "🇮🇩 Indonesia", prompt: "speaking in Indonesian (Bahasa Indonesia)" },
  { id: "en", label: "🇺🇸 English", prompt: "speaking in English" },
  { id: "ms", label: "🇲🇾 Melayu", prompt: "speaking in Malay" },
  { id: "zh", label: "🇨🇳 中文", prompt: "speaking in Chinese Mandarin" },
  { id: "ja", label: "🇯🇵 日本語", prompt: "speaking in Japanese" },
  { id: "ko", label: "🇰🇷 한국어", prompt: "speaking in Korean" },
  { id: "ar", label: "🇸🇦 العربية", prompt: "speaking in Arabic" },
]

export function useTemplateState() {
  /* Template selection */
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRegistryEntry | null>(null)

  /* Reference images: model, product, background */
  const [modelImage, setModelImage] = useState<RefImage | null>(null)
  const [productImage, setProductImage] = useState<RefImage | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<RefImage | null>(null)

  /* Per-scene dialogues (initialized from template defaults) */
  const [dialogues, setDialogues] = useState<string[]>([])

  /* Backsound toggle */
  const [backsound, setBacksound] = useState(false)

  /* Custom prompt (optional user instructions about outfit, pose, etc.) */
  const [customPrompt, setCustomPrompt] = useState("")

  /* Option selectors (same as review-product) */
  const [selectedPose, setSelectedPose] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState("id")

  /* Scene results */
  const [sceneResults, setSceneResults] = useState<SceneResult[]>([])

  /* Generation state */
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentScene, setCurrentScene] = useState(0)
  const [progress, setProgress] = useState("")

  /* Select template and initialize dialogues */
  const selectTemplate = useCallback((entry: TemplateRegistryEntry) => {
    setSelectedTemplate(entry)
    setDialogues(entry.template.scenes.map((s) => s.defaultDialogue))
    setSceneResults(
      entry.template.scenes.map((s) => ({
        scene: s.scene,
        name: s.name,
        dialogue: s.defaultDialogue,
        status: "pending" as const,
      }))
    )
  }, [])

  /* Go back to template selection */
  const clearTemplate = useCallback(() => {
    setSelectedTemplate(null)
    setDialogues([])
    setSceneResults([])
    setModelImage(null)
    setProductImage(null)
    setBackgroundImage(null)
    setCustomPrompt("")
    setSelectedPose(null)
    setSelectedAction(null)
    setSelectedLang("id")
    setIsGenerating(false)
    setCurrentScene(0)
    setProgress("")
  }, [])

  /* Update dialogue for a specific scene */
  const updateDialogue = useCallback((index: number, value: string) => {
    setDialogues((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  /* Update a scene result */
  const updateSceneResult = useCallback((index: number, updates: Partial<SceneResult>) => {
    setSceneResults((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }, [])

  /* Reset all results to pending */
  const resetResults = useCallback(() => {
    if (!selectedTemplate) return
    setSceneResults(
      selectedTemplate.template.scenes.map((s, i) => ({
        scene: s.scene,
        name: s.name,
        dialogue: dialogues[i] || s.defaultDialogue,
        status: "pending" as const,
      }))
    )
  }, [selectedTemplate, dialogues])

  /* Build combined option prompt string (for injection into generation prompts) */
  const optionPromptParts = useCallback(() => {
    const poseOpt = POSES.find((p) => p.id === selectedPose)
    const actionOpt = ACTIONS.find((a) => a.id === selectedAction)
    const langOpt = LANGUAGES.find((l) => l.id === selectedLang) || LANGUAGES[0]

    const parts: string[] = []
    if (poseOpt) parts.push(`The model is ${poseOpt.prompt}`)
    if (actionOpt) parts.push(actionOpt.prompt)
    parts.push(langOpt.prompt)

    return parts.join(", ")
  }, [selectedPose, selectedAction, selectedLang])

  /* Check if all images are uploaded */
  const allImagesReady = !!modelImage && !!productImage && !!backgroundImage

  return {
    // Template
    selectedTemplate,
    selectTemplate,
    clearTemplate,
    // Images
    modelImage, setModelImage,
    productImage, setProductImage,
    backgroundImage, setBackgroundImage,
    allImagesReady,
    // Dialogues
    dialogues,
    updateDialogue,
    // Backsound
    backsound, setBacksound,
    // Custom prompt
    customPrompt, setCustomPrompt,
    // Option selectors
    selectedPose, setSelectedPose,
    selectedAction, setSelectedAction,
    selectedLang, setSelectedLang,
    optionPromptParts,
    // Results
    sceneResults,
    updateSceneResult,
    resetResults,
    // Generation state
    isGenerating, setIsGenerating,
    currentScene, setCurrentScene,
    progress, setProgress,
  }
}
