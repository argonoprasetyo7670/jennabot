/**
 * templates/beauty-food.ts
 * Beauty: Parfum, Skincare, Makeup
 * Food & Beverage: Snack Lebaran, Coffee Shop, Restaurant Menu
 */

import { makeDualPromptTemplate } from "../template-builder"

// ─── BEAUTY ──────────────────────────────────────────────────────────────────

export const PARFUM_LUXURY = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic luxury perfume product photography. Place the exact perfume bottle shown in the third reference image in an elegant scene inspired by the second reference image. Optionally feature the person from the first reference image holding or posing with the fragrance. Dramatic lighting, mist effect, luxury fragrance ad quality. Portrait 9:16.",
  videoPrompt:
    "The perfume bottle elegantly rotates on a reflective surface as a fine mist swirls around it. Camera slowly orbits the bottle revealing its silhouette. Golden light rays pierce through the mist. Luxury fragrance commercial, 8-second cinematic video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const SKINCARE_ROUTINE = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic skincare product photography. Arrange the skincare products shown in the third reference image in a clean aesthetic scene inspired by the second reference image. Soft natural window light, Korean beauty brand aesthetic. The person from the first reference image may appear applying the product. 4K detail. Landscape 16:9.",
  videoPrompt:
    "The skincare products are revealed one by one with graceful hand movements. Close-up of product texture as serum drips. The model gently applies product to glowing skin. Soft natural light, Korean beauty aesthetic, 8-second routine reveal video.",
  imageAspect: "16:9",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "output-only",
})

export const MAKEUP_TUTORIAL = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic beauty portrait. The exact woman from the first reference image is applying the makeup product shown in the third reference image, in the setting from the second reference image. Preserve her face accurately. Close-up beauty shot, perfect skin, dewy finish, ring light reflection in eyes. Beauty brand campaign quality. Portrait 9:16.",
  videoPrompt:
    "The woman gracefully applies makeup with smooth elegant brush strokes, blending product on her skin. Her eyes glitter under the ring light. Camera slowly pushes into a close beauty portrait. Dewy glowing skin, 8-second beauty tutorial video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

// ─── FOOD & BEVERAGE ─────────────────────────────────────────────────────────

export const SNACK_LEBARAN = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic food photography. Display the food/product shown in the third reference image in an elegant appetizing scene inspired by the second reference image. The person from the first reference image may appear enjoying the food. Festive warm tones, premium bakery catalog quality, 4K detail. Landscape 16:9.",
  videoPrompt:
    "The cookies and snacks are beautifully arranged on the golden plate, steam gently rising. A hand elegantly reaches in and picks one up. Camera slowly zooms in revealing the appetizing texture. Warm festive lighting, 8-second food commercial video.",
  imageAspect: "16:9",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const COFFEE_SHOP = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic coffee photography. Show the coffee product/beverage from the third reference image perfectly crafted in the cozy cafe setting from the second reference image. The person from the first reference image may appear enjoying the coffee. Latte art, steam rising, warm morning light. Specialty coffee brand quality. Square 1:1.",
  videoPrompt:
    "Steam slowly rises from the perfectly crafted latte. The barista's hand pours milk creating beautiful latte art in real time. Camera slowly descends from overhead to side angle. Cozy warm cafe ambiance, 5-second artisan coffee brand video.",
  imageAspect: "1:1",
  videoAspect: "9:16",
  videoDuration: "5s",
  outputs: "output-only",
})

export const RESTAURANT_MENU = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic food photography. Present the dish or food product from the third reference image beautifully plated in the restaurant setting from the second reference image. The person from the first reference image may appear as a diner. Artistic sauce drizzle, microgreen garnish. Michelin star quality. Landscape 16:9.",
  videoPrompt:
    "The beautifully plated dish is placed on the table by white-gloved server hands. Camera orbits the plate at table level revealing every detail of the garnish and texture. Ambient restaurant light, Michelin-star dining atmosphere, 8-second fine dining video.",
  imageAspect: "16:9",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})
