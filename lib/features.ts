/**
 * Centralized feature/tool definitions.
 * Used by: landing page, dashboard quick actions, sidebar, footer.
 * Add new features here — they'll propagate everywhere automatically.
 */

export interface FeatureItem {
  /** Display title */
  title: string
  /** Short description */
  description: string
  /** Dashboard URL path */
  url: string
  /** Category grouping */
  category: "image" | "video" | "audio" | "other"
  /** Emoji icon for landing page */
  emoji: string
  /** Gradient classes for dashboard cards */
  gradient: string
  /** Tags for landing page feature section */
  tags: string[]
  /** Credit cost label (for landing) */
  creditBadge?: string
  /** Whether to show on landing page feature grid */
  showOnLanding: boolean
  /** Whether to show on dashboard quick actions */
  showOnDashboard: boolean
}

export const FEATURES: FeatureItem[] = [
  // ── Image Tools ──
  {
    title: "AI Image Generator",
    description: "Buat gambar AI berkualitas tinggi dari teks atau referensi. Mendukung Imagen 4, Nano Banana 2 & Pro.",
    url: "/dashboard/tools/ai-image-generator",
    category: "image",
    emoji: "✨",
    gradient: "from-violet-500 to-purple-600",
    tags: ["Text to Image", "Image to Image", "Multi-model", "Hi-Res"],
    creditBadge: "1 poin/gambar",
    showOnLanding: true,
    showOnDashboard: true,
  },
  {
    title: "Product Studio",
    description: "Buat foto produk profesional dengan background AI. Sempurna untuk e-commerce dan katalog.",
    url: "/dashboard/product-studio",
    category: "image",
    emoji: "🛍️",
    gradient: "from-pink-500 to-rose-600",
    tags: ["Product Photo", "Background AI", "E-commerce"],
    creditBadge: "1 poin/gambar",
    showOnLanding: true,
    showOnDashboard: true,
  },
  {
    title: "Model Studio",
    description: "Generate model foto dengan pose dan gaya custom. Ideal untuk fashion dan brand visual.",
    url: "/dashboard/model-studio",
    category: "image",
    emoji: "👤",
    gradient: "from-fuchsia-500 to-pink-600",
    tags: ["AI Model", "Pose Control", "Fashion"],
    creditBadge: "1 poin/gambar",
    showOnLanding: true,
    showOnDashboard: true,
  },
  {
    title: "Thumbnail Generator",
    description: "Buat thumbnail menarik untuk YouTube, TikTok, dan media sosial dengan text overlay otomatis.",
    url: "/dashboard/thumbnail",
    category: "image",
    emoji: "🎨",
    gradient: "from-amber-500 to-orange-600",
    tags: ["YouTube", "Social Media", "Text Overlay"],
    creditBadge: "1 poin/gambar",
    showOnLanding: true,
    showOnDashboard: true,
  },

  // ── Video Tools ──
  {
    title: "AI Video Generator",
    description: "Produksi video AI dari teks atau gambar. Powered by Veo 3.1 untuk kualitas sinematik.",
    url: "/dashboard/tools/ai-video-generator",
    category: "video",
    emoji: "🎬",
    gradient: "from-blue-500 to-cyan-600",
    tags: ["Text to Video", "Image to Video", "Veo 3.1"],
    creditBadge: "5 poin/video",
    showOnLanding: true,
    showOnDashboard: true,
  },
  {
    title: "Review Product",
    description: "Buat video review produk otomatis 2 langkah: generate gambar produk, lalu ubah jadi video.",
    url: "/dashboard/review-product",
    category: "video",
    emoji: "📹",
    gradient: "from-indigo-500 to-blue-600",
    tags: ["Product Review", "Auto Video", "2-Step Pipeline"],
    creditBadge: "6 poin/review",
    showOnLanding: true,
    showOnDashboard: true,
  },

  // ── Audio Tools ──
  {
    title: "Text to Speech",
    description: "Ubah teks menjadi suara natural dengan berbagai voice dan model AI dari ElevenLabs.",
    url: "/dashboard/audio-tools/text-to-speech",
    category: "audio",
    emoji: "🎤",
    gradient: "from-emerald-500 to-teal-600",
    tags: ["TTS", "AI Voice", "Multi-language"],
    creditBadge: "3 poin/audio",
    showOnLanding: true,
    showOnDashboard: true,
  },
  {
    title: "Sound Effects",
    description: "Generate sound effects custom dari deskripsi teks. Cocok untuk video dan podcast.",
    url: "/dashboard/audio-tools/sound-effects",
    category: "audio",
    emoji: "🔊",
    gradient: "from-cyan-500 to-blue-600",
    tags: ["Sound FX", "AI Audio", "Custom"],
    creditBadge: "5 poin/audio",
    showOnLanding: true,
    showOnDashboard: true,
  },

  // ── Other Tools ──
  {
    title: "Gallery",
    description: "Lihat, kelola, dan download semua gambar dan video yang pernah Anda buat.",
    url: "/dashboard/gallery",
    category: "other",
    emoji: "🖼️",
    gradient: "from-teal-500 to-emerald-600",
    tags: ["Koleksi", "Download", "Kelola"],
    showOnLanding: false,
    showOnDashboard: true,
  },
  {
    title: "Beli Kredit",
    description: "Top up kredit untuk menggunakan semua fitur AI. Pembayaran via Midtrans.",
    url: "/dashboard/buy-credits",
    category: "other",
    emoji: "💰",
    gradient: "from-yellow-500 to-amber-600",
    tags: ["Top Up", "Midtrans", "Instant"],
    showOnLanding: false,
    showOnDashboard: false,
  },
]

/** Features shown on landing page */
export const LANDING_FEATURES = FEATURES.filter((f) => f.showOnLanding)

/** Features shown on dashboard quick actions */
export const DASHBOARD_FEATURES = FEATURES.filter((f) => f.showOnDashboard)

/** Image tools only */
export const IMAGE_TOOLS = FEATURES.filter((f) => f.category === "image")

/** Video tools only */
export const VIDEO_TOOLS = FEATURES.filter((f) => f.category === "video")

/** Audio tools only */
export const AUDIO_TOOLS = FEATURES.filter((f) => f.category === "audio")
