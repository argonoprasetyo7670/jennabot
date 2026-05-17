# Image Generation Pipeline — Technical Reference

Dokumentasi lengkap untuk AI image generation pipeline di Jenna Bot Pro.
Meliputi: Upload Image, Generate Image, Captcha Broker, dan Download Proxy.

---

## Arsitektur Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│  Browser (Client)                                                     │
│                                                                       │
│  lib/api/google-flow.ts                                               │
│    ├── uploadImageAsset(file, email?)   → POST /api/ai/image-upload   │
│    ├── uploadImageFromUrl(url, email?)  → POST /api/ai/image-upload   │
│    └── generateImages(params)           → POST /api/ai/image-generate │
│                                                                       │
│  contexts/generation-queue.tsx                                        │
│    └── submitJob(params, refs) → fire-and-forget background pipeline  │
└───────────────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐   ┌──────────────────────────────────────────┐
│ /api/ai/image-upload │   │ /api/ai/image-generate                   │
│ (Next.js API Route)  │   │ (Next.js API Route)                      │
│                      │   │                                          │
│ Proxy binary upload  │   │ 1. GET captcha token from broker         │
│ to UseAPI /assets    │   │ 2. POST to UseAPI /images + captchaToken │
│                      │   │ 3. On 403 → retry up to 3x              │
│                      │   │ 4. On 3x fail → fallback tanpa token    │
└─────────────────────┘   └──────────────────────────────────────────┘
         │                           │
         ▼                           ├──────────────────────┐
    UseAPI.net                       ▼                      ▼
    /v1/google-flow/assets    UseAPI.net              Captcha Broker
                              /v1/google-flow/images  (localhost:4000)
         │                           │                      │
         ▼                           ▼                      ▼
    Google Flow              Google Flow              Chrome Extension
    (asset storage)          (Imagen 4 / Nano Banana) (reCAPTCHA gen)
```

---

## 1. Upload Image (`/api/ai/image-upload`)

### File: `app/api/ai/image-upload/route.ts`

Upload reference image ke Google Flow via UseAPI.

### Request

```
POST /api/ai/image-upload?email=xxx@gmail.com&url=https://...
```

| Param | Type | Required | Keterangan |
|-------|------|----------|------------|
| `email` | query string | No | Force upload ke Google account tertentu |
| `url` | query string | No | Re-upload dari URL (gallery item) |
| Body | binary | Yes (jika tidak ada `url`) | File PNG/JPEG/WebP, max 20MB |

### Dua Mode Upload

**Mode 1 — Direct Binary Upload:**
```ts
// Client-side (lib/api/google-flow.ts)
const res = await fetch(`/api/ai/image-upload?email=${email}`, {
  method: "POST",
  headers: { "Content-Type": file.type }, // image/png, image/jpeg, image/webp
  body: file, // raw File object
})
```

**Mode 2 — Re-upload dari URL:**
```ts
const res = await fetch(`/api/ai/image-upload?url=${encodeURIComponent(url)}&email=${email}`, {
  method: "POST",
})
```

### Response (Success — 200)

```json
{
  "mediaGenerationId": { "mediaGenerationId": "abc123..." },
  "width": 1024,
  "height": 768,
  "email": "user@gmail.com"
}
```

### Server-side Flow

```
1. Parse email & url dari query params
2. Jika url → fetch dari URL, ambil buffer + content-type
3. Jika binary → baca body sebagai ArrayBuffer
4. Validasi tipe file (PNG/JPEG/WebP) dan ukuran (<20MB)
5. POST ke UseAPI: /v1/google-flow/assets/{email} (atau /assets jika tanpa email)
   Headers: Authorization: Bearer {USEAPI_TOKEN}, Content-Type: {fileType}
   Body: binary buffer
