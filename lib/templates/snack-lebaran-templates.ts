/**
 * Template: Snack Lebaran — 5-scene holiday snack promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const SNACK_LEBARAN_TEMPLATE: TemplateDefinition = {
  id: "snack-lebaran-promotion",
  name: "Snack Lebaran Promotion",
  description: "Video promosi snack/kue lebaran dengan 5 scene festive & appetizing",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle/hijab. Do NOT change any facial feature or hair.",
    outfit: "Same festive/lebaran outfit as shown in references — exact same clothes, hijab style, accessories",
    background: "REPLICATE the exact background from BACKGROUND reference — same room, decorations, table, lighting. Do NOT substitute or modify the location.",
    mood: "Festive, warm, family gathering energy, appetizing",
    style: "Ultra-realistic food photography meets lifestyle, warm golden lighting, appetizing presentation, festive editorial. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Festive Unboxing", duration: 8,
      imagePrompt: {
        pose: "Holding a beautifully packaged snack box, excited",
        expression: "Excited, festive joy, bright smile",
        hand_position: "Both hands holding decorative snack box/toples",
        eye_direction: "Looking at camera with excitement",
        additional: "Medium shot, festive background, snack packaging prominent",
      },
      videoPrompt: {
        camera: { start: "Close-up on package", movement: "Pull back to reveal person", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Beautiful snack packaging in frame" },
          { second: 2, action: "Hands lift the box, camera reveals the person" },
          { second: 4, action: "Opens packaging with excitement" },
          { second: 6, action: "Shows arranged snacks inside, delighted" },
        ],
        mood: "Festive excitement, gift-like reveal, holiday joy",
      },
      defaultDialogue: "Assalamualaikum! Lebaran sebentar lagi nih, dan pastinya nggak lengkap dong kalau nggak ada kue kering di meja tamu. Nah ini dia koleksi snack lebaran premium yang wajib banget kamu siapin tahun ini. Yuk aku tunjukin satu per satu!",
    },
    {
      scene: 2, name: "Showcase — Variety Display", duration: 8,
      imagePrompt: {
        pose: "Arranging or presenting multiple snack varieties on table",
        expression: "Proud, showcasing, hospitable",
        hand_position: "Hands arranging snacks on festive table",
        eye_direction: "Looking at the snack arrangement",
        additional: "Top-down or 3/4 angle, showing variety of snacks, festive table setting",
      },
      videoPrompt: {
        camera: { start: "Top-down on table", movement: "Slow tilt to person", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Overhead view of snack varieties" },
          { second: 2, action: "Hands arrange snacks neatly" },
          { second: 4, action: "Camera tilts up to show person" },
          { second: 6, action: "Gestures proudly at the spread" },
        ],
        mood: "Abundant, generous, festive table spread",
      },
      defaultDialogue: "Ada nastar lembut isi selai nanas asli, kastengel keju premium yang renyah, putri salju yang lumer di mulut, dan masih banyak lagi! Semua dibuat fresh dari bahan pilihan tanpa pengawet. Ini suguhan yang bikin tamu kamu terkesan.",
    },
    {
      scene: 3, name: "Detail — Taste & Texture Close-up", duration: 8,
      imagePrompt: {
        pose: "Picking up a snack, about to taste or showing cross-section",
        expression: "Anticipation, then delight after tasting",
        hand_position: "Fingers delicately holding one snack piece",
        eye_direction: "Looking at the snack, then savoring",
        additional: "Close-up, food macro quality, texture and color visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in to food close-up", end: "Face reaction" },
        action_sequence: [
          { second: 0, action: "Picks up one snack delicately" },
          { second: 2, action: "Shows the snack close to camera" },
          { second: 4, action: "Takes a bite, crunch visible" },
          { second: 6, action: "Blissful expression, nods approvingly" },
        ],
        mood: "Appetizing, ASMR-like crunch, taste satisfaction",
      },
      defaultDialogue: "Coba satu ya... Mmm! Ini sih enak banget! Renyahnya itu pas, manisnya nggak berlebihan, dan rasa kejunya terasa banget. Setiap gigitan tuh lumer di mulut. Ini beneran pakai bahan premium, kerasa bedanya sama kue pasaran.",
    },
    {
      scene: 4, name: "Lifestyle — Family Gathering", duration: 8,
      imagePrompt: {
        pose: "Serving snacks in a family/gathering setting",
        expression: "Warm, hospitable, sharing joy",
        hand_position: "Offering a toples of snacks to camera/guests",
        eye_direction: "Warm, welcoming, looking at imaginary guests",
        additional: "Lifestyle shot, lebaran gathering context, warm lighting",
      },
      videoPrompt: {
        camera: { start: "Wide shot of gathering", movement: "Focus to person", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Festive gathering setting" },
          { second: 2, action: "Offers snacks to guests warmly" },
          { second: 4, action: "Everyone enjoying the snacks" },
          { second: 6, action: "Warm smile, satisfied host" },
        ],
        mood: "Warm family gathering, sharing, togetherness",
      },
      defaultDialogue: "Bayangin pas hari raya, tamu datang, kamu suguhkan kue-kue premium ini. Pasti langsung pada puji dan nanya belinya di mana. Ini suguhan yang bikin silaturahmi makin berkesan dan tamu betah berlama-lama di rumah kamu.",
    },
    {
      scene: 5, name: "CTA — Order for Lebaran", duration: 8,
      imagePrompt: {
        pose: "Holding packaged snack box, facing camera, ready to sell",
        expression: "Bright festive smile, inviting, urgency",
        hand_position: "Holding snack package attractively",
        eye_direction: "Direct to camera, warm engagement",
        additional: "Medium shot, packaging prominent, festive urgency feel",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Holds packaged snacks attractively" },
          { second: 2, action: "Shows package label/branding" },
          { second: 4, action: "Gestures urgently — limited stock feel" },
          { second: 6, action: "Final warm smile, inviting to order" },
        ],
        mood: "Festive CTA, urgency, limited availability, warm close",
      },
      defaultDialogue: "Jangan sampai telat order ya! Tahun kemarin aja sold out dua minggu sebelum lebaran. Langsung aja klik link di bio untuk pesan sekarang. Ada paket hemat dan bisa custom sesuai selera keluarga kamu. Free gift box cantik untuk setiap pembelian!",
    },
  ],
}

export function buildSnackLebaranImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic festive food photography with lifestyle elements. A person presenting holiday snacks/cookies. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Warm golden lighting, festive decorations, appetizing presentation. Portrait (9:16).", customPrompt)
}

export function buildSnackLebaranVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Lebaran snack promotion video. Festive atmosphere, appetizing food shots, warm family energy. Photorealistic quality.", customPrompt)
}
