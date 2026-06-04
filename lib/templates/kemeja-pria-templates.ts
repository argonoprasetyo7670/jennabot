/**
 * Template: Kemeja Pria — 5-scene men's shirt promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const KEMEJA_PRIA_TEMPLATE: TemplateDefinition = {
  id: "kemeja-pria-promotion",
  name: "Kemeja Pria Promotion",
  description: "Video promosi kemeja pria dengan 5 scene professional & stylish",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle, facial hair (if any). Do NOT change any facial feature or hair.",
    outfit: "Same shirt as shown in PRODUCT reference — exact same color, collar style, button design, fit. Matching pants from reference.",
    background: "REPLICATE the exact background from BACKGROUND reference — same walls, floor, furniture, lighting. Do NOT substitute or modify the location.",
    mood: "Professional, smart-casual, polished masculinity",
    style: "Ultra-realistic men's fashion editorial photography, clean professional lighting. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Sharp Look", duration: 8,
      imagePrompt: {
        pose: "Adjusting collar or cuff, power stance",
        expression: "Confident, sharp, professional",
        hand_position: "One hand adjusting collar, other at side",
        eye_direction: "Direct to camera, commanding",
        additional: "Medium shot, shirt fit prominent, professional setting",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Slight push in", end: "Medium close-up" },
        action_sequence: [
          { second: 0, action: "Adjusts shirt collar sharply" },
          { second: 2, action: "Buttons or adjusts cuff" },
          { second: 4, action: "Straightens posture" },
          { second: 6, action: "Confident look at camera" },
        ],
        mood: "Sharp, professional, commanding attention",
      },
      defaultDialogue: "Penampilan rapih dan profesional itu investasi terbaik buat karir kamu. Dan kemeja yang bagus itu kuncinya. Ini kemeja yang aku selalu andalin, dari meeting penting sampai dinner sama klien. Yuk aku review lengkap!",
    },
    {
      scene: 2, name: "Showcase — Fit & Silhouette", duration: 8,
      imagePrompt: {
        pose: "Three-quarter turn showing shirt fit",
        expression: "Composed, professional",
        hand_position: "One hand in pocket, showing shirt tuck",
        eye_direction: "Looking slightly off-camera",
        additional: "Full body, showing slim/regular fit, tucked/untucked",
      },
      videoPrompt: {
        camera: { start: "Full body", movement: "Slow orbit", end: "Medium from other side" },
        action_sequence: [
          { second: 0, action: "Standing straight, showing front" },
          { second: 2, action: "Turns to show side fit" },
          { second: 4, action: "Shows back, no bunching" },
          { second: 6, action: "Returns to front, hands in pockets" },
        ],
        mood: "Clean showcase, tailored fit, all angles",
      },
      defaultDialogue: "Fitting-nya ini yang bikin aku jatuh cinta. Slim fit tapi tetap nyaman bergerak, nggak sesak di ketiak, dan panjangnya pas buat di-tuck in atau dilepas. Lihat dari samping, nggak ada bunching sama sekali. Keliatan custom-made padahal ready to wear.",
    },
    {
      scene: 3, name: "Detail — Fabric & Construction", duration: 8,
      imagePrompt: {
        pose: "Showing collar construction, buttons, or cuff detail",
        expression: "Focused on quality details",
        hand_position: "Fingers on collar or button, showing construction",
        eye_direction: "Looking at detail",
        additional: "Close-up on collar/buttons/cuff, stitching quality visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Zoom to detail", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Shows collar construction" },
          { second: 2, action: "Points out button quality" },
          { second: 4, action: "Shows cuff detail" },
          { second: 6, action: "Rubs fabric showing quality" },
        ],
        mood: "Craftsmanship, quality materials, professional grade",
      },
      defaultDialogue: "Detail-detail kecil ini yang bedain kemeja bagus sama yang biasa. Collar-nya rigid dan nggak gampang melipat. Kancing-nya kokoh, dijahit cross stitch biar nggak lepas. Bahannya premium cotton yang anti kusut, jadi seharian tetap rapih tanpa perlu setrika ulang.",
    },
    {
      scene: 4, name: "Lifestyle — Office to After-Work", duration: 8,
      imagePrompt: {
        pose: "Professional activity or smart-casual after-work look",
        expression: "Professional or relaxed depending on context",
        hand_position: "Natural for the activity",
        eye_direction: "Engaged in activity",
        additional: "Lifestyle showing shirt versatility — formal to casual",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Follow", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Professional setting, shirt looks sharp" },
          { second: 2, action: "Rolls up sleeves casually" },
          { second: 4, action: "More relaxed setting, still looks great" },
          { second: 6, action: "Shirt transitions from formal to casual" },
        ],
        mood: "Versatile, day-to-night, adaptive style",
      },
      defaultDialogue: "Yang bikin kemeja ini juara, dia versatile banget. Pagi dipake meeting dengan dasi, sore lepas dasi gulung lengan, langsung jadi smart casual buat dinner atau hangout. Satu kemeja buat segala suasana, praktis dan tetap stylish.",
    },
    {
      scene: 5, name: "CTA — Final Professional", duration: 8,
      imagePrompt: {
        pose: "Power stance, fully composed, facing camera",
        expression: "Strong, confident, inviting",
        hand_position: "Adjusting tie or collar for final touch",
        eye_direction: "Direct to camera",
        additional: "Medium shot, perfect professional composition",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Final power stance" },
          { second: 2, action: "Last collar adjustment" },
          { second: 4, action: "Confident nod" },
          { second: 6, action: "Points or gestures to camera" },
        ],
        mood: "Professional close, strong CTA, purchase motivation",
      },
      defaultDialogue: "Upgrade penampilan kamu dimulai dari kemeja yang tepat. Kualitas premium, bahan anti kusut, fitting sempurna, dan harganya sangat reasonable! Langsung aja order lewat link di bio atau chat admin kita. Free ongkir dan bisa tukar ukuran kalau nggak pas!",
    },
  ],
}

export function buildKemejaPriaImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic men's professional shirt photography. A man modeling a button-down shirt. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Clean professional lighting, tailored fit focus. Portrait (9:16).", customPrompt)
}

export function buildKemejaPriaVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Men's shirt promotion video. Professional presentation, fit showcase, versatile styling. Photorealistic quality.", customPrompt)
}
