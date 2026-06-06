/**
 * templates/social-fitness.ts
 * Social Media: TikTok Hook
 * Health & Fitness: Fitness Motivation, Healthy Food
 *
 * Note: Instagram Carousel & YouTube Thumbnail are defined in umum.ts
 * because they use a non-standard node layout (no videoGen node).
 */

import { makeDualPromptTemplate } from "../template-builder"

// ─── SOCIAL MEDIA ────────────────────────────────────────────────────────────

export const TIKTOK_HOOK = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic TikTok thumbnail. The exact person from the first reference image has a shocked/surprised expression, pointing off-screen, posed in the setting from the second reference image. Feature the product from the third reference image. Preserve their face accurately. Bold energetic vibe, colorful pop art elements. Viral TikTok quality. Portrait 9:16.",
  videoPrompt:
    "The person dramatically reacts with exaggerated surprise, quickly pointing at the product on screen. Camera shakes with energetic handheld motion. Bold TikTok viral energy, zoom-in hook moment, 5-second attention-grabbing video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "5s",
  outputs: "gallery+output",
})

// ─── HEALTH & FITNESS ────────────────────────────────────────────────────────

export const FITNESS_MOTIVATION = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic fitness photography. The exact person from the first reference image is mid-workout wearing the fitness apparel/gear from the third reference image, in the gym setting from the second reference image. Preserve their face and physique accurately. Dynamic exercise pose, motion blur, moody spotlight. Nike/Under Armour campaign quality. Portrait 9:16.",
  videoPrompt:
    "The athlete performs a powerful explosive movement — heavy lift, box jump, or sprint. Slow motion captures every muscle in motion. Sweat droplets fly dramatically. Camera holds low angle then sweeps up. Intense fitness brand commercial, 8-second motivational video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const HEALTHY_FOOD = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic food photography. Present the healthy food/product from the third reference image in a fresh vibrant setting inspired by the second reference image. The person from the first reference image may appear enjoying the meal. Colorful meal prep bowl, bright natural lighting, marble countertop, top-down flat lay. Health food brand quality. Square 1:1.",
  videoPrompt:
    "Overhead camera slowly descends toward the colorful healthy bowl, ingredients looking fresh and vibrant. A hand drizzles dressing in a graceful arc over the bowl. Camera tilts to side-angle close-up of the food. Health food brand reveal, 5-second appetizing video.",
  imageAspect: "1:1",
  videoAspect: "9:16",
  videoDuration: "5s",
  outputs: "output-only",
})
