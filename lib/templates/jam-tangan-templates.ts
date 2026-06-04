/**
 * Template: Jam Tangan — 5-scene luxury watch promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const JAM_TANGAN_TEMPLATE: TemplateDefinition = {
  id: "jam-tangan-promotion",
  name: "Jam Tangan Promotion",
  description: "Video promosi jam tangan dengan 5 scene premium wrist reveal & detail",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle. Do NOT change any facial feature or hair.",
    outfit: "Same outfit and watch as shown in references — exact same watch design, strap color, dial face. Clothes matching reference exactly.",
    background: "REPLICATE the exact background from BACKGROUND reference — same surfaces, objects, lighting, colors. Do NOT substitute or modify the location.",
    mood: "Premium, sophisticated, refined masculinity/elegance",
    style: "Ultra-realistic luxury watch advertisement photography, dramatic side lighting, premium feel. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — Wrist Reveal", duration: 8,
      imagePrompt: {
        pose: "Adjusting sleeve to reveal watch on wrist, elegant gesture",
        expression: "Sophisticated confidence, subtle smile",
        hand_position: "One hand pulling back sleeve, watch wrist exposed",
        eye_direction: "Looking at camera confidently",
        additional: "Medium-close shot, watch clearly visible on wrist, dramatic lighting",
      },
      videoPrompt: {
        camera: { start: "Close-up on cuff/wrist", movement: "Pull back to face", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Hand adjusts sleeve revealing watch" },
          { second: 2, action: "Watch catches the light, gleaming" },
          { second: 4, action: "Camera pulls back revealing the person" },
          { second: 6, action: "Confident look, sophisticated energy" },
        ],
        mood: "Luxurious reveal, premium first impression, sophisticated",
      },
      defaultDialogue: "Sebuah jam tangan bisa menentukan kesan pertama kamu. Dan jam tangan ini? Bukan cuma aksesoris, ini statement piece yang bikin kamu langsung keliatan beda. Yuk aku tunjukin kenapa jam ini layak jadi koleksi kamu.",
    },
    {
      scene: 2, name: "Showcase — Dial & Design", duration: 8,
      imagePrompt: {
        pose: "Holding watch showing dial face directly to camera",
        expression: "Admiring, appreciative of craftsmanship",
        hand_position: "Watch face angled to show dial details and indices",
        eye_direction: "Looking at the watch dial",
        additional: "Close-up hero shot, dial details visible — indices, hands, brand logo",
      },
      videoPrompt: {
        camera: { start: "Macro on dial", movement: "Orbit around watch", end: "Three-quarter angle" },
        action_sequence: [
          { second: 0, action: "Macro close-up on watch dial" },
          { second: 2, action: "Shows indices and hand movement" },
          { second: 4, action: "Rotates to show case profile" },
          { second: 6, action: "Light catches crystal, beautiful reflection" },
        ],
        mood: "Craftsmanship appreciation, horological beauty, premium detail",
      },
      defaultDialogue: "Lihat dial-nya, desainnya clean tapi mewah banget. Angka index-nya presisi, jarum-nya lume supaya bisa dibaca di gelap. Kaca sapphire-nya anti gores, dan movement-nya smooth. Ini craftsmanship yang beneran berkelas.",
    },
    {
      scene: 3, name: "Detail — Case & Strap Quality", duration: 8,
      imagePrompt: {
        pose: "Showing strap texture and case side profile",
        expression: "Focused on quality details",
        hand_position: "Fingers on strap showing texture and buckle",
        eye_direction: "Looking at strap/case detail",
        additional: "Macro detail shot, strap grain/pattern visible, case finishing visible",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push to macro", end: "Extreme close-up" },
        action_sequence: [
          { second: 0, action: "Shows strap material and buckle" },
          { second: 2, action: "Fingers feel strap texture" },
          { second: 4, action: "Shows case side profile and crown" },
          { second: 6, action: "Crown detail and case finishing visible" },
        ],
        mood: "Material quality, tactile luxury, premium build",
      },
      defaultDialogue: "Nah material-nya ini yang bikin beda sama jam biasa. Strap-nya genuine leather, lembut di kulit tapi kuat dan tahan lama. Case-nya stainless steel brushed finishing, berat di tangan tapi nyaman. Detail crown-nya juga halus dan presisi banget.",
    },
    {
      scene: 4, name: "Lifestyle — Power Dressing", duration: 8,
      imagePrompt: {
        pose: "Professional or lifestyle shot wearing the watch",
        expression: "Confident, successful, refined",
        hand_position: "Natural — adjusting tie, cufflinks, or casually showing wrist",
        eye_direction: "Looking forward with determination or at camera",
        additional: "Lifestyle shot showing watch in context of daily success",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Dolly in", end: "Medium-close on wrist" },
        action_sequence: [
          { second: 0, action: "Professional setting, wearing the watch" },
          { second: 2, action: "Checks time with elegant gesture" },
          { second: 4, action: "Watch visible during professional activity" },
          { second: 6, action: "Close-up on wrist in action" },
        ],
        mood: "Professional success, power dressing, refined lifestyle",
      },
      defaultDialogue: "Mau meeting penting, dinner formal, atau casual weekend, jam tangan ini selalu pas. Dia versatile banget, bisa match sama outfit apa aja. Setiap kali orang lihat jam ini di tangan kamu, langsung tahu kamu orangnya berkelas.",
    },
    {
      scene: 5, name: "CTA — Collection Worthy", duration: 8,
      imagePrompt: {
        pose: "Final power pose, watch prominently displayed",
        expression: "Confident inviting smile, exclusive offer energy",
        hand_position: "Wrist forward showing watch, other hand gesturing",
        eye_direction: "Direct to camera, confident invitation",
        additional: "Premium composition, watch hero shot on wrist, editorial lighting",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in", end: "Close-up on watch and face" },
        action_sequence: [
          { second: 0, action: "Final confident pose with watch displayed" },
          { second: 2, action: "Shows watch one more time, best angle" },
          { second: 4, action: "Inviting gesture to camera" },
          { second: 6, action: "Confident close, CTA energy" },
        ],
        mood: "Premium CTA, collection-worthy, exclusive opportunity",
      },
      defaultDialogue: "Jam tangan se-premium ini biasanya harganya jutaan, tapi sekarang kamu bisa dapetin dengan harga spesial yang nggak akan kamu temuin di tempat lain! Stok limited edition ya, langsung klik link di bio sebelum kehabisan. Jangan sampai nyesel!",
    },
  ],
}

export function buildJamTanganImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic luxury watch advertisement photography. A person showcasing an elegant timepiece. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Dramatic side lighting, premium feel, macro detail capability. Portrait (9:16).", customPrompt)
}

export function buildJamTanganVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Luxury watch promotion video. Premium presentation, macro details, sophisticated lighting. Photorealistic quality.", customPrompt)
}
