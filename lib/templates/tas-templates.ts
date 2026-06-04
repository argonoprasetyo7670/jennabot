/**
 * Template: Tas — 5-scene bag/handbag promotion video
 */

import type { TemplateDefinition, SceneTemplate, ConsistencyAnchors } from "./types"
import { buildStandardImagePrompt, buildStandardVideoPrompt } from "./prompt-utils"

export const TAS_TEMPLATE: TemplateDefinition = {
  id: "tas-promotion",
  name: "Tas Promotion",
  description: "Video promosi tas/handbag dengan 5 scene design, compartments & lifestyle",
  consistencyAnchors: {
    character: "CLONE the exact person from MODEL reference — identical face shape, nose, lips, eyes, skin tone, hairstyle/hijab. Do NOT change any facial feature or hair.",
    outfit: "Same outfit and bag as shown in references — exact same bag color, shape, hardware, strap style. Clothes matching reference exactly.",
    background: "REPLICATE the exact background from BACKGROUND reference — same walls, floor, furniture, lighting. Do NOT substitute or modify the location.",
    mood: "Stylish, practical, fashionable — chic urban vibe",
    style: "Ultra-realistic fashion accessory photography, clean composition, lifestyle editorial quality. Must look like a real photograph, NOT AI-generated.",
  },
  scenes: [
    {
      scene: 1, name: "Hook — First Impression", duration: 8,
      imagePrompt: {
        pose: "Holding bag up showing design, excited",
        expression: "Excited, proud, showing off",
        hand_position: "One hand holding bag handle, other supporting bottom",
        eye_direction: "Looking at camera with excitement",
        additional: "Medium shot, bag clearly visible, design details prominent",
      },
      videoPrompt: {
        camera: { start: "Close-up on bag", movement: "Pull back to person", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Bag in close-up showing design" },
          { second: 2, action: "Camera reveals person holding it" },
          { second: 4, action: "Holds bag up showing size and shape" },
          { second: 6, action: "Excited expression, admiring the bag" },
        ],
        mood: "Exciting reveal, fashion-forward, first impression wow",
      },
      defaultDialogue: "Hai girls! Aku lagi excited banget nih mau review tas baru yang menurut aku desainnya kece parah. Dari pertama lihat udah langsung jatuh cinta. Material-nya premium, bentuknya elegan, dan cocok banget buat daily use!",
    },
    {
      scene: 2, name: "Showcase — Design & Hardware", duration: 8,
      imagePrompt: {
        pose: "Presenting bag showing hardware, zippers, and design details",
        expression: "Appreciative, showcasing proudly",
        hand_position: "Fingers touching hardware/zipper/buckle detail",
        eye_direction: "Looking at bag details",
        additional: "Close-up showing hardware quality, brand details, zipper",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push to detail", end: "Close-up hardware" },
        action_sequence: [
          { second: 0, action: "Shows front design of bag" },
          { second: 2, action: "Points out hardware and buckle quality" },
          { second: 4, action: "Shows zipper smoothness" },
          { second: 6, action: "Turns bag showing all sides" },
        ],
        mood: "Quality showcase, premium hardware, design excellence",
      },
      defaultDialogue: "Detailnya ini yang bikin tas ini worth every penny. Hardware-nya kokoh, warna gold-nya nggak gampang pudar. Zipper-nya smooth banget, nggak pernah nyangkut. Jahitan pinggirnya rapi dan kuat. Ini kualitas yang bisa kamu banggain.",
    },
    {
      scene: 3, name: "Practical — Compartments & Space", duration: 8,
      imagePrompt: {
        pose: "Opening bag showing compartments and interior",
        expression: "Impressed by how much fits, informative",
        hand_position: "Both hands opening bag showing interior pockets",
        eye_direction: "Looking inside bag, then at camera",
        additional: "Open bag shot showing organized compartments, items inside",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push to interior view", end: "Inside bag close-up" },
        action_sequence: [
          { second: 0, action: "Opens bag showing main compartment" },
          { second: 2, action: "Shows phone pocket, zippered section" },
          { second: 4, action: "Puts items in showing capacity" },
          { second: 6, action: "Closes bag neatly, satisfied" },
        ],
        mood: "Practical showcase, organized life, functional fashion",
      },
      defaultDialogue: "Yang bikin aku makin suka, dalemnya luas banget dan terorganisir. Ada slot buat HP, dompet, pouch makeup, dan masih ada ruang lebih. Muat semua kebutuhan kamu tanpa bikin tas jadi berat atau kehilangan bentuknya.",
    },
    {
      scene: 4, name: "Lifestyle — On The Go", duration: 8,
      imagePrompt: {
        pose: "Wearing bag while walking or doing activity",
        expression: "Confident, stylish, on-the-go energy",
        hand_position: "Bag on shoulder/arm naturally, free hand natural",
        eye_direction: "Looking forward or slightly off camera",
        additional: "Lifestyle shot, bag worn naturally, full outfit coordination",
      },
      videoPrompt: {
        camera: { start: "Wide shot", movement: "Follow shot", end: "Medium shot" },
        action_sequence: [
          { second: 0, action: "Walking with bag, looking stylish" },
          { second: 2, action: "Adjusts bag on shoulder casually" },
          { second: 4, action: "Shows how bag fits with daily outfit" },
          { second: 6, action: "Confident walk, bag completes the look" },
        ],
        mood: "Urban lifestyle, confident woman on-the-go, fashion-forward",
      },
      defaultDialogue: "Pas dipakai langsung keliatan mahal dan classy. Strap-nya nyaman di bahu, nggak bikin sakit meskipun isinya lumayan berat. Mau ke kantor, ke mall, hangout sama temen, tas ini selalu bikin penampilan kamu naik level.",
    },
    {
      scene: 5, name: "CTA — Must-Have Close", duration: 8,
      imagePrompt: {
        pose: "Holding bag toward camera, inviting gesture",
        expression: "Warm smile, confident recommendation",
        hand_position: "Presenting bag toward camera",
        eye_direction: "Direct to camera, warm invitation",
        additional: "Medium shot, bag as hero, final composition",
      },
      videoPrompt: {
        camera: { start: "Medium shot", movement: "Push in", end: "Close-up" },
        action_sequence: [
          { second: 0, action: "Final pose with bag" },
          { second: 2, action: "Presents bag toward camera" },
          { second: 4, action: "Warm inviting gesture" },
          { second: 6, action: "Confident close, CTA energy" },
        ],
        mood: "Must-have energy, warm CTA, confident close",
      },
      defaultDialogue: "Ini sih tas yang wajib banget kamu punya! Kualitas premium, desain timeless, dan harganya super worth it. Stoknya terbatas ya, jadi langsung aja klik link di bio atau chat admin sekarang. Ada bonus pouch eksklusif buat early birds!",
    },
  ],
}

export function buildTasImagePrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, customPrompt?: string): string {
  return buildStandardImagePrompt(scene, anchors, dialogue,
    "Ultra-realistic fashion bag/handbag photography. A person showcasing a stylish bag. " +
    "Must look like a REAL photograph — NOT AI-generated. " +
    "Clean composition, lifestyle editorial quality. Portrait (9:16).", customPrompt)
}

export function buildTasVideoPrompt(scene: SceneTemplate, anchors: ConsistencyAnchors, dialogue: string, backsound: boolean, customPrompt?: string): string {
  return buildStandardVideoPrompt(scene, anchors, dialogue, backsound,
    "Bag/handbag promotion video. Stylish presentation, practical feature showcase. Photorealistic quality.", customPrompt)
}
