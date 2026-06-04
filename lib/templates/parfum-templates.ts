/**
 * Template: Parfum — 5-scene luxury fragrance promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const PARFUM_TEMPLATE: TemplateDefinition = {
  id: "parfum-promotion",
  name: "Parfum Promotion",
  description: "Video promosi parfum/fragrance dengan 5 scene luxury & sensual",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle/hijab. Do NOT change any facial feature or hair.",
    outfit: "Same outfit as shown in references — exact same clothes, accessories, and styling",
    background: "REPLICATE the exact background from BACKGROUND reference — same surfaces, objects, lighting, colors. Do NOT substitute or modify the location.",
    mood: "Luxurious, sensual, premium — upscale fragrance advertisement",
    style: "Ultra-realistic luxury perfume advertisement photography, golden hour side lighting, shallow depth of field, premium brand quality. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Luxury First Impression", duration: 8,
      imagePrompt: {
        pose: "Holding perfume bottle near face/neck, elegant pose",
        expression: "Mysterious confident smile, alluring",
        hand_position: "One hand holding perfume bottle near collarbone",
        eye_direction: "Direct to camera, captivating gaze",
        additional: "Upper body portrait, perfume bottle clearly visible, luxurious composition",
      },
      videoPrompt: {
        camera: { start: "Close-up on bottle", movement: "Pull back to reveal person", end: "Medium portrait" },
        action_sequence: [
          { second: 0, action: "Perfume bottle in dramatic close-up" },
          { second: 2, action: "Camera reveals person holding it elegantly" },
          { second: 4, action: "Brings bottle near neck, alluring gesture" },
          { second: 6, action: "Confident captivating look at camera" },
        ],
        mood: "Luxurious reveal, premium first impression, captivating",
      },
      defaultDialogue: "Pernah nggak sih kamu cium satu wangi yang langsung bikin orang noleh? Nah, parfum ini exactly that! Dari pertama spray, aromanya langsung mewah dan bikin kamu tampil beda. Ini rahasia wangi aku sehari-hari.",
    },
    {
      scene: 2, name: "Showcase — Bottle Design", duration: 8,
      imagePrompt: {
        pose: "Presenting the bottle at eye level showing design",
        expression: "Appreciative, admiring the bottle design",
        hand_position: "Both hands cradling bottle, showing label and cap",
        eye_direction: "Looking at the bottle admiringly",
        additional: "Product hero shot, bottle design clearly visible, reflections on glass",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Orbit around bottle", end: "Close-up bottle" },
        action_sequence: [
          { second: 0, action: "Holds bottle showing front label" },
          { second: 2, action: "Rotates showing bottle design from all angles" },
          { second: 4, action: "Opens cap showing sprayer" },
          { second: 6, action: "Returns to best angle, nods approvingly" },
        ],
        mood: "Design appreciation, luxury object, collector's delight",
      },
      defaultDialogue: "Lihat desain botolnya, mewah banget kan? Bukan cuma wanginya yang premium, packaging-nya juga cocok banget dijadiin pajangan. Bahan botolnya tebal dan solid, nggak murahan sama sekali. Ini parfum yang bikin bangga tiap kali dipegang.",
    },
    {
      scene: 3, name: "Application — The Spray", duration: 8,
      imagePrompt: {
        pose: "Spraying perfume on wrist or neck",
        expression: "Eyes closing slightly, savoring the scent",
        hand_position: "One hand spraying, other wrist exposed",
        eye_direction: "Eyes softly closing, inhaling the scent",
        additional: "Close-up showing spray action, fine mist visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in to wrist/neck", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Holds bottle ready to spray" },
          { second: 2, action: "Sprays on wrist or neck" },
          { second: 4, action: "Brings wrist to nose, inhaling deeply" },
          { second: 6, action: "Blissful expression, savoring the scent" },
        ],
        mood: "Sensory moment, intimate ritual, fragrance experience",
      },
      defaultDialogue: "Satu spray aja udah cukup, wanginya langsung nempel dan menyebar sempurna. Top note-nya fresh dan segar, tapi makin lama makin terasa warm dan sensual. Tahan bisa sampai 12 jam lebih tanpa perlu re-spray.",
    },
    {
      scene: 4, name: "Lifestyle — Confidence Boost", duration: 8,
      imagePrompt: {
        pose: "Walking or standing confidently after wearing the perfume",
        expression: "Ultra-confident, head held high, empowered",
        hand_position: "Natural confident pose — adjusting collar or walking",
        eye_direction: "Looking forward confidently",
        additional: "Lifestyle shot showing the confidence boost from wearing the scent",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Follow shot", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Walking with ultimate confidence" },
          { second: 2, action: "People would turn and notice" },
          { second: 4, action: "Stops, adjusts outfit with satisfaction" },
          { second: 6, action: "Radiant confidence, camera catches the aura" },
        ],
        mood: "Confident transformation, irresistible presence, empowered walk",
      },
      defaultDialogue: "Sejak pakai parfum ini, vibes-nya langsung beda. Ke kantor, hangout sama temen, atau dinner romantis, wanginya selalu pas dan bikin percaya diri naik level. Orang-orang pasti nanya, 'Kamu pakai parfum apa sih?'",
    },
    {
      scene: 5, name: "CTA — Premium Close", duration: 8,
      imagePrompt: {
        pose: "Holding bottle toward camera, offering gesture",
        expression: "Warm confident smile, exclusive invitation",
        hand_position: "Presenting bottle toward camera elegantly",
        eye_direction: "Direct to camera, warm and inviting",
        additional: "Final beauty shot with bottle, premium composition",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Slow push in", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Holds perfume bottle elegantly" },
          { second: 2, action: "Presents toward camera" },
          { second: 4, action: "Warm inviting smile" },
          { second: 6, action: "Final luxury shot, bottle and face" },
        ],
        mood: "Premium close, exclusive offer, luxury CTA",
      },
      defaultDialogue: "Parfum se-premium ini biasanya harganya selangit, tapi di sini kamu bisa dapetin dengan harga yang jauh lebih terjangkau! Stok terbatas ya, langsung order lewat link di bio. Gratis packaging eksklusif untuk pembelian hari ini!",
    },
  ],
}

export function buildParfumImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic luxury perfume advertisement photography. A person elegantly presenting a fragrance bottle. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Golden hour lighting, shallow depth of field, premium brand quality. Portrait (9:16).", customPrompt)
}

export function buildParfumVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Luxury fragrance promotion video. Elegant movements, sensual lighting, premium product. Photorealistic quality.", customPrompt)
}
