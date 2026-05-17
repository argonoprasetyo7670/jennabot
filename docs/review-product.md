# Review Product — Technical Reference

Dokumentasi teknis fitur Review Product di Jenna Bot Pro.
Fitur ini memungkinkan user membuat video review produk otomatis dari 3 gambar input.

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Client)                                           │
│                                                             │
│  /dashboard/review-product                                  │
│    ├── 3 Upload Slots: Model, Background, Product           │
│    ├── Option Selectors: Lingkungan, Pose, Aksi, Bahasa     │
│    └── 2-Step Pipeline: Image → Video                       │
│                                                             │
│  Pipeline:                                                  │
│    1. Canvas composite (3 images → 1 portrait JPEG)         │
│    2. Upload composite → /api/ai/image-upload               │
│    3. Generate IMAGE → /api/ai/image-generate               │
│    4. Generate VIDEO (I2V) → /api/ai/video-generate         │
│    5. Deduct credits → /api/credits                         │
│    6. Save to gallery → /api/gallery/save                   │
└─────────────────────────────────────────────────────────────┘
```

---

## File Utama

| File | Deskripsi |
|------|-----------|
| `app/dashboard/review-product/page.tsx` | Halaman utama Review Product |
| `app/api/ai/image-generate/route.ts` | API proxy untuk image generation |
| `app/api/ai/video-generate/route.ts` | API proxy untuk video generation (I2V) |
| `app/api/ai/image-upload/route.ts` | API proxy untuk upload gambar referensi |
| `app/api/gallery/save/route.ts` | API untuk save ke gallery |
| `lib/api/google-flow.ts` | Client-side API wrapper |

---

## 2-Step Pipeline

### Mengapa 2-Step?

Pendekatan langsung (3 reference → video) menghasilkan output yang **tidak mirip** dengan input.
Solusi: generate IMAGE dulu yang akurat, lalu jadikan IMAGE itu sebagai start frame VIDEO (I2V).

### Flow Detail

```
Step 1: Canvas Composite
  ├── Load 3 images ke HTMLImageElement
  ├── Draw ke canvas 512×2144 (portrait)
  │   ├── [MODEL]     512×680 + label
  │   ├── [BACKGROUND] 512×680 + label
  │   └── [PRODUCT]   512×680 + label
  └── Export sebagai JPEG 92% quality

Step 2: Upload Reference
  ├── POST /api/ai/image-upload (binary upload)
  └── Returns: { mediaGenerationId, email }

Step 3: Generate Image
  ├── POST /api/ai/image-generate
  ├── Model: nano-banana-2
  ├── Aspect Ratio: 3:4 (portrait)
  ├── Reference: composite mediaGenerationId
  └── Returns: { images[0]: { url, mediaGenerationId } }

Step 4: Generate Video (I2V)
  ├── POST /api/ai/video-generate
  ├── Model: veo-3.1-fast
  ├── startImage: image mediaGenerationId (LANGSUNG, tanpa re-upload)
  ├── email: SAMA dengan step 2 (email pinning)
  ├── Duration: 8 seconds
  └── Returns: { videos[0]: { url } }

Step 5: Deduct Credits
  ├── POST /api/credits
  ├── Amount: 25 (IMAGE=5 + VIDEO=20)
  └── Dispatch 'credits-updated' event

Step 6 (Optional): Save to Gallery
  ├── POST /api/gallery/save
  └── Saves both image and video separately
