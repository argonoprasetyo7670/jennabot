/**
 * templates/tech-auto.ts
 * Tech & Gadget: Smartphone, Laptop, Earbuds
 * Real Estate: Property Tour, Furniture
 * Automotive: Car Showcase, Motor Adventure
 */

import { makeDualPromptTemplate } from "../template-builder"

// ─── TECH & GADGET ───────────────────────────────────────────────────────────

export const SMARTPHONE_REVIEW = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic tech product photography. The exact person from the first reference image is holding or using the smartphone shown in the third reference image, in the setting from the second reference image. Preserve their face accurately. Dramatic studio lighting highlighting the phone's glass and camera. Premium smartphone ad quality. Portrait 9:16.",
  videoPrompt:
    "The person holds the phone up and its screen lights up brilliantly. Camera slowly sweeps from back of device to front, catching the glass shine. The display animates smoothly. Dramatic product reveal lighting, premium smartphone commercial, 8-second cinematic video.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const LAPTOP_WORKSPACE = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic tech lifestyle photography. The exact person from the first reference image is working on the laptop shown in the third reference image, in the workspace setting from the second reference image. Preserve their face accurately. Modern home office aesthetic, warm ambient lighting. Tech brand lifestyle quality. Landscape 16:9.",
  videoPrompt:
    "The person types on the laptop and pauses to look at the screen, a moment of creative focus. Camera slowly pushes in from behind revealing the glowing display. Warm morning light, clean workspace aesthetic, tech lifestyle brand commercial, 8-second video.",
  imageAspect: "16:9",
  videoAspect: "16:9",
  videoDuration: "8s",
  outputs: "output-only",
})

export const EARBUDS_WIRELESS = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic product photography. Show the wireless earbuds from the third reference image in an artistic shot inspired by the second reference image. The person from the first reference image may appear wearing them. Dark gradient background, cyan and purple accent lights, futuristic atmosphere. Premium audio brand quality. Portrait 9:16.",
  videoPrompt:
    "The wireless earbuds float and slowly rotate in zero gravity, LED indicator light pulsing. Cyan energy waves ripple outward from the earbuds. Camera slowly orbits the product 360 degrees. Futuristic audio brand commercial, 5-second cinematic product reveal.",
  imageAspect: "9:16",
  videoAspect: "9:16",
  videoDuration: "5s",
  outputs: "gallery+output",
})

// ─── REAL ESTATE ─────────────────────────────────────────────────────────────

export const PROPERTY_TOUR = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic architectural photography. Showcase the property/room seen in the third reference image, with decor inspired by the second reference image. The person from the first reference image may appear as a resident or agent. Luxurious modern interior, floor-to-ceiling windows, golden hour light. Luxury real estate quality. Landscape 16:9.",
  videoPrompt:
    "A slow cinematic camera dolly glides through the luxurious living room, revealing the space from entrance to panoramic windows. Golden hour sunlight streams in, casting warm rays across the marble floor. Real estate tour reveal, 8-second cinematic property video.",
  imageAspect: "16:9",
  videoAspect: "16:9",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const FURNITURE_SHOWCASE = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic interior design photography. Place the furniture/product shown in the third reference image in a living room inspired by the second reference image. The person from the first reference image may appear enjoying the space. Scandinavian aesthetic, soft natural daylight. IKEA catalog quality, 4K detail. Landscape 16:9.",
  videoPrompt:
    "Camera slowly pans across the Scandinavian living room, pausing to highlight the hero furniture piece with a slow push-in. Soft natural daylight shifts subtly, creating living shadows. Interior design reveal, 8-second lifestyle brand video.",
  imageAspect: "16:9",
  videoAspect: "16:9",
  videoDuration: "8s",
  outputs: "output-only",
})

// ─── AUTOMOTIVE ──────────────────────────────────────────────────────────────

export const CAR_SHOWCASE = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic automotive photography. Feature the car shown in the third reference image in the dramatic setting from the second reference image. The person from the first reference image may appear as the driver. Metallic finish, wet reflective surface at night, neon city lights. Low angle three-quarter view. Premium automotive brand campaign quality. Landscape 16:9.",
  videoPrompt:
    "The car headlights dramatically flicker on, illuminating the wet road. Camera slowly sweeps from hood to tail in a low-angle cinematic arc. Neon city reflections ripple on the metallic surface. Premium automotive commercial, 8-second cinematic reveal.",
  imageAspect: "16:9",
  videoAspect: "16:9",
  videoDuration: "8s",
  outputs: "gallery+output",
})

export const MOTOR_ADVENTURE = makeDualPromptTemplate({
  imagePrompt:
    "Ultra-realistic motorcycle photography. Feature the motorcycle from the third reference image in the landscape/setting from the second reference image. The person from the first reference image may appear as the rider. Mountain cliff edge with breathtaking panorama, early morning golden hour, dramatic clouds. Adventure motorcycle magazine quality. Landscape 16:9.",
  videoPrompt:
    "The motorcycle engine revs as the rider throttles up, dust kicking from the rear wheel. Camera sweeps from dramatic low ground angle up to the silhouetted rider against the sunrise panorama. Epic adventure motorcycle commercial, 8-second cinematic video.",
  imageAspect: "16:9",
  videoAspect: "16:9",
  videoDuration: "8s",
  outputs: "output-only",
})
