# Sidebar & Fitur — Jenna Bot Pro

> Dokumentasi lengkap tentang struktur sidebar, halaman, dan fitur-fitur yang tersedia di project Jenna Bot Pro.

---

## Arsitektur Sidebar

### Komponen Utama

| Komponen | File | Deskripsi |
|---|---|---|
| `DashboardShell` | `components/dashboard/dashboard-shell.tsx` | Shell utama yang membungkus `SessionProvider`, `SidebarProvider`, dan `SidebarInset` |
| `DynamicSidebar` | `components/dynamic-sidebar.tsx` | Wrapper client-side yang me-render `AppSidebar` |
| `AppSidebar` | `components/app-sidebar.tsx` | Komponen sidebar utama — mendefinisikan semua navigation items |
| `NavMain` | `components/nav-main.tsx` | Renderer navigasi: collapsible groups, single links, external links |
| `NavUser` | `components/nav-user.tsx` | Footer sidebar: user avatar, dropdown (Buy Credits, Theme Toggle, Logout) |
| `DashboardHeader` | `components/dashboard-header.tsx` | Header bar: Sidebar trigger, breadcrumbs, dan `HeaderActions` |
| `HeaderActions` | `components/header-actions.tsx` | Header actions: Credit popover, Refresh, Notifications, Gallery dialog, Theme toggle |

### Hierarki Rendering

```
DashboardLayout (app/dashboard/layout.tsx)                [Server Component]
  └─ DashboardShell                                       [Client Component]
       ├─ SessionProvider (NextAuth)
       ├─ SidebarProvider (shadcn/ui)
       │    ├─ DynamicSidebar
       │    │    └─ AppSidebar
       │    │         ├─ SidebarHeader  → Logo + "Jenna Bot Pro"
       │    │         ├─ SidebarContent → NavMain (semua menu items)
       │    │         ├─ SidebarFooter  → NavUser (avatar + dropdown)
       │    │         └─ SidebarRail    → Rail untuk collapsed mode
       │    └─ SidebarInset → {children} (halaman konten)
       ├─ DeployVersionGuard
       └─ ServerActionVersionRecovery
```

### Fitur Sidebar

- **Collapsible**: Sidebar bisa di-collapse menjadi icon-only mode (`collapsible="icon"`)
- **Persistent Open State**: Status buka/tutup section disimpan di `localStorage` (`sidebar-open-sections`)
- **Auto-Open Active Section**: Section yang mengandung halaman aktif otomatis terbuka
- **Active URL Indicator**: Menu aktif ditandai warna `primary` + dot animasi pulse
- **Admin Detection**: Menu "Admin Panel" hanya muncul setelah pengecekan API `/api/auth/check-admin`

---

## Struktur Navigasi Sidebar

### 📊 Dashboard
| Item | Route | Deskripsi |
|---|---|---|
| Dashboard | `/dashboard` | Halaman utama dashboard — statistik, overview aktivitas |

### 📖 Tutorial
| Item | Route | Deskripsi |
|---|---|---|
| Tutorial | `/tutorial` | Halaman tutorial penggunaan platform |

### 💬 Grup Diskusi WA
| Item | Route | Deskripsi |
|---|---|---|
| Grup Diskusi WA | `https://chat.whatsapp.com/...` | Link eksternal ke grup WhatsApp (buka di tab baru) |

### 🖼️ Image Tools (Collapsible Group)
| Item | Route | Deskripsi |
|---|---|---|
| AI Image Generator | `/dashboard/tools/ai-video-generator` | Generate gambar AI menggunakan berbagai model (Freepik, DALL-E, dll) |
| Product Studio | `/dashboard/product-studio` | Studio foto produk — generate foto produk dengan background & styling AI |
| Model Studio | `/dashboard/model-studio` | Studio model — generate foto model fashion/produk dengan AI |
| Thumbnail Generator | `/dashboard/thumbnail` | Generate thumbnail YouTube/sosmed otomatis |
| Prompt Generator | `/dashboard/tools/prompt-generator` | Tool untuk generate prompt gambar/video secara otomatis |

### 🎬 Video Tools (Collapsible Group)
| Item | Route | Deskripsi |
|---|---|---|
| AI Video Generator | `/dashboard/tools/ai-video-generator` | Generate video AI dari teks/gambar (Veo 3.1) |
| Review Product | `/dashboard/review-product` | Generate video review produk otomatis |
| Seedance 2.0 | `/dashboard/seedance` | ✅ Video generation multi-reference Seedance 2.0 (via Runway API) — 120 credits |
| Motion Control | `/dashboard/motion-control` | ✅ Animate karakter dari gambar + video performa — Kling 3.0 Motion Control (via Runway API) — 120 credits |
| Storyboard | `/dashboard/storyboard` | Buat storyboard visual untuk video |
| Scene Builder | `/dashboard/scene-builder` | Bangun scene-by-scene untuk produksi video |
| Video Template | `/dashboard/video-template` | Template video siap pakai untuk berbagai kebutuhan |
| TikTok Hook Generator | `/dashboard/tiktok-hook-gen` | Generate hook/opening TikTok yang menarik |
| Perpanjang Video | `/dashboard/extend-video` | Perpanjang durasi video yang sudah ada |
| Gabungkan Video | `/dashboard/concatenate-video` | Gabungkan beberapa video menjadi satu |
| Kling v3 Omni | `/dashboard/kling-v3-omni` | Video generation dengan model Kling v3 Omni |
| Seedance Pro | `/dashboard/seedance-pro` | Video generation dengan model Seedance Pro |