6. Return response dari UseAPI
```

### Email Pinning (PENTING!)

Saat menggunakan reference images:
- Upload pertama menentukan `email` (Google account)
- Semua upload berikutnya **HARUS** menggunakan email yang sama
- Saat generate, email yang sama juga harus dikirim
- Ini mencegah cross-account reference mismatch di Google Flow

---

## 2. Generate Image (`/api/ai/image-generate`)

### File: `app/api/ai/image-generate/route.ts`

Generate image menggunakan Google Flow via UseAPI, dengan captcha token dari broker.

### Request

```
POST /api/ai/image-generate
Content-Type: application/json
```

```json
{
  "prompt": "A futuristic city at sunset",
  "model": "imagen-4",
  "aspectRatio": "16:9",
  "count": 4,
  "seed": 12345,
  "email": "user@gmail.com",
  "references": ["mediaGenId1", "mediaGenId2"]
}
```

| Field | Type | Required | Default | Keterangan |
|-------|------|----------|---------|------------|
| `prompt` | string | ✅ Yes | — | Text prompt untuk generate gambar |
| `model` | string | No | `"imagen-4"` | Model AI (lihat tabel di bawah) |
| `aspectRatio` | string | No | `"16:9"` | Rasio gambar |
| `count` | number | No | `1` | Jumlah gambar (1-4) |
| `seed` | number | No | — | Seed untuk reproducible result |
| `email` | string | No | — | Google account (wajib jika pakai references) |
| `references` | string[] | No | — | Array mediaGenerationId dari upload |

### Available Models

| Model ID | Internal Name | Max References | Keterangan |
|----------|---------------|----------------|------------|
| `imagen-4` | `IMAGEN_3_5` | 3 | Default, paling kompatibel |
| `nano-banana` | `GEM_PIX` | 3 | Support reference images |
| `nano-banana-2` | `GEM_PIX_2` | 10 | Support lebih banyak references |
| `nano-banana-pro` | `NARWHAL` | 10 | Ultra accounts only |

### Available Aspect Ratios

`16:9` | `4:3` | `1:1` | `3:4` | `9:16` | `auto`

### Response (Success — 200)

```json
{
  "jobId": "job-abc123",
  "media": [
    {
      "image": {
        "generatedImage": {
          "fifeUrl": "https://lh3.googleusercontent.com/...",
          "seed": 12345,
          "aspectRatio": "16:9",
          "modelNameType": "IMAGEN_3_5",
          "mediaGenerationId": "xyz789"
        }
      }
    }
  ],
  "captcha": {
    "service": "recaptcha",
    "durationMs": 1500
  }
}
```

### Server-side Flow (dengan Captcha Retry)

```
1. Parse request body
2. Validasi prompt (required)
3. RETRY LOOP (max 3 attempts):
   a. GET captcha token dari broker:
      GET http://localhost:4000/token?action=IMAGE_GENERATION
      Headers: X-API-Key: sk-admin-change-me
   b. Build payload: { prompt, model, aspectRatio, count, captchaToken, ... }
   c. POST ke UseAPI: /v1/google-flow/images
      Headers: Authorization: Bearer {USEAPI_TOKEN}
   d. Jika response 403 (captcha rejected):
      - Log warning
      - Loop kembali ke step (a) dengan token baru
   e. Jika response OK atau error lain:
      - Return response
4. FALLBACK (setelah 3x gagal 403):
   - POST ke UseAPI TANPA captchaToken
   - Return apapun hasilnya
```

### Error Responses

| Status | Keterangan |
|--------|------------|
| `400` | Prompt kosong |
| `401` | USEAPI_TOKEN tidak valid |
| `402` | Subscription/credits habis |
| `403` | reCAPTCHA rejected (sudah di-retry 3x + fallback) |
| `429` | Rate limit UseAPI |
| `500` | Internal server error / moderated content |
| `503` | Service unavailable |
| `596` | Google session expired |

---

## 3. Captcha Broker

### Directory: `captcha-broker/`
### Server: `node server.js` (default port: 4000)

reCAPTCHA Enterprise token broker. Token di-generate oleh Chrome Extension, bukan server.

### Arsitektur

```
Next.js API Route  →  GET /token  →  BROKER SERVER  →  GET /jobs/next      →  Chrome Extension
                                                    ←  POST /jobs/:id/result ←
Next.js API Route  ←  { token }   ←
```

### Endpoints untuk Client

#### `GET /token?action=IMAGE_GENERATION`

Request 1 token. Long-poll max 60 detik.

```bash
curl -H "X-API-Key: sk-admin-change-me" "http://localhost:4000/token?action=IMAGE_GENERATION"
```

Response:
```json
{
  "success": true,
  "token": "03AFcWeA...",
  "tokenId": "tok-a1b2c3d4e5f6",
  "action": "IMAGE_GENERATION",
  "generatedAt": "2026-02-28T04:00:00Z",
  "rateLimit": { "remaining": 99, "resetIn": 45 }
}
```

#### `GET /tokens?count=N&action=IMAGE_GENERATION`

Request N token sekaligus (max 10).

```json
{
  "success": true,
  "tokens": ["03AFcWeA...", "03AFcWeB...", "03AFcWeC..."],
  "tokenIds": ["tok-aaa", "tok-bbb", "tok-ccc"],
  "count": 3,
  "action": "IMAGE_GENERATION"
}
```

#### `GET /health`

Status server dan worker.

```json
{
  "success": true,
  "status": "ok",
  "workers": { "active": 2, "list": [...] },
  "jobs": { "pending": 0, "processing": 1, "totalDone": 42, "totalFailed": 0 }
}
```

### Action Types

| Action | `?action=` param | Dipakai oleh |
|--------|-----------------|--------------|
| Generate video | `VIDEO_GENERATION` (default) | Video generation |
| Generate image | `IMAGE_GENERATION` | `/api/ai/image-generate` |

### Konfigurasi

**API Keys:** `captcha-broker/keys.json`
```json
{
  "keys": {
    "sk-admin-change-me": { "name": "admin", "isAdmin": true, "limitPerMinute": 9999 },
    "sk-app1-change-me": { "name": "app-1", "isAdmin": false, "limitPerMinute": 100 }
  }
}
```

**Environment Variables (Next.js side):**

| Variable | Default | Keterangan |
|----------|---------|------------|
| `CAPTCHA_BROKER_URL` | `http://localhost:4000` | URL captcha broker server |
| `CAPTCHA_BROKER_KEY` | `sk-admin-change-me` | API key dari keys.json |

