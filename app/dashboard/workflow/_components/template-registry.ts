/**
 * template-registry.ts
 * Central registry: TEMPLATES catalog + getTemplateData() lookup.
 *
 * Adding a new template:
 *   1. Define its data in the appropriate templates/*.ts file
 *   2. Import it here and add to TEMPLATE_DATA_MAP
 *   3. Add its TemplateInfo to the TEMPLATES array
 */

import { buildTemplate } from "./template-builder"
import type { SerializedNode, SerializedEdge, TemplateRef, TemplateInfo } from "./workflow-types"

// ─── Template data imports ────────────────────────────────────────────────────

import {
  IMAGE_TO_VIDEO,
  PRODUCT_REVIEW,
  MODEL_PRODUCT_PROMO,
  INSTAGRAM_CAROUSEL,
  YOUTUBE_THUMBNAIL,
} from "./templates/umum"

import {
  GAMIS_PROMO,
  HIJAB_STYLING,
  KAOS_PRIA_URBAN,
  KEMEJA_PRIA_FORMAL,
  SEPATU_SNEAKERS,
  TAS_HANDBAG,
  JAM_TANGAN_LUXURY,
  KACAMATA_TRENDY,
} from "./templates/fashion"

import {
  PARFUM_LUXURY,
  SKINCARE_ROUTINE,
  MAKEUP_TUTORIAL,
  SNACK_LEBARAN,
  COFFEE_SHOP,
  RESTAURANT_MENU,
} from "./templates/beauty-food"

import {
  SMARTPHONE_REVIEW,
  LAPTOP_WORKSPACE,
  EARBUDS_WIRELESS,
  PROPERTY_TOUR,
  FURNITURE_SHOWCASE,
  CAR_SHOWCASE,
  MOTOR_ADVENTURE,
} from "./templates/tech-auto"

import {
  TIKTOK_HOOK,
  FITNESS_MOTIVATION,
  HEALTHY_FOOD,
} from "./templates/social-fitness"

// ─── Standard 3 references ───────────────────────────────────────────────────

/** 3 upload refs required by every non-blank template */
export const STANDARD_REFS: TemplateRef[] = [
  { id: "u_model",    label: "Foto Model / Talent", icon: "🧑",  description: "Foto wajah atau badan model yang akan dipakai" },
  { id: "u_bg",      label: "Background",            icon: "🌄",  description: "Foto latar belakang / background scene" },
  { id: "u_product", label: "Foto Produk",           icon: "📦",  description: "Foto produk yang akan dipakai / ditampilkan" },
]

// ─── Template data map ────────────────────────────────────────────────────────

/** Maps template ID → raw { nodes, edges } (before STD upload nodes are injected) */
const TEMPLATE_DATA_MAP: Record<string, { nodes: SerializedNode[]; edges: SerializedEdge[] }> = {
  // Umum
  "image-to-video":      IMAGE_TO_VIDEO,
  "product-review":      PRODUCT_REVIEW,
  "model-product-promo": MODEL_PRODUCT_PROMO,
  "instagram-carousel":  INSTAGRAM_CAROUSEL,
  "youtube-thumbnail":   YOUTUBE_THUMBNAIL,

  // Fashion Wanita
  "gamis-promo":         GAMIS_PROMO,
  "hijab-styling":       HIJAB_STYLING,

  // Fashion Pria
  "kaos-pria-urban":     KAOS_PRIA_URBAN,
  "kemeja-pria-formal":  KEMEJA_PRIA_FORMAL,

  // Footwear
  "sepatu-sneakers":     SEPATU_SNEAKERS,

  // Aksesoris
  "tas-handbag":         TAS_HANDBAG,
  "jam-tangan-luxury":   JAM_TANGAN_LUXURY,
  "kacamata-trendy":     KACAMATA_TRENDY,

  // Beauty
  "parfum-luxury":       PARFUM_LUXURY,
  "skincare-routine":    SKINCARE_ROUTINE,
  "makeup-tutorial":     MAKEUP_TUTORIAL,

  // Food & Beverage
  "snack-lebaran":       SNACK_LEBARAN,
  "coffee-shop":         COFFEE_SHOP,
  "restaurant-menu":     RESTAURANT_MENU,

  // Tech & Gadget
  "smartphone-review":   SMARTPHONE_REVIEW,
  "laptop-workspace":    LAPTOP_WORKSPACE,
  "earbuds-wireless":    EARBUDS_WIRELESS,

  // Real Estate
  "property-tour":       PROPERTY_TOUR,
  "furniture-showcase":  FURNITURE_SHOWCASE,

  // Automotive
  "car-showcase":        CAR_SHOWCASE,
  "motor-adventure":     MOTOR_ADVENTURE,

  // Social Media
  "tiktok-hook":         TIKTOK_HOOK,

  // Health & Fitness
  "fitness-motivation":  FITNESS_MOTIVATION,
  "healthy-food":        HEALTHY_FOOD,
}

