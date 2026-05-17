export interface PoseItem {
  id: string
  label: string
  emoji: string
  prompt: string
  category: string
}

export const POSE_CATEGORIES = [
  "Semua", "Berdiri", "Duduk", "Berjalan", "Aksi", "Fashion", "Casual", "Bisnis", "Artistik", "Produk"
]

export const POSES: PoseItem[] = [
  // ── Berdiri ──
  { id: "stand-straight", label: "Berdiri Tegap", emoji: "🧍", prompt: "standing straight, confident posture, looking at camera", category: "Berdiri" },
  { id: "stand-lean", label: "Bersandar Dinding", emoji: "🧱", prompt: "leaning against a wall casually, one foot up, relaxed pose", category: "Berdiri" },
  { id: "stand-cross-arms", label: "Silang Tangan", emoji: "💪", prompt: "standing with arms crossed, confident power pose", category: "Berdiri" },
  { id: "stand-hands-pocket", label: "Tangan di Saku", emoji: "🤙", prompt: "standing with hands in pockets, casual relaxed pose", category: "Berdiri" },
  { id: "stand-hip", label: "Tangan di Pinggang", emoji: "🦸", prompt: "standing with hands on hips, assertive power pose", category: "Berdiri" },
  { id: "stand-side", label: "Pose Samping", emoji: "👤", prompt: "standing in side profile, elegant silhouette pose", category: "Berdiri" },
  { id: "stand-back", label: "Membelakangi", emoji: "🔙", prompt: "standing with back to camera, looking over shoulder", category: "Berdiri" },
  // ── Duduk ──
  { id: "sit-chair", label: "Duduk di Kursi", emoji: "🪑", prompt: "sitting on a chair, legs crossed, elegant posture", category: "Duduk" },
  { id: "sit-floor", label: "Duduk di Lantai", emoji: "🧘", prompt: "sitting on the floor, legs crossed, casual relaxed", category: "Duduk" },
  { id: "sit-stool", label: "Duduk di Stool", emoji: "🪧", prompt: "sitting on a high stool, one leg dangling, modern look", category: "Duduk" },
  { id: "sit-edge", label: "Duduk di Tepi", emoji: "🏢", prompt: "sitting on the edge of a surface, legs hanging, candid", category: "Duduk" },
  { id: "sit-lean-back", label: "Bersandar Relax", emoji: "😎", prompt: "sitting and leaning back, arms behind, very relaxed", category: "Duduk" },
  { id: "sit-knees", label: "Memeluk Lutut", emoji: "🤗", prompt: "sitting hugging knees, cozy intimate pose", category: "Duduk" },
  // ── Berjalan ──
  { id: "walk-forward", label: "Berjalan Maju", emoji: "🚶", prompt: "walking towards camera, natural stride, candid movement", category: "Berjalan" },
  { id: "walk-away", label: "Berjalan Menjauh", emoji: "🚶‍♂️", prompt: "walking away from camera, back view, cinematic", category: "Berjalan" },
  { id: "walk-side", label: "Berjalan Samping", emoji: "🏃", prompt: "walking sideways, profile view, dynamic movement", category: "Berjalan" },
  { id: "walk-runway", label: "Runway Walk", emoji: "👠", prompt: "confident runway walk, fashion model stride, fierce", category: "Berjalan" },
  { id: "walk-casual", label: "Jalan Santai", emoji: "🌴", prompt: "casual strolling, relaxed walking, lifestyle candid", category: "Berjalan" },
  // ── Aksi ──
  { id: "action-jump", label: "Melompat", emoji: "🦘", prompt: "jumping in the air, dynamic mid-air pose, energetic", category: "Aksi" },
  { id: "action-dance", label: "Menari", emoji: "💃", prompt: "dancing pose, graceful movement, artistic flow", category: "Aksi" },
  { id: "action-spin", label: "Berputar", emoji: "🌀", prompt: "spinning around, dress/clothes flowing, motion blur feel", category: "Aksi" },
  { id: "action-stretch", label: "Stretching", emoji: "🙆", prompt: "stretching arms up, morning vibe, natural relaxed", category: "Aksi" },
  { id: "action-laugh", label: "Tertawa", emoji: "😂", prompt: "laughing candidly, genuine joy, natural expression", category: "Aksi" },
  // ── Fashion ──
  { id: "fashion-editorial", label: "Editorial Pose", emoji: "📰", prompt: "high fashion editorial pose, angular body, dramatic", category: "Fashion" },
  { id: "fashion-contrapposto", label: "Contrapposto", emoji: "🗿", prompt: "contrapposto pose, weight on one leg, classic elegance", category: "Fashion" },
  { id: "fashion-hand-face", label: "Tangan di Wajah", emoji: "🤔", prompt: "hand touching face gently, fashion portrait, elegant", category: "Fashion" },
  { id: "fashion-wind", label: "Rambut Tertiup", emoji: "💨", prompt: "hair blowing in wind, dramatic fashion moment", category: "Fashion" },
  { id: "fashion-over-shoulder", label: "Over Shoulder", emoji: "👀", prompt: "looking over shoulder at camera, mysterious alluring pose", category: "Fashion" },
  { id: "fashion-s-curve", label: "S-Curve", emoji: "〰️", prompt: "s-curve body pose, one hip out, classic model pose", category: "Fashion" },
  { id: "fashion-fierce", label: "Fierce", emoji: "🔥", prompt: "fierce intense stare, strong angular pose, bold fashion", category: "Fashion" },
  { id: "fashion-soft", label: "Soft & Dreamy", emoji: "☁️", prompt: "soft dreamy pose, gentle expression, ethereal lighting", category: "Fashion" },
  // ── Casual ──
  { id: "casual-coffee", label: "Pegang Kopi", emoji: "☕", prompt: "holding a coffee cup, casual lifestyle, warm candid", category: "Casual" },
  { id: "casual-phone", label: "Lihat HP", emoji: "📱", prompt: "looking at phone, natural everyday moment, candid", category: "Casual" },
  { id: "casual-bag", label: "Bawa Tas", emoji: "👜", prompt: "carrying a bag/tote, walking casually, lifestyle", category: "Casual" },
  { id: "casual-sunglasses", label: "Kacamata Hitam", emoji: "🕶️", prompt: "wearing sunglasses, cool casual pose, summer vibe", category: "Casual" },
  { id: "casual-wave", label: "Melambaikan Tangan", emoji: "👋", prompt: "waving at camera, friendly approachable, candid", category: "Casual" },
  { id: "casual-peace", label: "Pose Peace", emoji: "✌️", prompt: "peace sign pose, fun playful, youthful energy", category: "Casual" },
  { id: "casual-mirror", label: "Mirror Selfie", emoji: "🪞", prompt: "mirror selfie pose, casual outfit check, trendy", category: "Casual" },
  // ── Bisnis ──
  { id: "biz-handshake", label: "Jabat Tangan", emoji: "🤝", prompt: "professional handshake pose, business meeting, confident", category: "Bisnis" },
  { id: "biz-laptop", label: "Dengan Laptop", emoji: "💻", prompt: "working on laptop, professional setting, focused", category: "Bisnis" },
  { id: "biz-presentation", label: "Presentasi", emoji: "📊", prompt: "giving a presentation, confident gesture, corporate", category: "Bisnis" },
  { id: "biz-headshot", label: "Headshot Pro", emoji: "🎯", prompt: "professional headshot, shoulders up, clean background, corporate portrait", category: "Bisnis" },
  { id: "biz-arms-open", label: "Tangan Terbuka", emoji: "🤲", prompt: "open arms welcoming gesture, approachable leader", category: "Bisnis" },
  // ── Artistik ──
  { id: "art-silhouette", label: "Siluet", emoji: "🌅", prompt: "silhouette pose against bright background, artistic dramatic", category: "Artistik" },
  { id: "art-frame", label: "Frame Tangan", emoji: "🖼️", prompt: "hands framing face, artistic creative portrait", category: "Artistik" },
  { id: "art-reflection", label: "Refleksi", emoji: "🪟", prompt: "reflection in mirror or water, artistic double image", category: "Artistik" },
  { id: "art-shadow", label: "Shadow Play", emoji: "🌓", prompt: "dramatic shadow play, half face lit, noir aesthetic", category: "Artistik" },
  { id: "art-minimal", label: "Minimalis", emoji: "⬛", prompt: "minimalist pose, negative space, clean artistic composition", category: "Artistik" },
  // ── Produk Focus ──
  { id: "prod-hold", label: "Pegang Produk", emoji: "🤲", prompt: "holding product up to camera, product showcase pose", category: "Produk" },
  { id: "prod-wear", label: "Pakai Produk", emoji: "👔", prompt: "wearing/using the product naturally, lifestyle product shot", category: "Produk" },
  { id: "prod-point", label: "Tunjuk Produk", emoji: "👉", prompt: "pointing at or presenting the product, commercial pose", category: "Produk" },
]
