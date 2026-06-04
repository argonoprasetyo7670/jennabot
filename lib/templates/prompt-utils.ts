/**
 * Shared prompt builder utilities for all video templates.
 *
 * KEY INSIGHT: AI image models work best with SHORT, DESCRIPTIVE prompts.
 * The reference images (model, background, product) already handle consistency —
 * the prompt should just describe the SCENE, not repeat reference-matching instructions.
 *
 * Pattern: Follow review-product's working pattern — a single natural-language paragraph.
 */

import type { SceneTemplate, ConsistencyAnchors } from "./types"

/**
 * Build a concise image prompt that works with reference images.
 * Keep it short — let the reference images do the heavy lifting.
 */
export function buildStandardImagePrompt(
  scene: SceneTemplate,
  anchors: ConsistencyAnchors,
  dialogue: string,
  productSpecific: string,
  customPrompt?: string
): string {
  const parts = [
    productSpecific,
    `The person identical to the MODEL reference is in the exact BACKGROUND from the reference, showcasing the exact PRODUCT from the reference.`,
    `${scene.imagePrompt.pose}. ${scene.imagePrompt.expression}.`,
    `${scene.imagePrompt.hand_position}. ${scene.imagePrompt.eye_direction}.`,
    scene.imagePrompt.additional,
    `Photorealistic, natural lighting, high detail, 4K quality.`,
  ]

  if (customPrompt) {
    parts.push(customPrompt)
  }

  return parts.filter(Boolean).join(" ")
}

/**
 * Build a concise video prompt. Short and natural.
 */
export function buildStandardVideoPrompt(
  scene: SceneTemplate,
  anchors: ConsistencyAnchors,
  dialogue: string,
  backsound: boolean,
  productSpecific: string,
  customPrompt?: string
): string {
  const cameraDesc = `Camera: ${scene.videoPrompt.camera.start}, ${scene.videoPrompt.camera.movement}, ends at ${scene.videoPrompt.camera.end}.`

  const actions = scene.videoPrompt.action_sequence
    .map((a) => a.action)
    .join(", then ")

  const audio = backsound
    ? `Soft background music. The person speaks naturally: "${dialogue}"`
    : `No background music. Natural ambient sound only. The person speaks clearly and naturally: "${dialogue}"`

  const parts = [
    `${productSpecific}`,
    `Smooth cinematic video, portrait format, ${scene.duration} seconds.`,
    cameraDesc,
    `Action: ${actions}.`,
    `Mood: ${scene.videoPrompt.mood}.`,
    audio,
    `Photorealistic quality, natural movements, professional lighting, smooth camera.`,
  ]

  if (customPrompt) {
    parts.push(customPrompt)
  }

  return parts.filter(Boolean).join(" ")
}