// ─── getTemplateData ─────────────────────────────────────────────────────────

/**
 * Returns fully assembled { nodes, edges } for a given template ID.
 * Injects STD upload nodes + reference edges automatically.
 * Returns empty arrays for the "blank" template or unknown IDs.
 */
export function getTemplateData(
  template?: string,
  preloadedNodes?: Record<string, Record<string, unknown>>
): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  if (!template || template === "blank") return { nodes: [], edges: [] }

  const data = TEMPLATE_DATA_MAP[template]
  if (!data) {
    console.warn(`[workflow] Unknown template: "${template}"`)
    return { nodes: [], edges: [] }
  }

  return buildTemplate(data.nodes, data.edges, preloadedNodes)
}

// ─── TEMPLATES catalog ───────────────────────────────────────────────────────

export const TEMPLATES: TemplateInfo[] = [
  // ── Umum ──
  { id: "blank",             name: "Kosong",          description: "Canvas kosong, buat workflow dari awal",                                             icon: "📄", color: "slate",   category: "Umum" },
  { id: "model-product-promo",name: "Model + Produk", description: "Template utama — model memakai produk di depan background. Generate foto & video promo", icon: "💎", color: "violet",  category: "Umum",            requiredRefs: STANDARD_REFS },
  { id: "image-to-video",    name: "Image to Video",  description: "Generate foto dari referensi model/produk/background → jadikan video",               icon: "🎬", color: "violet",  category: "Umum",            requiredRefs: STANDARD_REFS },
  { id: "product-review",    name: "Product Review",  description: "Model memakai produk → foto review + video promo",                                   icon: "📦", color: "blue",    category: "Umum",            requiredRefs: STANDARD_REFS },

  // ── Fashion Wanita ──
  { id: "gamis-promo",       name: "Gamis Promotion", description: "Busana muslim wanita — gamis elegan dengan video cinematic",                         icon: "👗", color: "violet",  category: "Fashion Wanita",  requiredRefs: STANDARD_REFS },
  { id: "hijab-styling",     name: "Hijab Styling",   description: "Hijab & kerudung — showcase styling modern",                                         icon: "🧕", color: "pink",    category: "Fashion Wanita",  requiredRefs: STANDARD_REFS },

  // ── Fashion Pria ──
  { id: "kaos-pria-urban",   name: "Kaos Pria Urban", description: "Streetwear casual — urban style kekinian",                                           icon: "👕", color: "emerald", category: "Fashion Pria",    requiredRefs: STANDARD_REFS },
  { id: "kemeja-pria-formal",name: "Kemeja Formal",   description: "Smart-casual — kemeja pria profesional",                                             icon: "👔", color: "indigo",  category: "Fashion Pria",    requiredRefs: STANDARD_REFS },

  // ── Footwear ──
  { id: "sepatu-sneakers",   name: "Sneakers",        description: "Sneakers & sepatu — hero shot dramatic",                                             icon: "👟", color: "blue",    category: "Footwear",        requiredRefs: STANDARD_REFS },

  // ── Aksesoris ──
  { id: "tas-handbag",       name: "Tas & Handbag",   description: "Bag showcase — lifestyle editorial",                                                 icon: "👜", color: "amber",   category: "Aksesoris",       requiredRefs: STANDARD_REFS },
  { id: "jam-tangan-luxury", name: "Jam Tangan",      description: "Watch — premium luxury close-up",                                                    icon: "⌚", color: "slate",   category: "Aksesoris",       requiredRefs: STANDARD_REFS },
  { id: "kacamata-trendy",   name: "Kacamata",        description: "Eyewear — trendy lifestyle shot",                                                    icon: "🕶️", color: "cyan",    category: "Aksesoris",       requiredRefs: STANDARD_REFS },

  // ── Beauty ──
  { id: "parfum-luxury",     name: "Parfum",          description: "Fragrance — luxury sensual presentation",                                            icon: "🌸", color: "rose",    category: "Beauty",          requiredRefs: STANDARD_REFS },
  { id: "skincare-routine",  name: "Skincare",        description: "Skincare products — clean fresh aesthetic",                                          icon: "✨", color: "emerald", category: "Beauty",          requiredRefs: STANDARD_REFS },
  { id: "makeup-tutorial",   name: "Makeup",          description: "Makeup application — beauty influencer style",                                       icon: "💄", color: "pink",    category: "Beauty",          requiredRefs: STANDARD_REFS },

  // ── Food & Beverage ──
  { id: "snack-lebaran",     name: "Snack Lebaran",   description: "Kue & snack — festive appetizing display",                                           icon: "🍪", color: "orange",  category: "Food & Beverage", requiredRefs: STANDARD_REFS },
  { id: "coffee-shop",       name: "Coffee Shop",     description: "Kopi & latte art — cozy cafe aesthetic",                                             icon: "☕", color: "amber",   category: "Food & Beverage", requiredRefs: STANDARD_REFS },
  { id: "restaurant-menu",   name: "Menu Restoran",   description: "Fine dining — gourmet food photography",                                             icon: "🍽️", color: "rose",    category: "Food & Beverage", requiredRefs: STANDARD_REFS },

  // ── Tech & Gadget ──
  { id: "smartphone-review", name: "Smartphone",      description: "Phone — dramatic product reveal",                                                    icon: "📱", color: "violet",  category: "Tech & Gadget",   requiredRefs: STANDARD_REFS },
  { id: "laptop-workspace",  name: "Laptop & Setup",  description: "Workspace — modern tech lifestyle",                                                  icon: "💻", color: "blue",    category: "Tech & Gadget",   requiredRefs: STANDARD_REFS },
  { id: "earbuds-wireless",  name: "Earbuds",         description: "Audio gear — futuristic floating shot",                                              icon: "🎧", color: "cyan",    category: "Tech & Gadget",   requiredRefs: STANDARD_REFS },

  // ── Real Estate ──
  { id: "property-tour",     name: "Property Tour",   description: "Interior luxury — wide-angle room showcase",                                         icon: "🏠", color: "amber",   category: "Real Estate",     requiredRefs: STANDARD_REFS },
  { id: "furniture-showcase",name: "Furniture",       description: "Interior design — Scandinavian living room",                                         icon: "🛋️", color: "emerald", category: "Real Estate",     requiredRefs: STANDARD_REFS },

  // ── Automotive ──
  { id: "car-showcase",      name: "Mobil",           description: "Sports car — cinematic night shot",                                                  icon: "🏎️", color: "slate",   category: "Automotive",      requiredRefs: STANDARD_REFS },
  { id: "motor-adventure",   name: "Motor Adventure", description: "Motorcycle — epic landscape adventure",                                              icon: "🏍️", color: "orange",  category: "Automotive",      requiredRefs: STANDARD_REFS },

  // ── Social Media ──
  { id: "instagram-carousel",name: "IG Carousel",     description: "Instagram slide — bold gradient design",                                             icon: "📸", color: "pink",    category: "Social Media",    requiredRefs: STANDARD_REFS },
  { id: "tiktok-hook",       name: "TikTok Hook",     description: "TikTok thumbnail — viral reaction style",                                            icon: "🎵", color: "rose",    category: "Social Media",    requiredRefs: STANDARD_REFS },
  { id: "youtube-thumbnail", name: "YT Thumbnail",    description: "YouTube thumbnail — click-bait dramatic",                                            icon: "▶️", color: "red",     category: "Social Media",    requiredRefs: STANDARD_REFS },

  // ── Health & Fitness ──
  { id: "fitness-motivation",name: "Fitness",         description: "Workout — dramatic athletic shot",                                                   icon: "💪", color: "emerald", category: "Health & Fitness", requiredRefs: STANDARD_REFS },
  { id: "healthy-food",      name: "Healthy Food",    description: "Meal prep — colorful nutrition bowl",                                                icon: "🥗", color: "green",   category: "Health & Fitness", requiredRefs: STANDARD_REFS },
]

/** Get unique template categories (excluding blank) */
export function getTemplateCategories(): string[] {
  return [...new Set(TEMPLATES.filter(t => t.id !== "blank").map(t => t.category))]
}
