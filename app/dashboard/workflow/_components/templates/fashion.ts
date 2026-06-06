/**
 * templates/fashion.ts
 * Fashion templates: Gamis, Hijab, Kaos Pria, Kemeja Formal
 * Footwear: Sneakers
 * Aksesori: Tas Handbag, Jam Tangan, Kacamata
 */

import { makeDualPromptTemplate } from "../template-builder"

// ─── FASHION WANITA ──────────────────────────────────────────────────────────

export const GAMIS_PROMO = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic fashion photography. The exact woman from the first reference image is wearing the gamis dress shown in the third reference image, posed in the location from the second reference image. Preserve her face, hijab style, and skin tone precisely. Full body shot, soft diffused natural lighting, high-end fashion catalog quality. Portrait 9:16.",
  videoPrompt:
    "The woman gracefully turns and poses, the gamis dress flowing beautifully with natural movement. Camera slowly circles from front to side revealing the full outfit. Soft cinematic lighting, 8-second fashion editorial video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const HIJAB_STYLING = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic fashion portrait. The exact woman from the first reference image is wearing the hijab style shown in the third reference image, photographed in the setting from the second reference image. Preserve her face and features accurately. Warm golden hour lighting, gentle smile. Photorealistic, high-end fashion magazine quality. Portrait 9:16.",
  videoPrompt:
    "The woman gently tilts her head and smiles warmly at the camera, hijab draping naturally. Soft golden hour light glows around her. Camera slowly pushes in for a close portrait. Elegant cinematic, 8-second fashion showcase video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "output-only",
})

// ─── FASHION PRIA ────────────────────────────────────────────────────────────

export const KAOS_PRIA_URBAN = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic street fashion photography. The exact man from the first reference image is wearing the t-shirt shown in the third reference image, standing in the urban environment from the second reference image. Preserve his face and physique accurately. Half-body shot, golden hour lighting. Photorealistic, streetwear catalog quality. Portrait 9:16.",
  videoPrompt:
    "The man walks forward confidently through the urban street scene, casual streetwear energy. Camera tracks alongside him at a cool low angle. Golden hour light, dynamic cinematic motion, 8-second streetwear campaign video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const KEMEJA_PRIA_FORMAL = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic professional fashion photography. The exact man from the first reference image is wearing the dress shirt shown in the third reference image, posed in the office setting from the second reference image. Preserve his face, features, and skin tone accurately. Three-quarter body shot, professional studio lighting, confident posture. Photorealistic, premium menswear catalog quality. Portrait 9:16.",
  videoPrompt:
    "The man adjusts his collar and looks confidently at the camera, exuding professional authority. Camera slowly pushes in from full body to portrait. Premium office ambiance, subtle cinematic motion, 8-second menswear campaign video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "output-only",
})

// ─── FOOTWEAR ────────────────────────────────────────────────────────────────

export const SEPATU_SNEAKERS = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic product photography. The exact person from the first reference image is wearing the sneakers shown in the third reference image, photographed in the setting from the second reference image. Preserve the model's face accurately. Dramatic lighting highlighting shoe texture and design. Photorealistic, high-end sneaker brand quality. Portrait 9:16.",
  videoPrompt:
    "Close-up shot of the sneakers as the model lifts one foot and taps the sole confidently. Camera slowly rises from shoe level to full body hero shot. Dramatic lighting sweep, cinematic sneaker brand commercial, 8-second video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

// ─── AKSESORIS ───────────────────────────────────────────────────────────────

export const TAS_HANDBAG = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic luxury product photography. The exact woman from the first reference image is holding the handbag shown in the third reference image, walking in the elegant setting from the second reference image. Preserve her face and features accurately. The bag is the focal point showing texture and craftsmanship. Fashion editorial quality. Portrait 9:16.",
  videoPrompt:
    "The woman walks elegantly, swinging the handbag with poise. Camera smoothly pans alongside her at mid-distance. Soft bokeh background, fashion editorial motion, 8-second luxury brand video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "output-only",
})

export const JAM_TANGAN_LUXURY = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic luxury watch photography. The exact person from the first reference image is wearing the watch shown in the third reference image on their wrist, in the elegant setting from the second reference image. Close-up showcasing dial details, hands, and bezel. Swiss watchmaker catalog quality, extreme 4K detail. Landscape 16:9.",
  videoPrompt:
    "The watch on the wrist catches light as the hand slowly rotates revealing the dial. Camera macro pushes in on the watch face showing every intricate detail. Dramatic rim lighting sweep, Swiss luxury watchmaker commercial, 8-second cinematic video.",
  imageAspect: "16:9",
  videoAspect: "16:9",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const KACAMATA_TRENDY = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic fashion photography. The exact person from the first reference image is wearing the sunglasses shown in the third reference image, photographed in the setting from the second reference image. Preserve their face and features accurately. Golden hour sunlight creating beautiful lens flare, relaxed cool expression. Designer eyewear campaign quality. Portrait 9:16.",
  videoPrompt:
    "The person slowly removes their sunglasses, smiles at the camera, then puts them back on with cool confidence. Golden hour lens flare sparkles. Camera holds steady then slowly pushes in. Designer eyewear brand commercial, 5-second cinematic video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "5s",
  outputs: "output-only",
})
