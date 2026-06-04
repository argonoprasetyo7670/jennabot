/**
 * Template: Kacamata — 5-scene eyewear/sunglasses promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const KACAMATA_TEMPLATE: TemplateDefinition = {
  id: "kacamata-promotion",
  name: "Kacamata Promotion",
  description: "Video promosi kacamata/sunglasses dengan 5 scene trendy styling",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle/hijab. Do NOT change any facial feature or hair.",
    outfit: "Same outfit and glasses as shown in references — exact same frame shape, color, lens tint. Clothes matching reference exactly.",
    background: "REPLICATE the exact background from BACKGROUND reference — same walls, objects, lighting, colors. Do NOT substitute or modify the location.",
    mood: "Trendy, cool, fashion-forward — stylish confidence",
    style: "Ultra-realistic eyewear fashion photography, face-focused, clean background, modern editorial quality. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Cool Reveal", duration: 8,
      imagePrompt: {
        pose: "Putting on glasses or holding them near face",
        expression: "Cool confidence, playful edge",
        hand_position: "One hand putting on or adjusting glasses",
        eye_direction: "Looking at camera over the glasses or through them",
        additional: "Upper body portrait, face and glasses clearly visible",
      },
      videoPrompt: {
        camera: { start: "Close-up face", movement: "Slight pull back", end: "Medium close-up" },
        action_sequence: [
          { second: 0, action: "Holds glasses near face" },
          { second: 2, action: "Puts them on with cool gesture" },
          { second: 4, action: "Adjusts them perfectly" },
          { second: 6, action: "Looks at camera through glasses, confident" },
        ],
        mood: "Cool reveal, fashion-forward, instant transformation",
      },
      defaultDialogue: "Satu aksesoris yang bisa langsung upgrade penampilan kamu? Kacamata! Dan ini bukan kacamata biasa ya. Dari pertama pakai, langsung kerasa beda. Frame-nya ringan, desainnya timeless, dan cocok banget sama bentuk muka aku.",
    },
    {
      scene: 2, name: "Showcase — Frame Design", duration: 8,
      imagePrompt: {
        pose: "Holding glasses showing frame design from best angle",
        expression: "Appreciative, showcasing proudly",
        hand_position: "Holding glasses temple, showing front frame design",
        eye_direction: "Looking at glasses admiringly",
        additional: "Product hero shot, frame details visible — hinges, nose pads",
      },
      videoPrompt: {
        camera: { start: "Close-up on glasses", movement: "Orbit showing design", end: "Three-quarter angle" },
        action_sequence: [
          { second: 0, action: "Shows frame front view" },
          { second: 2, action: "Rotates showing temple design" },
          { second: 4, action: "Shows hinge quality and nose pads" },
          { second: 6, action: "Returns to best angle, nods" },
        ],
        mood: "Design showcase, attention to detail, premium frame",
      },
      defaultDialogue: "Coba perhatiin frame-nya, desainnya minimalis tapi elegan. Bahannya acetate premium yang ringan banget di hidung. Hinge-nya kuat, nggak gampang longgar. Dan ini dia yang bikin aku suka, temple design-nya ada detail khas yang bikin beda dari yang lain.",
    },
    {
      scene: 3, name: "Detail — Lens & Quality", duration: 8,
      imagePrompt: {
        pose: "Showing lens quality — reflection, clarity, or UV test",
        expression: "Impressed, informative, quality-focused",
        hand_position: "Holding glasses showing lens to light",
        eye_direction: "Looking through lens showing clarity",
        additional: "Close-up showing lens quality, light reflections, coating",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push to macro lens", end: "Extreme close-up" },
        action_sequence: [
          { second: 0, action: "Holds lens up to light" },
          { second: 2, action: "Shows anti-reflective coating" },
          { second: 4, action: "Demonstrates lens clarity" },
          { second: 6, action: "Shows thickness and quality" },
        ],
        mood: "Quality proof, technical showcase, premium optics",
      },
      defaultDialogue: "Lensa-nya ini yang bikin worth it. Anti UV empat ratus, jadi mata kamu terlindungi dari sinar matahari. Anti-reflective coating bikin pandangan lebih jernih dan nyaman. Bahkan di bawah lampu neon pun nggak bikin mata cepet capek.",
    },
    {
      scene: 4, name: "Lifestyle — Style Versatility", duration: 8,
      imagePrompt: {
        pose: "Wearing glasses in lifestyle context — outdoor/professional",
        expression: "Stylish, confident, versatile cool",
        hand_position: "Natural — adjusting glasses or natural pose",
        eye_direction: "Looking ahead confidently through glasses",
        additional: "Lifestyle shot, glasses as part of complete look, full outfit",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Follow shot", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Wearing glasses in everyday setting" },
          { second: 2, action: "Adjusts glasses casually" },
          { second: 4, action: "Different angle showing style fit" },
          { second: 6, action: "Confident look, glasses complete the outfit" },
        ],
        mood: "Versatile style, everyday cool, effortless fashion",
      },
      defaultDialogue: "Ini kacamata yang bisa dipakai ke mana aja. Ke kantor, jalan-jalan, hangout, sampai foto-foto, semuanya cocok. Frame-nya nyaman dipake berjam-jam dan nggak ninggalin bekas di hidung. Style-nya timeless, nggak pernah out of date.",
    },
    {
      scene: 5, name: "CTA — Must-Have Accessory", duration: 8,
      imagePrompt: {
        pose: "Wearing glasses, facing camera, confident final look",
        expression: "Cool confident smile, inviting",
        hand_position: "Adjusting glasses or natural cool pose",
        eye_direction: "Direct to camera through glasses",
        additional: "Medium close-up, glasses perfectly positioned, editorial lighting",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Final confident look wearing glasses" },
          { second: 2, action: "Cool adjustment of glasses" },
          { second: 4, action: "Inviting gesture to camera" },
          { second: 6, action: "Close-up through glasses, confident" },
        ],
        mood: "Cool close, stylish CTA, must-have energy",
      },
      defaultDialogue: "Trust me, ini kacamata yang bakal jadi favorit kamu! Kualitas premium tapi harganya nggak bikin kantong jebol. Stoknya terbatas ya, langsung aja order lewat link di bio. Ada bonus case premium dan lap microfiber buat yang order sekarang!",
    },
  ],
}

export function buildKacamataImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic eyewear fashion photography. A person modeling stylish glasses/sunglasses. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Face-focused, clean background, modern editorial quality. Portrait (9:16).", customPrompt)
}

export function buildKacamataVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Eyewear promotion video. Trendy presentation, face-focused angles, lifestyle cool. Photorealistic quality.", customPrompt)
}
