/**
 * Video Template Registry
 *
 * Central registry for all video templates. Components read from here dynamically.
 *
 * ## Why templates live in TS files (not database)
 *
 * 1. Prompt builders are **functions with logic** — can't serialize to DB without a template engine
 * 2. Template structures are deeply nested (scenes → imagePrompt → camera → action_sequence)
 * 3. Full TypeScript type safety catches errors at compile time
 * 4. Git-tracked changes with rollback capability
 * 5. Zero latency — no DB query needed
 * 6. Template count is small (10) and changes infrequently
 *
 * If dynamic templates are needed later, use a **hybrid approach**:
 * - Template metadata (name, icon, description) → DB (admin CRUD)
 * - Prompt builders (logic) → TS files (mapped by template ID)
 */

import type { TemplateRegistryEntry } from "./types"

// Template imports
import { GAMIS_TEMPLATE, buildGamisImagePrompt, buildGamisVideoPrompt } from "./gamis-templates"
import { SEPATU_TEMPLATE, buildSepatuImagePrompt, buildSepatuVideoPrompt } from "./sepatu-templates"
import { PARFUM_TEMPLATE, buildParfumImagePrompt, buildParfumVideoPrompt } from "./parfum-templates"
import { TAS_TEMPLATE, buildTasImagePrompt, buildTasVideoPrompt } from "./tas-templates"
import { JAM_TANGAN_TEMPLATE, buildJamTanganImagePrompt, buildJamTanganVideoPrompt } from "./jam-tangan-templates"
import { KACAMATA_TEMPLATE, buildKacamataImagePrompt, buildKacamataVideoPrompt } from "./kacamata-templates"
import { HIJAB_TEMPLATE, buildHijabImagePrompt, buildHijabVideoPrompt } from "./hijab-templates"
import { KAOS_PRIA_TEMPLATE, buildKaosPriaImagePrompt, buildKaosPriaVideoPrompt } from "./kaos-pria-templates"
import { KEMEJA_PRIA_TEMPLATE, buildKemejaPriaImagePrompt, buildKemejaPriaVideoPrompt } from "./kemeja-pria-templates"
import { SNACK_LEBARAN_TEMPLATE, buildSnackLebaranImagePrompt, buildSnackLebaranVideoPrompt } from "./snack-lebaran-templates"

/* ─── Registry ─── */

export const VIDEO_TEMPLATES: TemplateRegistryEntry[] = [
  {
    id: "gamis-promotion",
    name: "Gamis",
    description: "Busana muslim wanita — hijab & gamis promotion",
    icon: "👗",
    color: "violet",
    category: "Fashion Wanita",
    template: GAMIS_TEMPLATE,
    buildImagePrompt: buildGamisImagePrompt,
    buildVideoPrompt: buildGamisVideoPrompt,
  },
  {
    id: "hijab-promotion",
    name: "Hijab",
    description: "Hijab & kerudung — styling & material showcase",
    icon: "🧕",
    color: "pink",
    category: "Fashion Wanita",
    template: HIJAB_TEMPLATE,
    buildImagePrompt: buildHijabImagePrompt,
    buildVideoPrompt: buildHijabVideoPrompt,
  },
  {
    id: "sepatu-promotion",
    name: "Sepatu",
    description: "Sneakers & shoes — unboxing to on-feet review",
    icon: "👟",
    color: "blue",
    category: "Footwear",
    template: SEPATU_TEMPLATE,
    buildImagePrompt: buildSepatuImagePrompt,
    buildVideoPrompt: buildSepatuVideoPrompt,
  },
  {
    id: "tas-promotion",
    name: "Tas",
    description: "Bag & handbag — design, compartments, lifestyle",
    icon: "👜",
    color: "amber",
    category: "Aksesoris",
    template: TAS_TEMPLATE,
    buildImagePrompt: buildTasImagePrompt,
    buildVideoPrompt: buildTasVideoPrompt,
  },
  {
    id: "parfum-promotion",
    name: "Parfum",
    description: "Fragrance & perfume — luxury sensual presentation",
    icon: "🌸",
    color: "rose",
    category: "Beauty",
    template: PARFUM_TEMPLATE,
    buildImagePrompt: buildParfumImagePrompt,
    buildVideoPrompt: buildParfumVideoPrompt,
  },
  {
    id: "jam-tangan-promotion",
    name: "Jam Tangan",
    description: "Watch — premium wrist reveal & detail showcase",
    icon: "⌚",
    color: "slate",
    category: "Aksesoris",
    template: JAM_TANGAN_TEMPLATE,
    buildImagePrompt: buildJamTanganImagePrompt,
    buildVideoPrompt: buildJamTanganVideoPrompt,
  },
  {
    id: "kacamata-promotion",
    name: "Kacamata",
    description: "Eyewear & sunglasses — trendy styling showcase",
    icon: "🕶️",
    color: "cyan",
    category: "Aksesoris",
    template: KACAMATA_TEMPLATE,
    buildImagePrompt: buildKacamataImagePrompt,
    buildVideoPrompt: buildKacamataVideoPrompt,
  },
  {
    id: "kaos-pria-promotion",
    name: "Kaos Pria",
    description: "Men's t-shirt — casual cool urban style",
    icon: "👕",
    color: "emerald",
    category: "Fashion Pria",
    template: KAOS_PRIA_TEMPLATE,
    buildImagePrompt: buildKaosPriaImagePrompt,
    buildVideoPrompt: buildKaosPriaVideoPrompt,
  },
  {
    id: "kemeja-pria-promotion",
    name: "Kemeja Pria",
    description: "Men's shirt — professional to smart-casual",
    icon: "👔",
    color: "indigo",
    category: "Fashion Pria",
    template: KEMEJA_PRIA_TEMPLATE,
    buildImagePrompt: buildKemejaPriaImagePrompt,
    buildVideoPrompt: buildKemejaPriaVideoPrompt,
  },
  {
    id: "snack-lebaran-promotion",
    name: "Snack Lebaran",
    description: "Kue & snack lebaran — festive appetizing review",
    icon: "🍪",
    color: "orange",
    category: "Food & Beverage",
    template: SNACK_LEBARAN_TEMPLATE,
    buildImagePrompt: buildSnackLebaranImagePrompt,
    buildVideoPrompt: buildSnackLebaranVideoPrompt,
  },
]

/* ─── Lookup Map ─── */

export const TEMPLATE_MAP = new Map(
  VIDEO_TEMPLATES.map((entry) => [entry.id, entry])
)

/* ─── Helper Functions ─── */

export function getTemplateById(id: string): TemplateRegistryEntry | undefined {
  return TEMPLATE_MAP.get(id)
}

export function getTemplateCategories(): string[] {
  return [...new Set(VIDEO_TEMPLATES.map((t) => t.category))]
}

export function getTemplatesByCategory(category: string): TemplateRegistryEntry[] {
  return VIDEO_TEMPLATES.filter((t) => t.category === category)
}

/* ─── Re-exports ─── */

export type { TemplateRegistryEntry, TemplateDefinition, SceneTemplate, ConsistencyAnchors, ImagePromptBuilder, VideoPromptBuilder } from "./types"
