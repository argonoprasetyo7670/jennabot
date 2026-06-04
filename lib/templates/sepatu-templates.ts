/**
 * Template: Sepatu — 5-scene sneakers/shoes promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const SEPATU_TEMPLATE: TemplateDefinition = {
  id: "sepatu-promotion",
  name: "Sepatu Promotion",
  description: "Video promosi sepatu/sneakers dengan 5 scene unboxing to on-feet review",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle, and body type. Do NOT change any facial feature or hair.",
    outfit: "Same outfit and shoes as shown in references — exact same shoe color, design, lacing style. Clothes matching reference exactly.",
    background: "REPLICATE the exact background from BACKGROUND reference — same walls, floor, furniture, lighting. Do NOT substitute or modify the location.",
    mood: "Dynamic, energetic, streetwear cool — confident urban vibe",
    style: "Ultra-realistic sneaker culture photography, dramatic directional lighting, clean composition. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Box Reveal", duration: 8,
      imagePrompt: {
        pose: "Holding shoe box excitedly, about to open",
        expression: "Excited, eager anticipation, genuine thrill",
        hand_position: "Both hands on shoe box, lid partially open",
        eye_direction: "Looking at camera with excitement",
        additional: "Medium shot, shoe box prominent, clean background",
      },
      videoPrompt: {
        camera: { start: "Close-up on box", movement: "Pull back revealing person", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Shoe box in frame, hands reach for it" },
          { second: 2, action: "Lifts lid slowly, building anticipation" },
          { second: 4, action: "Reveals shoes inside, excited reaction" },
          { second: 6, action: "Picks up one shoe, admiring it" },
        ],
        mood: "Exciting unboxing, sneakerhead anticipation, reveal moment",
      },
      defaultDialogue: "Guys, akhirnya datang juga! Sepatu yang udah aku tunggu-tunggu dari kemarin. Pas buka boxnya, wah langsung speechless. Kualitasnya beda banget sama yang lain. Yuk aku review detail satu per satu!",
    },
    {
      scene: 2, name: "Showcase — 360 Product View", duration: 8,
      imagePrompt: {
        pose: "Holding shoe at eye level, showing design from best angle",
        expression: "Impressed, admiring, appreciative",
        hand_position: "One hand cradling shoe, other supporting from below",
        eye_direction: "Looking at the shoe with admiration",
        additional: "Product-focused shot, shoe is hero, clear design details visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Orbit around shoe", end: "Close-up shoe" },
        action_sequence: [
          { second: 0, action: "Holds shoe showing front view" },
          { second: 2, action: "Rotates showing side profile and logo" },
          { second: 4, action: "Shows sole design and tread pattern" },
          { second: 6, action: "Returns to best angle, nods approvingly" },
        ],
        mood: "Product hero showcase, design appreciation, collector's eye",
      },
      defaultDialogue: "Coba lihat dari samping, desainnya sleek banget. Sol-nya ini pakai bahan khusus yang empuk tapi tetap tahan lama. Detail jahitannya rapi, material-nya premium. Ini sepatu yang harganya worth it banget sama kualitasnya.",
    },
    {
      scene: 3, name: "Detail — Material & Stitching", duration: 8,
      imagePrompt: {
        pose: "Pointing at specific shoe detail — stitching, material, logo",
        expression: "Focused, informative, pointing out quality",
        hand_position: "Finger pointing at or touching shoe detail",
        eye_direction: "Looking at the detail being shown",
        additional: "Close-up macro shot, stitching and texture clearly visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Zoom to macro", end: "Extreme close-up" },
        action_sequence: [
          { second: 0, action: "Shows stitching quality close-up" },
          { second: 2, action: "Fingers trace the material texture" },
          { second: 4, action: "Points out logo detail and branding" },
          { second: 6, action: "Presses sole showing cushioning" },
        ],
        mood: "Quality inspection, craftmanship appreciation, detail-oriented",
      },
      defaultDialogue: "Nah ini yang bikin aku yakin sama kualitasnya. Lihat jahitannya, rapi banget dan kuat. Material upper-nya soft tapi nggak gampang lecek. Insole-nya empuk, dijamin kaki kamu nyaman meskipun jalan seharian penuh.",
    },
    {
      scene: 4, name: "On-Feet — Lifestyle Shot", duration: 8,
      imagePrompt: {
        pose: "Standing confidently wearing the shoes, full outfit visible",
        expression: "Cool, confident, streetwear attitude",
        hand_position: "Natural cool pose — one hand in pocket or adjusting jacket",
        eye_direction: "Looking off-camera confidently or direct to camera",
        additional: "Full body showing complete outfit with shoes as centerpiece",
      },
      videoPrompt: {
        camera: { start: "Low angle on shoes", movement: "Tilt up to full body", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Shoes on feet, walking in" },
          { second: 2, action: "Camera reveals full outfit coordination" },
          { second: 4, action: "Casual walking showing comfort" },
          { second: 6, action: "Stops in confident pose" },
        ],
        mood: "Streetwear lifestyle, confident walk, urban cool",
      },
      defaultDialogue: "Pas dipake langsung beda, feel-nya premium banget. Enteng di kaki, sol-nya empuk, dan yang paling penting gampang banget dipaduin sama outfit apa aja. Mau casual, semi-formal, atau sporty, sepatu ini cocok semua.",
    },
    {
      scene: 5, name: "CTA — Final Flex", duration: 8,
      imagePrompt: {
        pose: "Power pose with shoes prominent, facing camera",
        expression: "Confident smile, inviting, energetic",
        hand_position: "Holding one shoe up or gesturing to shoes on feet",
        eye_direction: "Direct to camera, engaging",
        additional: "Medium shot, shoes clearly featured, strong composition",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Final confident pose with shoes" },
          { second: 2, action: "Points at shoes or holds them up" },
          { second: 4, action: "Gestures to camera invitingly" },
          { second: 6, action: "Big confident smile, CTA energy" },
        ],
        mood: "Strong close, flex moment, purchase motivation",
      },
      defaultDialogue: "Ini sih sepatu yang wajib kamu punya! Stoknya terbatas dan pasti cepet habis. Langsung aja klik link di bio atau hubungi admin kita sekarang. Ada diskon spesial buat kamu yang order hari ini. Jangan sampai nyesel!",
    },
  ],
}

export function buildSepatuImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic sneaker/shoe product photography. A person showcasing stylish footwear. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Clean composition, dramatic product lighting. Portrait (9:16).", customPrompt)
}

export function buildSepatuVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Shoe/sneaker promotion video. Dynamic angles, product hero shots, urban lifestyle. Photorealistic quality.", customPrompt)
}
