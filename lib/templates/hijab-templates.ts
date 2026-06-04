/**
 * Template: Hijab — 5-scene hijab/kerudung promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const HIJAB_TEMPLATE: TemplateDefinition = {
  id: "hijab-promotion",
  name: "Hijab Promotion",
  description: "Video promosi hijab/kerudung dengan 5 scene styling & material showcase",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, eyebrows, skin tone, and face proportions. Do NOT change any facial feature.",
    outfit: "Same hijab as shown in PRODUCT reference — exact same color, material, draping style. Outfit underneath matches reference images exactly.",
    background: "REPLICATE the exact background from BACKGROUND reference — same walls, objects, lighting, colors. Do NOT substitute or modify the location.",
    mood: "Soft, feminine, elegant — beauty editorial warmth",
    style: "Ultra-realistic beauty fashion photography, soft golden-hour lighting, shallow depth of field, magazine cover quality. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Beautiful Reveal", duration: 8,
      imagePrompt: {
        pose: "Facing camera, one hand elegantly touching hijab near cheek",
        expression: "Warm confident smile, eyes bright",
        hand_position: "Right hand gently touching hijab near jawline",
        eye_direction: "Direct to camera, inviting",
        additional: "Upper body/portrait shot, hijab draping beautifully, face clearly visible",
      },
      videoPrompt: {
        camera: { start: "Close-up face", movement: "Slow pull back", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Face in close-up, hijab framing beautifully" },
          { second: 2, action: "Touches hijab gently near cheek" },
          { second: 4, action: "Camera pulls back revealing full hijab style" },
          { second: 6, action: "Confident smile, slight head tilt" },
        ],
        mood: "Beautiful, inviting, elegant reveal",
      },
      defaultDialogue: "Hai kamu! Lagi cari hijab yang bahannya adem, jatuhnya cantik, dan gampang di-styling? Ini dia hijab favorit aku yang selalu jadi andalan. Yuk aku tunjukin kenapa hijab ini beda dari yang lain!",
    },
    {
      scene: 2, name: "Showcase — Draping & Flow", duration: 8,
      imagePrompt: {
        pose: "Side profile showing hijab drape and length",
        expression: "Serene, peaceful, confident beauty",
        hand_position: "One hand holding hijab tail showing fabric flow",
        eye_direction: "Looking slightly off-camera, dreamy angle",
        additional: "Side/three-quarter view, showing full hijab length and how it drapes",
      },
      videoPrompt: {
        camera: { start: "Side shot", movement: "Slow orbit to front", end: "Medium front view" },
        action_sequence: [
          { second: 0, action: "Side view showing hijab drape" },
          { second: 2, action: "Lifts hijab tail gently showing length" },
          { second: 4, action: "Turns slowly showing all angles" },
          { second: 6, action: "Fabric flows naturally with movement" },
        ],
        mood: "Graceful, flowing, fabric showcase",
      },
      defaultDialogue: "Lihat gimana jatuhnya, cantik banget kan? Panjangnya pas, nggak terlalu pendek dan nggak terlalu panjang. Bahannya lembut banget di kulit, anti gerah, dan yang paling penting nggak mudah kusut walau dipakai seharian penuh.",
    },
    {
      scene: 3, name: "Detail — Fabric Close-up", duration: 8,
      imagePrompt: {
        pose: "Showing fabric texture between fingers or near face",
        expression: "Gentle admiring expression, looking at fabric",
        hand_position: "Fingers holding fabric showing texture and weave",
        eye_direction: "Looking at the fabric detail",
        additional: "Extreme close-up on fabric texture, thread quality visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push into extreme close-up", end: "Macro on fabric" },
        action_sequence: [
          { second: 0, action: "Holds hijab showing fabric near camera" },
          { second: 2, action: "Fingers gently rub fabric showing softness" },
          { second: 4, action: "Close-up on weave and texture detail" },
          { second: 6, action: "Pulls back showing how fabric falls" },
        ],
        mood: "Intimate, quality-focused, premium material feel",
      },
      defaultDialogue: "Ini yang bikin aku jatuh cinta sama hijab ini. Bahannya premium banget, lembut kayak sutra tapi tetap breathable. Jahitannya rapi, pinggiran nggak mudah berserat, dan warnanya tahan lama meskipun dicuci berkali-kali.",
    },
    {
      scene: 4, name: "Styling — Tutorial Quick Look", duration: 8,
      imagePrompt: {
        pose: "Adjusting hijab styling, hands working on different style",
        expression: "Focused but happy, demonstrating skill",
        hand_position: "Both hands actively styling/pinning the hijab",
        eye_direction: "Looking at mirror/self or camera",
        additional: "Medium shot showing styling process, hands clearly visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Steady", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Shows one styling option" },
          { second: 2, action: "Quick adjustment to different style" },
          { second: 4, action: "Final styling touch, pins or tucks" },
          { second: 6, action: "Reveals finished look, smiles proudly" },
        ],
        mood: "Tutorial feel, inspiring, practical beauty",
      },
      defaultDialogue: "Hijab ini gampang banget di-styling! Mau model simple sehari-hari, mau yang formal buat kondangan, tinggal lipat dan pin, langsung cantik. Satu hijab bisa jadi banyak gaya. Praktis banget kan?",
    },
    {
      scene: 5, name: "CTA — Final Beauty Shot", duration: 8,
      imagePrompt: {
        pose: "Facing camera with the most beautiful angle, power pose",
        expression: "Radiant smile, confident, warm invitation",
        hand_position: "One hand on chest or both relaxed, open body language",
        eye_direction: "Direct to camera with warmth",
        additional: "Beauty shot, perfect lighting on face, hijab perfectly styled",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Slow push in", end: "Close-up portrait" },
        action_sequence: [
          { second: 0, action: "Final beautiful pose, perfect styling" },
          { second: 2, action: "Smiles warmly at camera" },
          { second: 4, action: "Gestures invitingly" },
          { second: 6, action: "Close-up beauty shot, radiant" },
        ],
        mood: "Beautiful closing, warm CTA, confident empowerment",
      },
      defaultDialogue: "Gimana, cantik banget kan? Stok hijab ini terbatas lho, jadi langsung order sekarang sebelum kehabisan! Klik link di bio atau langsung chat admin kita ya. Ada promo spesial buat kamu yang order hari ini!",
    },
  ],
}

export function buildHijabImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic hijab beauty photography. A woman modeling a premium hijab/headscarf. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Soft golden lighting, face clearly visible, fabric texture visible. Portrait (9:16).", customPrompt)
}

export function buildHijabVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Hijab promotion video. Graceful fabric movement, styling showcase, feminine elegance. Photorealistic quality.", customPrompt)
}
