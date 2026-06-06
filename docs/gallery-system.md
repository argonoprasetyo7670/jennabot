# Gallery System

## Overview

Gallery menyimpan semua media yang dihasilkan user (gambar & video) dari berbagai fitur AI:
- AI Image Generator
- AI Video Generator
- Review Product
- Product Studio / Model Studio
- Video Template

---

## URL Format & Expiry

Media yang dihasilkan oleh Google Flow (via UseAPI.net) menggunakan CDN URL bertanda tangan:

```
https://flow-content.google/image/<uuid>?Expires=<unix_ts>&KeyName=labs-flow-prod-cdn-key&Signature=<sig>
```

### ⚠️ Expiry Policy

| Parameter | Value | Penjelasan |
|-----------|-------|------------|
| `Expires` | Unix timestamp | Waktu kadaluarsa dalam detik sejak epoch |
| Durasi | **~6 jam** | URL hanya valid ±6 jam sejak generate |
| Permanent? | ❌ Tidak | URL akan expire dan gambar tidak bisa diakses |

Contoh URL asli:
```
https://flow-content.google/image/f796f076-b183-4f94-95b6-0e065cb11679
  ?Expires=1780746347
  &KeyName=labs-flow-prod-cdn-key
  &Signature=RnFmNe60Y6wxbnL0KJ2HCRglvc8
```

### Parsing Expiry dari URL

Gunakan utility di `lib/utils.ts`:

```typescript
import { parseMediaUrlExpiry, isMediaUrlExpired, mediaUrlExpiryLabel } from "@/lib/utils"

// Cek apakah expired
const expired = isMediaUrlExpired(url) // → true/false

// Ambil objek Date expiry
const date = parseMediaUrlExpiry(url) // → Date | null

// Label human-readable
const label = mediaUrlExpiryLabel(url)
// → "Kadaluarsa"       (sudah lewat)
// → "Berlaku 5j 30m lagi"  (masih valid)
// → "Berlaku 2h lagi"   (≥ 24 jam, pakai "h" = hari)
// → null               (tidak ada info expiry di URL)
```

---

## Arsitektur

### Database Schema

```prisma
model gallery_items {
  id                String    @id @default(cuid())
  userId            String
  type              String    // "image" | "video"
  gcsPath           String    // virtual path: "gallery/<userId>/<id>"
  gcsUrl            String    // URL CDN (bisa expired!)
  prompt            String?
  model             String?   // "imagen-4", "nano-banana-2", "veo-3.1", etc.
  aspectRatio       String?   // "1:1", "16:9", etc.
  mediaGenerationId String?   // ID dari UseAPI (stable, tidak expire)
  sourceAction      String?   // "generate", "workflow", "review-product"
  expiresAt         DateTime  // metadata saja, tidak otomatis hapus
  createdAt         DateTime  @default(now())
  updatedAt         DateTime
}
```

> **Catatan:** Kolom `gcsPath` dan `expiresAt` adalah legacy dari rencana awal memakai GCS/Cloudinary. Saat ini hanya `gcsUrl` yang benar-benar dipakai.

### API Routes

| Route | Method | Fungsi |
|-------|--------|--------|
| `/api/gallery` | GET | List gallery items user (paginated, filter, search) |
| `/api/gallery/save` | POST | Simpan item baru ke gallery |
| `/api/gallery/[id]` | DELETE | Hapus item dari gallery |

### GET `/api/gallery`

Query params:
- `type` — `"all"` | `"image"` | `"video"`
- `limit` — default `30`
- `cursor` — untuk pagination (ID terakhir)
- `search` — filter by prompt text

Response:
```json
{
  "items": [...],
  "nextCursor": "clxxx...",
  "hasMore": true
}
```

### POST `/api/gallery/save`

Body:
```json
{
  "url": "https://flow-content.google/...",
  "type": "image",
  "prompt": "a cat on the moon",
  "model": "imagen-4",
  "aspectRatio": "1:1",
  "mediaGenerationId": "abc123",
  "sourceAction": "generate"
}
```

