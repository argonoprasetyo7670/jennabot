/**
 * Template: Kaos Pria — 5-scene men's t-shirt promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const KAOS_PRIA_TEMPLATE: TemplateDefinition = {
  id: "kaos-pria-promotion",
  name: "Kaos Pria Promotion",
  description: "Video promosi kaos pria dengan 5 scene casual & streetwear",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle, facial hair (if any). Do NOT change any facial feature or hair.",
    outfit: "Same t-shirt as shown in PRODUCT reference — exact same color, print/graphic design, neckline, fit. Matching pants/shorts from reference.",
    background: "REPLICATE the exact background from BACKGROUND reference — same walls, floor, objects, lighting. Do NOT substitute or modify the location.",
    mood: "Casual cool, urban streetwear, relaxed confidence",
    style: "Ultra-realistic men's streetwear fashion photography, natural lighting, urban setting quality. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Fresh Look", duration: 8,
      imagePrompt: {
        pose: "Casual confident pose, hands relaxed, showing t-shirt front",
        expression: "Cool relaxed confidence, easy smile",
        hand_position: "One hand in pocket or thumbs hooked, showing front design",
        eye_direction: "Direct to camera, confident but relaxed",
        additional: "Upper body showing t-shirt fit, print/design visible",
      },
      videoPrompt: {
        camera: { start: "Close-up on shirt design", movement: "Pull back to full", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "T-shirt design in close-up" },
          { second: 2, action: "Camera pulls back revealing the person" },
          { second: 4, action: "Adjusts shirt casually" },
          { second: 6, action: "Cool pose, direct to camera" },
        ],
        mood: "Fresh, casual cool, easy confidence, streetwear vibe",
      },
      defaultDialogue: "Bro, kalau kamu lagi cari kaos yang bukan cuma keren desainnya tapi juga nyaman banget dipake seharian, ini dia yang aku rekomendasiin. Bahannya adem, cutting-nya pas, dan desainnya nggak pasaran. Yuk aku review!",
    },
    {
      scene: 2, name: "Showcase — Fit & Silhouette", duration: 8,
      imagePrompt: {
        pose: "Three-quarter turn showing how t-shirt fits on body",
        expression: "Composed, casual confidence",
        hand_position: "Natural arms, showing shoulder and sleeve fit",
        eye_direction: "Slightly off-camera, model vibes",
        additional: "Full body showing t-shirt fit — shoulders, sleeve length, body length",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Slow orbit", end: "Medium from other side" },
        action_sequence: [
          { second: 0, action: "Front view showing fit" },
          { second: 2, action: "Turns showing side profile" },
          { second: 4, action: "Shows back design/print" },
          { second: 6, action: "Returns to front, hands in pockets" },
        ],
        mood: "Fit showcase, clean silhouette, all-angle presentation",
      },
      defaultDialogue: "Fitting-nya ini yang bikin beda. Regular fit tapi tetap keliatan rapih, nggak terlalu ketat dan nggak kegedean. Bahu-nya pas, panjang lengan proporsional, dan panjang badannya ideal. Mau kamu kurus atau berisi, kaos ini tetap jatuhnya bagus.",
    },
    {
      scene: 3, name: "Detail — Fabric & Print Quality", duration: 8,
      imagePrompt: {
        pose: "Showing fabric texture or print detail close-up",
        expression: "Focused, showing quality with confidence",
        hand_position: "Fingers touching fabric or showing print detail",
        eye_direction: "Looking at the detail",
        additional: "Close-up on fabric weave, print quality, stitching detail",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push to detail", end: "Extreme close-up" },
        action_sequence: [
          { second: 0, action: "Shows fabric texture close-up" },
          { second: 2, action: "Stretches fabric showing elasticity" },
          { second: 4, action: "Shows print detail and quality" },
          { second: 6, action: "Shows collar and stitching quality" },
        ],
        mood: "Quality proof, fabric focus, attention to craftsmanship",
      },
      defaultDialogue: "Material-nya ini cotton combed tiga puluh S yang adem dan menyerap keringat. Nggak panas walau dipake di luar ruangan. Sablon-nya DTF premium, nggak gampang cracking meskipun dicuci berkali-kali. Jahitannya double stitch, jadi kuat dan tahan lama.",
    },
    {
      scene: 4, name: "Lifestyle — Urban Casual", duration: 8,
      imagePrompt: {
        pose: "Casual lifestyle — walking, leaning, or hanging out",
        expression: "Relaxed, happy, enjoying life",
        hand_position: "Natural casual — holding phone, coffee, or relaxed",
        eye_direction: "Natural lifestyle direction",
        additional: "Lifestyle shot, t-shirt in daily context, coordinated outfit",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Follow shot", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Casual urban activity" },
          { second: 2, action: "Natural movement showing comfort" },
          { second: 4, action: "Shows how t-shirt fits with lifestyle" },
          { second: 6, action: "Confident casual pose" },
        ],
        mood: "Urban lifestyle, easy comfort, everyday style",
      },
      defaultDialogue: "Kaos ini tuh versatile banget. Mau dipake santai di rumah, nongkrong sama temen, ke mall, atau bahkan date, tetap keliatan keren. Padu padanin sama jeans, cargo, atau jogger, semua cocok. Satu kaos buat berbagai kesempatan.",
    },
    {
      scene: 5, name: "CTA — Must-Cop", duration: 8,
      imagePrompt: {
        pose: "Final cool pose, t-shirt as hero, facing camera",
        expression: "Confident inviting smile, bro energy",
        hand_position: "Casual cool — peace sign, pointing, or crossed arms",
        eye_direction: "Direct to camera, friendly confidence",
        additional: "Medium shot, t-shirt clearly visible, strong composition",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Final confident pose" },
          { second: 2, action: "Points at t-shirt design" },
          { second: 4, action: "Inviting gesture to camera" },
          { second: 6, action: "Big smile, CTA energy" },
        ],
        mood: "Must-cop energy, friendly CTA, cool close",
      },
      defaultDialogue: "Bro, ini kaos yang harus kamu punya di lemari! Kualitas distro premium tapi harganya super friendly. Dan yang bikin makin mantap, lagi ada promo buy dua free satu! Langsung gas order lewat link di bio sebelum stoknya habis ya!",
    },
  ],
}

export function buildKaosPriaImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic men's streetwear fashion photography. A man modeling a t-shirt. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Natural lighting, urban/casual setting. Portrait (9:16).", customPrompt)
}

export function buildKaosPriaVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Men's t-shirt promotion video. Casual cool vibe, fit showcase, urban lifestyle. Photorealistic quality.", customPrompt)
}