### 💬 Chat AI
| Item | Route | Deskripsi |
|---|---|---|
| Chat AI | `/dashboard/chat` | Chat dengan AI (OpenAI/Gemini) |

### 💰 Buy Credits
| Item | Route | Deskripsi |
|---|---|---|
| Buy Credits | `/dashboard/buy-credits` | Beli kredit — integrasi pembayaran Midtrans |

### 🖼️ Gallery
| Item | Route | Deskripsi |
|---|---|---|
| Gallery | `/dashboard/gallery` | Galeri hasil generate — image & video, dengan filter dan upscale |

### 🔑 API Keys
| Item | Route | Deskripsi |
|---|---|---|
| API Keys | `/dashboard/api-keys` | Kelola API key untuk akses programmatic |

### 📄 API Docs
| Item | Route | Deskripsi |
|---|---|---|
| API Docs | `/dashboard/api-docs` | Dokumentasi API untuk developer |

### 🛡️ Admin Panel (Admin Only)
| Item | Route | Deskripsi |
|---|---|---|
| Admin Panel | `/dashboard/admin` | Panel admin — manajemen user, kredit, dan paket |

---

## Halaman Publik (Tanpa Login)

| Halaman | Route | Deskripsi |
|---|---|---|
| Homepage | `/` | Landing page — auth section untuk login/register |
| About | `/about` | Halaman tentang Jenna Bot Pro |
| Blog | `/blog` | Blog/artikel |
| Contact | `/contact` | Halaman kontak |
| Tutorial | `/tutorial` | Tutorial penggunaan |
| Privacy Policy | `/privacy-policy` | Kebijakan privasi |
| Terms | `/terms` | Syarat & ketentuan |
| Payment | `/payment` | Halaman pembayaran (Midtrans callback) |

---

## Header Actions (Top Bar)

Komponen yang muncul di header setiap halaman dashboard:

| Fitur | Deskripsi |
|---|---|
| **Theme Toggle** | Switch dark/light mode |
| **Credit Popover** | Tampilkan saldo kredit + riwayat transaksi terakhir (15 item) + tombol "Buy Credits" |
| **Refresh** | Refresh saldo kredit secara manual |
| **Notifications** | Popover notifikasi dengan tab Queue & Notif |
| **Gallery Quick Access** | Dialog gallery cepat (History, Upscale, Upload, My Profile) |

---

## Footer Sidebar (NavUser)

Dropdown menu di bagian bawah sidebar:

| Item | Aksi |
|---|---|
| **User Info** | Avatar, nama, email |
| **Buy Credits** | Navigasi ke `/dashboard/buy-credits` |
| **Theme** | Toggle dark/light mode |
| **Log Out** | Sign out via NextAuth |

| Route | Fungsi |
|---|---|
| `/api/auth` | NextAuth endpoints |
| `/api/midtrans` | Midtrans payment webhook |
| `/api/v1` | Public REST API (untuk API key users) |
| `/api/keys` | API key management |
| `/api/openai` | OpenAI proxy |
| `/api/download-image` | Download gambar |
| `/api/download-video` | Download video |
| `/api/upscale-image` | Upscale resolusi gambar |
| `/api/health` | Health check |
| `/api/version` | App version info |

--
## External Services

| Service | Kegunaan |
|---|---|
| **OpenAI** | Chat AI, DALL-E image generation |
| **Google Gemini** | Chat AI alternatif |
| **ElevenLabs** | Text-to-Speech |
| **UseAPI** | Core API
| **Cloudinary** | Media storage (multi-account round-robin) |
| **Midtrans** | Payment gateway (production mode) |

---

## Diagram Visual Sidebar

```
┌─────────────────────────────────┐
│  🤖 Jenna Bot Pro               │
│     AI Generator                │
├─────────────────────────────────┤
│                                 │
│  🏠 Dashboard                   │
│  📖 Tutorial                    │
│  👥 Grup Diskusi WA  ↗          │
│                                 │
│  🖼️ Image Tools  ▼              │
│    ├─ AI Image Generator        │
│    ├─ Product Studio            │
│    ├─ Model Studio              │
│    ├─ Thumbnail Generator       │
│    └─ Prompt Generator          │
│                                 │
│  🎬 Video Tools  ▼              │
│    ├─ AI Video Generator        │
│    ├─ Review Product            │
│    ├─ Storyboard                │
│    ├─ Scene Builder             │
│    ├─ Video Template            │
│    ├─ TikTok Hook Generator     │
│    ├─ Perpanjang Video          │
│    ├─ Gabungkan Video           │
│    ├─ Motion Control            │
│    ├─ Kling v3 Omni             │
│    └─ Seedance Pro              │
│                                 │
│  💬 Chat AI                     │
│  💰 Buy Credits                 │
│  🖼️ Gallery                     │
│  🔑 API Keys                    │
│  📄 API Docs                    │
│  🛡️ Admin Panel  (admin only)   │
│                                 │
├─────────────────────────────────┤
│  👤 User Name                   │
│     user@email.com          ⌃⌄  │
└─────────────────────────────────┘
```