Idempotent: jika URL yang sama sudah tersimpan, tidak duplikat (cek `gcsUrl` unique per user).

---

## Gallery Page (`/dashboard/gallery`)

### Komponen: `app/dashboard/gallery/page.tsx`

Features:
- Infinite scroll dengan IntersectionObserver
- Filter: All / Image / Video
- Search by prompt (debounce 400ms)
- Grid size toggle: Small (6 kolom) / Large (4 kolom)
- Hover overlay: prompt, expiry countdown, download, delete
- Preview modal: keyboard nav (← → Esc), dots indicator

### Expired URL Handling

Gallery mendeteksi expired URL **sebelum** mencoba load (zero network request):

```tsx
// Pre-computed dari URL, bukan menunggu onError
{isMediaUrlExpired(item.gcsUrl) ? (
  <ExpiredPlaceholder />
) : (
  <Image src={item.gcsUrl} ... />
)}
```

Pada hover overlay, gambar yang masih valid menampilkan **countdown kadaluarsa**:
```
🕐 Berlaku 4j 30m lagi
```

---

## Cara Kerja Auto-Save

### Dari AI Image Generator

File: `app/dashboard/tools/ai-image-generator/page.tsx`

Setelah generate, user mengklik "Simpan ke Gallery" → memanggil `POST /api/gallery/save` dengan `fifeUrl` dari hasil generasi.

### Dari AI Video Generator

File: `app/dashboard/tools/ai-video-generator/page.tsx`

Tombol "Simpan" di bawah video → `POST /api/gallery/save` dengan URL video.

### Dari Workflow (galleryNode)

File: `app/api/ai/workflow-run/route.ts` → `galleryNode`

Workflow mengeksekusi galleryNode yang memanggil `/api/gallery/save` server-side dengan media URL dari node upstream.

### Dari Review Product

File: `app/dashboard/review-product/page.tsx`

Auto-save setelah pipeline selesai.

---

## Masalah yang Diketahui

### ⚠️ URL Expire dalam ~6 Jam

Google Flow CDN URL expire setelah ±6 jam. Ini adalah limitasi dari upstream API (UseAPI / Google Flow), bukan bug di codebase ini.

**Solusi saat ini:** Gallery menampilkan placeholder "Kadaluarsa" untuk URL yang sudah lewat waktu expire.

**Solusi permanen (future):** Upload media ke Cloudinary saat save, simpan Cloudinary URL yang permanent:

```typescript
// Future implementation di /api/gallery/save/route.ts
import { v2 as cloudinary } from "cloudinary"

const uploaded = await cloudinary.uploader.upload(url, {
  folder: `jenna/${userId}`,
  resource_type: isVideo ? "video" : "image",
})
const permanentUrl = uploaded.secure_url
```

### `mediaGenerationId` sebagai Stable Identifier

`mediaGenerationId` dari UseAPI tidak expire. Bisa dipakai untuk:
- Re-generate video dari existing image
- Upload ulang ke Google Flow sebagai reference
- Jika ada API UseAPI untuk fetch media by ID (belum diimplementasi)

---

## Konfigurasi Cloudinary (Siap Pakai)

Credentials sudah ada di `.env`:

```env
CLOUDINARY_URL=cloudinary://831334937846983:xxx@dpsearrvx
CLOUDINARY_2_CLOUD_NAME=dpsearrvx
CLOUDINARY_2_API_KEY=831334937846983
CLOUDINARY_2_API_SECRET=xxx
```

Package `cloudinary` **belum diinstall**. Untuk mengaktifkan:
```bash
yarn add cloudinary
```

---

## File Referensi

| File | Fungsi |
|------|--------|
| `app/dashboard/gallery/page.tsx` | Gallery UI (list, filter, preview modal) |
| `app/api/gallery/route.ts` | GET gallery items |
| `app/api/gallery/save/route.ts` | POST save item |
| `app/api/gallery/[id]/route.ts` | DELETE item |
| `lib/utils.ts` | `parseMediaUrlExpiry`, `isMediaUrlExpired`, `mediaUrlExpiryLabel` |
| `prisma/schema.prisma` | Model `gallery_items` |
