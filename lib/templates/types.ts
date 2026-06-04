/**
 * Shared template type definitions for Video Template feature.
 * All templates follow the same structure for consistency.
 */

/* ─── Scene-level prompt structures ─── */

export interface ImagePromptParams {
  pose: string
  expression: string
  hand_position: string
  eye_direction: string
  additional: string
}

export interface CameraMovement {
  start: string
  movement: string
  end: string
}

export interface ActionSequenceItem {
  second: number
  action: string
}

export interface VideoPromptParams {
  camera: CameraMovement
  action_sequence: ActionSequenceItem[]
  mood: string
}

/* ─── Scene Template ─── */

export interface SceneTemplate {
  scene: number
  name: string
  duration: number
  imagePrompt: ImagePromptParams
  videoPrompt: VideoPromptParams
  defaultDialogue: string
}

/* ─── Consistency Anchors ─── */

export interface ConsistencyAnchors {
  character: string
  outfit: string
  background: string
  mood: string
  style: string
}

/* ─── Template Definition ─── */

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  consistencyAnchors: ConsistencyAnchors
  scenes: SceneTemplate[]
}

/* ─── Prompt Builder Function Types ─── */

export type ImagePromptBuilder = (
  scene: SceneTemplate,
  anchors: ConsistencyAnchors,
  dialogue: string,
  customPrompt?: string
) => string

export type VideoPromptBuilder = (
  scene: SceneTemplate,
  anchors: ConsistencyAnchors,
  dialogue: string,
  backsound: boolean,
  customPrompt?: string
) => string

/* ─── Registry Entry (used by index.ts) ─── */

export interface TemplateRegistryEntry {
  /** Unique template ID */
  id: string
  /** Display name */
  name: string
  /** Short description */
  description: string
  /** Emoji icon for UI */
  icon: string
  /** Tailwind color class prefix (e.g. "violet", "blue") */
  color: string
  /** Category tag */
  category: string
  /** The full template definition */
  template: TemplateDefinition
  /** Build image prompt for a scene */
  buildImagePrompt: ImagePromptBuilder
  /** Build video prompt for a scene */
  buildVideoPrompt: VideoPromptBuilder
}