### Error Codes Broker

| Code | Alasan |
|------|--------|
| `401` | API key tidak ada / invalid |
| `403` | Key tidak punya akses admin |
| `429` | Rate limit tercapai |
| `503` | Timeout — tidak ada extension yang connect |

---

## 4. Download Proxy (`/api/ai/image-download`)

### File: `app/api/ai/image-download/route.ts`

Proxy download untuk Safari/iOS compatibility.

### Request

```
GET /api/ai/image-download?url=https://lh3.googleusercontent.com/...&filename=image.png
```

| Param | Type | Required | Default | Keterangan |
|-------|------|----------|---------|------------|
| `url` | query string | ✅ Yes | — | URL gambar dari Google |
| `filename` | query string | No | `generated-image.png` | Nama file download |

### Response

Binary image dengan header:
```
Content-Type: image/png
Content-Disposition: attachment; filename="image.png"
Cache-Control: public, max-age=3600
```

### Kenapa Perlu Proxy?

Safari/iOS tidak support `<a download>` untuk cross-origin URLs.
Server fetch → return blob dengan `Content-Disposition: attachment`.

---

## 5. Client-side API Wrapper (`lib/api/google-flow.ts`)

Tiga fungsi utama yang dipakai oleh komponen React:

### `uploadImageAsset(file, email?)`

Upload file binary ke Google Flow.

```ts
import { uploadImageAsset } from "@/lib/api/google-flow"

const result = await uploadImageAsset(file, email)
// result: { mediaGenerationId, width, height, email }
```

### `uploadImageFromUrl(url, email?)`

Re-upload gambar dari URL (misalnya dari gallery).

```ts
import { uploadImageFromUrl } from "@/lib/api/google-flow"

const result = await uploadImageFromUrl("https://...", email)
// result: { mediaGenerationId, width, height, email }
```

### `generateImages(params)`

Generate gambar dari prompt.

```ts
import { generateImages } from "@/lib/api/google-flow"

const result = await generateImages({
  prompt: "A cat on a rooftop",
  model: "imagen-4",
  aspectRatio: "16:9",
  count: 4,
  references: ["mediaGenId1"],
  email: "user@gmail.com",
})
// result: { jobId, images: [{ url, seed, mediaGenerationId, aspectRatio, modelNameType }] }
```

---

## 6. Generation Queue (`contexts/generation-queue.tsx`)

Background job queue yang survive navigation.

### Store

- Disimpan di `window.__jenna_gen_queue__` (global, survive HMR + navigation)
- React binding via `useSyncExternalStore`

### Job Lifecycle

```
submitJob(params, refs)
  ↓
status: "uploading" → Upload references satu per satu
  ↓
status: "generating" → Call generateImages()
  ↓
status: "done" | "error"
```

### Usage

```tsx
import { useGenerationQueue } from "@/contexts/generation-queue"

function MyComponent() {
  const { jobs, activeCount, submitJob, clearJob, clearCompleted } = useGenerationQueue()

  const handleGenerate = () => {
    const jobId = submitJob(
      { prompt: "...", model: "imagen-4", count: 4 },
      [{ file: myFile }]  // optional references
    )
  }
}
```

---

## 7. Full Flow Example

### Generate tanpa reference:

```
1. User ketik prompt + pilih model
2. submitJob({ prompt, model, count })
3. Queue: status = "generating"
4. Server: GET /token dari broker → POST UseAPI dengan captchaToken
5. Queue: status = "done", images = [...]
6. UI menampilkan gambar di notification bell + halaman generator
```

### Generate dengan reference images:

```
1. User pilih prompt + upload 2 foto referensi
2. submitJob({ prompt, model }, [{ file: file1 }, { file: file2 }])
3. Queue: status = "uploading" → "Mengupload referensi 1/2..."
4. Upload #1: POST /api/ai/image-upload → result.email = "xxx@gmail.com"
5. Upload #2: POST /api/ai/image-upload?email=xxx@gmail.com (pinned!)
6. Queue: status = "generating" → "Membuat gambar..."
7. Server: GET /token → POST UseAPI { prompt, references, email, captchaToken }
8. Queue: status = "done"
```
