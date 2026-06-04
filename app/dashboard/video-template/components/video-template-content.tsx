"use client"

/**
 * VideoTemplateContent — Orchestrator component.
 * Connects state hooks and generation logic to UI components.
 * Integrates with GenerationQueue for bell notifications + gallery save.
 */

import { useTemplateState } from "../hooks/use-template-state"
import { useSceneGeneration } from "../hooks/use-scene-generation"
import { useGenerationQueue } from "@/contexts/generation-queue"
import { TemplateSelection } from "./template-selection"
import { TemplateForm } from "./template-form"
import { SceneResults } from "./scene-results"

export function VideoTemplateContent() {
  const state = useTemplateState()
  const { addCustomJob, updateJob } = useGenerationQueue()

  // Build combined option prompt from Pose/Action/Language
  const optionPrompt = state.optionPromptParts()

  // Merge user's custom prompt with option selections
  const combinedPrompt = [optionPrompt, state.customPrompt].filter(Boolean).join(". ")

  const { handleGenerate, handleRegenerateScene, handleRegenerateVideoOnly } = useSceneGeneration({
    selectedTemplate: state.selectedTemplate,
    modelImage: state.modelImage,
    productImage: state.productImage,
    backgroundImage: state.backgroundImage,
    dialogues: state.dialogues,
    backsound: state.backsound,
    customPrompt: combinedPrompt,
    sceneResults: state.sceneResults,
    updateSceneResult: state.updateSceneResult,
    setIsGenerating: state.setIsGenerating,
    setCurrentScene: state.setCurrentScene,
    setProgress: state.setProgress,
    addCustomJob,
    updateJob,
  })

  // ── Template Selection View ──
  if (!state.selectedTemplate) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <TemplateSelection onSelect={state.selectTemplate} />
      </div>
    )
  }

  // ── Template Form + Results View ──
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form */}
        <div className="lg:col-span-5">
          <TemplateForm
            template={state.selectedTemplate}
            modelImage={state.modelImage}
            productImage={state.productImage}
            backgroundImage={state.backgroundImage}
            onModelImage={(img) => img ? state.setModelImage(img) : state.setModelImage(null)}
            onProductImage={(img) => img ? state.setProductImage(img) : state.setProductImage(null)}
            onBackgroundImage={(img) => img ? state.setBackgroundImage(img) : state.setBackgroundImage(null)}
            selectedPose={state.selectedPose}
            onPoseChange={state.setSelectedPose}
            selectedAction={state.selectedAction}
            onActionChange={state.setSelectedAction}
            selectedLang={state.selectedLang}
            onLangChange={state.setSelectedLang}
            dialogues={state.dialogues}
            onUpdateDialogue={state.updateDialogue}
            customPrompt={state.customPrompt}
            onCustomPromptChange={state.setCustomPrompt}
            backsound={state.backsound}
            onToggleBacksound={() => state.setBacksound(!state.backsound)}
            allImagesReady={state.allImagesReady}
            isGenerating={state.isGenerating}
            currentScene={state.currentScene}
            progress={state.progress}
            onGenerate={handleGenerate}
            onBack={state.clearTemplate}
          />
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          <SceneResults
            results={state.sceneResults}
            isGenerating={state.isGenerating}
            onRegenerateScene={handleRegenerateScene}
            onRegenerateVideoOnly={handleRegenerateVideoOnly}
            onUpdateResult={state.updateSceneResult}
            onReset={state.resetResults}
          />
        </div>
      </div>
    </div>
  )
}
