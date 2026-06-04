/**
 * Template: Gamis — 5-scene hijab gamis promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const GAMIS_TEMPLATE: TemplateDefinition = {
  id: "gamis-promotion",
  name: "Gamis Promotion",
  description: "Video promosi gamis/busana muslim wanita dengan 5 scene cinematic",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, body type, and hair/hijab style. Do NOT change any facial feature.",
    outfit: "Same hijab and gamis set as shown in references — exact same color, fabric texture, and draping style across all scenes",
    background: "REPLICATE the exact background from BACKGROUND reference — same walls, flooring, furniture, lighting, colors. Do NOT substitute or modify the location.",
    mood: "Elegant, graceful, confident — soft feminine energy with warmth",
    style: "Ultra-realistic fashion editorial photography, soft natural lighting, shallow depth of field, high-end catalog quality. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1,
      name: "Hook — Dramatic Entrance",
      duration: 8,
      imagePrompt: {
        pose: "Standing tall, slight turn, one hand gently touching the hijab edge",
        expression: "Confident smile, chin slightly up, looking at camera",
        hand_position: "Right hand near hijab edge, left hand relaxed at side",
        eye_direction: "Direct to camera, engaging",
        additional: "Full body shot, gamis flowing naturally, elegant posture",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Slow dolly in", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Model walks into frame gracefully" },
          { second: 2, action: "Pauses, adjusts hijab slightly" },
          { second: 4, action: "Turns to face camera with confident smile" },
          { second: 6, action: "Slight head tilt, fabric flows" },
        ],
        mood: "Dramatic, attention-grabbing, elegant entrance",
      },
      defaultDialogue: "Assalamualaikum semuanya! Kamu lagi cari gamis yang elegan tapi tetap nyaman dipakai seharian? Nah, kamu wajib banget lihat koleksi terbaru ini. Dijamin langsung jatuh cinta!",
    },
    {
      scene: 2,
      name: "Showcase — Full View Spin",
      duration: 8,
      imagePrompt: {
        pose: "Three-quarter turn, showing the side profile of the gamis",
        expression: "Soft smile, relaxed, natural beauty",
        hand_position: "Both hands slightly lifting the gamis skirt to show flow",
        eye_direction: "Looking slightly off-camera, dreamy",
        additional: "Medium-full shot, focus on fabric draping and gamis silhouette",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Orbit around model", end: "Medium shot from other side" },
        action_sequence: [
          { second: 0, action: "Slow turn showing front of gamis" },
          { second: 2, action: "Continues turning, fabric flows beautifully" },
          { second: 4, action: "Reaches back view, shows hijab styling" },
          { second: 6, action: "Completes turn back to front" },
        ],
        mood: "Graceful, showcasing, dreamy fashion show feel",
      },
      defaultDialogue: "Coba lihat jatuhnya gimana, cantik banget kan? Bahannya ini adem banget di kulit, ringan, dan yang paling penting tetap syar'i. Cocok banget buat kamu yang aktif tapi pengen tetap tampil anggun.",
    },
    {
      scene: 3,
      name: "Detail — Close-up Fabric & Embroidery",
      duration: 8,
      imagePrompt: {
        pose: "Hands presenting the detail area of the gamis — embroidery, buttons, or hem",
        expression: "Focused, admiring the detail, slight smile",
        hand_position: "Both hands framing a detail section of the gamis",
        eye_direction: "Looking down at the detail area",
        additional: "Close-up/detail shot, shallow depth of field on fabric texture",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Zoom in to detail", end: "Extreme close-up" },
        action_sequence: [
          { second: 0, action: "Hands guide viewer to detail area" },
          { second: 2, action: "Fingers gently trace embroidery or pattern" },
          { second: 4, action: "Fabric is stretched slightly to show quality" },
          { second: 6, action: "Pull back slightly to show detail in context" },
        ],
        mood: "Intimate, luxurious, focus on quality craftsmanship",
      },
      defaultDialogue: "Nah ini yang bikin beda dari yang lain. Lihat detailnya, bordiran premiumnya rapih banget, jahitannya kuat dan presisi. Bahan ini anti kusut dan adem, jadi kamu tetap fresh seharian tanpa perlu khawatir.",
    },
    {
      scene: 4,
      name: "Lifestyle — Daily Activity",
      duration: 8,
      imagePrompt: {
        pose: "Natural lifestyle pose — walking, sitting, or reaching for something",
        expression: "Natural happy expression, candid feel",
        hand_position: "Natural position for the activity",
        eye_direction: "Looking at the activity or slightly off-camera",
        additional: "Lifestyle shot, showing gamis is comfortable for daily activities",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Follow shot, handheld feel", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Model doing a daily activity naturally" },
          { second: 2, action: "Shows ease of movement in the gamis" },
          { second: 4, action: "Smiles naturally, comfortable and happy" },
          { second: 6, action: "Adjusts position, fabric moves freely" },
        ],
        mood: "Warm, relatable, daily-life comfort",
      },
      defaultDialogue: "Mau ke pengajian, arisan, kondangan, atau sekadar jalan-jalan santai sama keluarga, gamis ini cocok banget buat semua suasana. Gerak bebas, nggak bikin gerah, dan tetap tampil elegan di mana pun kamu pergi.",
    },
    {
      scene: 5,
      name: "CTA — Final Pose & Call to Action",
      duration: 8,
      imagePrompt: {
        pose: "Power pose, standing confidently facing camera",
        expression: "Bright smile, enthusiastic, inviting",
        hand_position: "One hand on hip, other making a gentle gesture toward camera",
        eye_direction: "Direct to camera, engaging connection",
        additional: "Full body shot, strong composition, product clearly visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Slow push in", end: "Medium close-up" },
        action_sequence: [
          { second: 0, action: "Model strikes a confident final pose" },
          { second: 2, action: "Gestures invitingly toward camera" },
          { second: 4, action: "Big smile, nods encouragingly" },
          { second: 6, action: "Final pose hold, fabric settled beautifully" },
        ],
        mood: "Empowering, inviting, strong closing energy",
      },
      defaultDialogue: "Jangan sampai kehabisan ya! Stok gamis ini terbatas dan selalu sold out cepat. Langsung klik link di bio atau chat admin sekarang juga untuk order. Gratis ongkir dan bisa COD lho. Buruan sebelum kehabisan!",
    },
  ],
}

export function buildGamisImagePrompt(
  scene: SceneTemplate,
  anchors: ConsistencyAnchors,
  dialogue: string,
  customPrompt?: string
): string {
  return buildStandardImagePrompt(
    scene,
    anchors,
    dialogue,
    "Ultra-realistic hijab fashion photography. A beautiful hijab-wearing woman modeling a flowing gamis dress. " +
      "Must look like a REAL photograph taken by a professional photographer — NOT AI-generated. " +
      "Soft diffused natural lighting, shallow depth of field. Portrait orientation (9:16).",
    customPrompt
  )
}

export function buildGamisVideoPrompt(
  scene: SceneTemplate,
  anchors: ConsistencyAnchors,
  dialogue: string,
  backsound: boolean,
  customPrompt?: string
): string {
  return buildStandardVideoPrompt(
    scene,
    anchors,
    dialogue,
    backsound,
    "Hijab fashion promotion video. Model wearing gamis moves gracefully, fabric flows naturally. Photorealistic quality.",
    customPrompt
  )
}