```

---

## Option Selectors

### Lingkungan (Environment)
| ID | Label | Prompt |
|----|-------|--------|
| meja | 🪑 Meja | sitting at a table |
| kursi | 💺 Kursi | sitting on a chair |
| sofa | 🛋️ Sofa | sitting on a sofa |
| rak | 📚 Rak Display | standing next to a display shelf |
| studio | 🎬 Studio | in a clean studio setup |
| outdoor | 🌿 Outdoor | in an outdoor setting |
| dapur | 🍳 Dapur | in a kitchen |
| kasir | 🏪 Toko | at a store counter |

### Pose
| ID | Label | Prompt |
|----|-------|--------|
| berdiri | 🧍 Berdiri | standing upright |
| duduk | 🪑 Duduk | sitting down |
| bersandar | 😌 Bersandar | leaning casually |
| setengah-badan | 👤 Setengah Badan | half-body shot, waist up |
| closeup | 🔍 Close-up | close-up framing |

### Aksi (Action)
| ID | Label | Prompt |
|----|-------|--------|
| memegang | ✋ Memegang | holding the product |
| menunjuk | 👆 Menunjukkan | pointing at and showing the product |
| menggunakan | 🤲 Menggunakan | actively using the product |
| membuka | 📦 Membuka | unboxing and opening the product |
| membandingkan | ⚖️ Membandingkan | comparing the product |
| meletakkan | 📐 Meletakkan | placing the product on the table |

### Bahasa (Language)
| ID | Label | Prompt |
|----|-------|--------|
| id | 🇮🇩 Indonesia | speaking in Indonesian (default) |
| en | 🇺🇸 English | speaking in English |
| ms | 🇲🇾 Melayu | speaking in Malay |
| zh | 🇨🇳 中文 | speaking in Chinese Mandarin |
| ja | 🇯🇵 日本語 | speaking in Japanese |
| ko | 🇰🇷 한국어 | speaking in Korean |
| ar | 🇸🇦 العربية | speaking in Arabic |

---

## Prompt Construction

### Image Prompt
```
Professional product review photo, portrait orientation.
A person identical to the MODEL in the reference is in the exact BACKGROUND from the reference.
{poseOpt}, {envOpt}, {actionOpt}, showcasing the exact PRODUCT from the reference.
Enthusiastic expression, product visible prominently.
Photorealistic, studio lighting, high detail, 4K quality.
{customPrompt}
```

### Video Prompt
```
Smooth cinematic product review video, portrait format.
The person is {poseOpt} {envOpt}, {actionOpt},
examining it from multiple angles, showing details to camera,
{langOpt}, speaking enthusiastically and naturally.
Natural movements, professional lighting, smooth camera.
{customPrompt}
```

---

## Credit Costs

| Step | Cost | Notes |
|------|------|-------|
| Image Generation | 5 credits | `CREDIT_COST_IMAGE` |
| Video Generation | 20 credits | `CREDIT_COST_VIDEO` |
| **Total per review** | **25 credits** | Deducted only on full success |

---

## UI Components

### Upload Slots
- 3 portrait (aspect-[3/4]) upload cards
- Color-coded: Violet (Model), Blue (Background), Amber (Product)
- Hover overlay with Ganti/Hapus buttons

### Progress Indicator
- 4-step progress bar: Composing → Uploading → Image Gen → Video Gen
- LottieLoading animation
- Phase label text

### Results
- Image preview with Download + Save to Gallery
- Video preview with Fullscreen + Download + Save to Gallery
- Video fullscreen modal with top-right close button

### Save to Gallery
- `POST /api/gallery/save`
- Duplicate detection by URL
- States: Simpan → Menyimpan... → Tersimpan ✅
- `sourceAction: "review-product"` for tracking

---

## Key Decisions

1. **Canvas Composite vs Multiple References**: Multiple references menghasilkan output tidak akurat. Composite memberikan konteks visual yang jelas.
2. **Skip re-upload for I2V**: Generated image sudah punya `mediaGenerationId` di Google Flow. Re-upload via URL bisa gagal dan menggunakan account berbeda.
3. **Same email pinning**: Semua step menggunakan `email` yang sama dari upload pertama.
4. **Portrait-only**: Semua output (image + video) portrait karena target utama adalah konten TikTok/Reels.
5. **Default Indonesian**: Bahasa default Indonesia karena mayoritas pengguna Indonesia.
