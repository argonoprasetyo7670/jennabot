import { LANDING_FEATURES } from "@/lib/features"

export const heroTiles = [
  { src: "/jennabot/hero-1.webp", alt: "Workflow preview poster", title: "Product ads", className: "col-span-5 row-span-2 md:col-span-3" },
  { src: "/jennabot/hero-2.webp", alt: "AI storefront preview", title: "Marketplace drops", className: "col-span-7 row-span-2 md:col-span-4" },
  { src: "/jennabot/hero-3.webp", alt: "Creative campaign artwork", title: "Poster drafts", className: "col-span-4 row-span-2 md:col-span-2" },
  { src: "/jennabot/hero-4.webp", alt: "Gallery preview artwork", title: "Gallery uploads", className: "col-span-8 row-span-2 md:col-span-5" },
] as const;

export const stats = [
  { value: "50K+", label: "Images Generated", suffix: "" },
  { value: "10K+", label: "Videos Created", suffix: "" },
  { value: "5K+", label: "Active Creators", suffix: "" },
  { value: "99.9%", label: "Uptime", suffix: "" },
] as const;

/**
 * Feature cards for landing page — auto-generated from lib/features.ts
 * Icon mapping: image category → "image", video → "video"
 */
export const featureCards = LANDING_FEATURES.map((f) => ({
  icon: f.category === "image" ? "image" : f.category === "video" ? "video" : "workflow",
  badge: f.creditBadge || "AI Tool",
  title: f.title,
  description: f.description,
  tags: f.tags,
  url: f.url,
  emoji: f.emoji,
}));

export const howItWorks = [
  { step: "01", title: "Daftar dalam hitungan detik", description: "Buat akun dengan Google atau email. Dapatkan akses langsung ke semua AI tools dan kredit starter." },
  { step: "02", title: "Buat dengan AI", description: "Generate gambar, video, dan konten visual menggunakan model AI terbaru. Satu sistem kredit untuk semua tools." },
  { step: "03", title: "Download & Simpan", description: "Semua hasil disimpan di Gallery. Download kapan saja dalam resolusi tinggi, atau gunakan sebagai referensi." },
  { step: "04", title: "Scale bisnis Anda", description: "Buat konten produk, review video, dan thumbnail secara massal untuk e-commerce dan media sosial." },
] as const;

export const vipBullets = [
  "Akses semua Image Tools (Generator, Product, Model, Thumbnail)",
  "AI Video Generator dengan Veo 3.1",
  "Review Product otomatis (2-step pipeline)",
  "Gallery management tanpa batas",
  "Download resolusi tinggi",
  "Bonus kredit di setiap pembelian",
] as const;

export const faqItems = [
  { q: "Apa saja fitur yang tersedia?", a: "Jenna Bot Pro menyediakan AI Image Generator, Product Studio, Model Studio, Thumbnail Generator, AI Video Generator, dan Review Product. Semua bisa diakses dari satu dashboard." },
  { q: "Metode pembayaran apa yang tersedia?", a: "Kami mendukung transfer bank, e-wallet (GoPay, OVO, Dana), dan kartu kredit/debit melalui payment gateway Midtrans." },
  { q: "Berapa biaya per generasi?", a: "Image generation menggunakan 1 poin per gambar. Video generation menggunakan 5 poin per video. Beli paket kredit untuk harga lebih murah." },
  { q: "Apakah konten AI bisa digunakan secara komersial?", a: "Ya! Semua konten yang dihasilkan bisa digunakan untuk keperluan bisnis dan marketing. Anda memiliki hak komersial penuh." },
  { q: "Bagaimana sistem kredit bekerja?", a: "Kredit adalah mata uang terpadu untuk semua tools. Beli paket kredit, gunakan untuk generate gambar atau video. Saldo bisa dipantau di dashboard." },
  { q: "Apakah ada trial gratis?", a: "Akun baru mendapatkan kredit starter gratis untuk mencoba semua fitur. Top up kapan saja saat kredit habis." },
] as const;

export const supportCards = [
  { badge: "FREE", title: "WhatsApp Community", description: "Gabung komunitas kreator dan dapatkan tips, ide, serta inspirasi dari sesama pengguna.", href: "https://chat.whatsapp.com/" },
  { badge: "PRIORITY", title: "CS Admin Support", description: "Hubungi customer support untuk bantuan langsung, masalah pembayaran, dan kendala teknis.", href: "https://wa.me/" },
] as const;

export const marqueeItems = [
  "AI Image Generator", "Product Studio", "Model Studio", "Thumbnail Generator",
  "AI Video Generator", "Review Product", "Gallery", "Hi-Res Output",
  "Veo 3.1", "Nano Banana Pro", "Imagen 4",
] as const;
