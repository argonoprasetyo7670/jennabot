# Agent Context — Jenna Bot Pro (SIMPLENGAT)

> Dokumentasi ini ditujukan untuk AI agent/developer agar memahami arsitektur, konvensi, dan cara kerja fitur **Video Template** di project ini.


## 📁 File Structure — Video Template

```
app/dashboard/video-template/
├── page.tsx                              # Entry point, wraps with ScrollArea + DashboardHeader
├── types.ts                              # All TypeScript interfaces (RefImage, SceneResult, Props)
├── components/
│   ├── video-template-content.tsx        # Orchestrator: connects state + generation hooks to UI
│   ├── template-selection.tsx            # Grid of template cards (uses VIDEO_TEMPLATES from lib)
│   ├── template-form.tsx                 # Left column: image upload, dialogue inputs, backsound, generate btn
│   ├── image-upload-card.tsx             # ImageUploadSlot + GalleryPicker (upload from file or gallery)
│   └── scene-results.tsx                 # Right column: per-scene results with preview, edit, download
└── hooks/
    ├── use-template-state.ts             # State: selected template, images, dialogues, backsound
    └── use-scene-generation.ts           # Logic: upload assets → generate image → generate video per scene

lib/templates/
├── index.ts                              # Registry: VIDEO_TEMPLATES[], TEMPLATE_MAP, helper functions
├── gamis-templates.ts                    # Template Gamis (5 scenes)
├── sepatu-templates.ts                   # Template Sepatu (5 scenes)
├── parfum-templates.ts                   # Template Parfum (5 scenes)
├── tas-templates.ts                      # Template Tas (5 scenes)
├── jam-tangan-templates.ts               # Template Jam Tangan (5 scenes)
├── kacamata-templates.ts                 # Template Kacamata (5 scenes)
├── hijab-templates.ts                    # Template Hijab (5 scenes)
├── kaos-pria-templates.ts                # Template Kaos Pria (5 scenes)
├── kemeja-pria-templates.ts              # Template Kemeja Pria (5 scenes)
└── snack-lebaran-templates.ts            # Template Snack Lebaran (5 scenes)
```

---

## 🔄 Data Flow

```
┌──────────────────┐
│  TemplateSelection │  ← User pilih 1 dari 10 template
└────────┬─────────┘
         │ onSelect(templateId)
         ▼
┌──────────────────┐
│   TemplateForm    │  ← User upload 3 gambar (model, background, produk)
│                    │  ← User edit dialogue per scene
│                    │  ← User toggle backsound
└────────┬─────────┘
         │ onGenerate()
         ▼
┌──────────────────────────────────────────────────────────────┐
│  useSceneGeneration.handleGenerate()                          │
│                                                                │
│  1. Upload 3 gambar → /api/internal/upload-image (FormData)   │
│     → dapat modelId, backgroundId, productId                   │
│                                                                │
│  2. Loop per scene (sequential):                               │
│     a. Generate Image → /api/internal/generate-image           │
│        - mode: 'image-to-image'                                │
│        - model: 'nano-banana-pro'                              │
│        - referenceImages: [modelId, prevSceneId, bgId]         │
│        - prompt: buildTemplateImagePrompt(...)                 │
│                                                                │
│     b. Save to Library → /api/internal/media/actions           │
│        - action: 'saveUserAsset'                               │
│                                                                │
│     c. Generate Video → /api/internal/media/actions            │
│        - action: 'generateImageToVideoWithPolling'             │
│        - model: 'veo-3.1-fast'                                 │
│        - referenceImageId: generated image id                  │
│        - prompt: buildTemplateVideoPrompt(...)                 │
│                                                                │
│  3. Update sceneResults[] state per scene                      │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│   SceneResults    │  ← Preview gambar + video (9:16 portrait)
│                    │  ← Regenerate (image/video/both)
│                    │  ← Edit prompt/dialogue → regenerate
│                    │  ← Upscale to 4K
│                    │  ← Download
└──────────────────┘
```

---

## 📋 Key Types

### `RefImage` — Gambar input dari user
```ts
type RefImage =
    | { kind: "file"; file: File; preview: string }        // Upload dari device
    | { kind: "gallery"; mediaGenerationId: string; preview: string }  // Dari galeri existing
```

### `SceneResult` — Hasil generate per scene
```ts
interface SceneResult {
    scene: number
    name: string
    dialogue: string
    image?: { mediaGenerationId: string; fifeUrl: string }
    video?: { mediaGenerationId: string; fifeUrl: string }
    status: 'pending' | 'generating-image' | 'generating-video' | 'completed' | 'failed'
    error?: string
    imagePrompt?: string       // Editable oleh user
    videoPrompt?: string       // Editable oleh user (JSON string)
    isEditing?: boolean        // Toggle edit prompt
    isEditingDialogue?: boolean // Toggle edit dialogue
}
```

### Template Structure (contoh: `GamisTemplate`)
```ts
interface SceneTemplate {
    scene: number
    name: string
    duration: number
    imagePrompt: {
        pose: string
        expression: string
        hand_position: string
        eye_direction: string
        additional: string
    }
    videoPrompt: {
        camera: { start: string; movement: string; end: string }
        action_sequence: { second: number; action: string }[]
        mood: string
    }
    defaultDialogue: string
}

interface GamisTemplate {
    id: string
    name: string
    description: string
    consistencyAnchors: {
        character: string    // SAME PERSON throughout all scenes
        outfit: string       // Matching hijab + gamis
        background: string   // EXACT SAME background
        mood: string         // Consistent energy
        style: string        // Photography style
    }
    scenes: SceneTemplate[]  // Always 5 scenes
}
```

---

## 🌐 API Endpoints

### `POST /api/internal/upload-image`
Upload gambar user (FormData: `image`, `deviceId`, `saveToLibrary`, `email`)
→ Returns: `{ success, mediaGenerationId, email }`

### `POST /api/internal/generate-image`
Generate gambar via AI.
```json
{
    "mode": "image-to-image",
    "prompt": "...",
    "referenceImages": ["id1", "id2", "id3"],
    "model": "nano-banana-pro",
    "aspectRatio": "portrait",
    "count": 1,
    "deviceId": ""
}
```
→ Returns: `{ success, images: [{ mediaGenerationId, fifeUrl }] }`

### `POST /api/internal/media/actions`
Multi-purpose endpoint. Action-based routing:

| Action | Payload | Response |
|---|---|---|
| `generateImageToVideoWithPolling` | `{ prompt, referenceImageId, model, aspectRatio, count, deviceId }` | `{ success, videos: [{ fifeUrl, mediaGenerationId }] }` |
| `upscaleVideo` | `{ mediaGenerationId, resolution: '4K', async: false, deviceId }` | `{ success, video: { fifeUrl, resolution } }` |
| `saveUserAsset` | `{ mediaGenerationId, name, thumbnailUrl, type, deviceId }` | `{ success }` |

### `GET /api/internal/gallery/my`
Fetch gallery images. Query: `?page=1&limit=60&type=image`
→ Returns: `{ success, items: GalleryItem[] }`

---

## 🧩 Template Registry System

Semua template terdaftar di `lib/templates/index.ts`:

### Menambah Template Baru

1. **Buat file template** di `lib/templates/` (misal `jaket-templates.ts`):
   - Export interface `JaketSceneTemplate` & `JaketTemplate`
   - Export const `JAKET_PROMOTION_TEMPLATE`
   - Export `buildJaketImagePrompt()` & `buildJaketVideoPrompt()`
   - Template HARUS punya 5 scenes dengan `defaultDialogue` per scene

2. **Register di `lib/templates/index.ts`**:
   - Import template + builders + types
   - Tambahkan ke `VIDEO_TEMPLATES[]` (UI config: id, name, icon, color, etc.)
   - Tambahkan ke `TEMPLATE_MAP{}` (runtime: template data + prompt builders)
   - Tambahkan ke union types `AnyScene` dan `AnyTemplate`
   - Re-export types

3. **Tidak perlu ubah komponen UI** — semua komponen membaca dari registry secara dinamis.

### Konvensi Template

- Setiap template punya **5 scene** dengan `duration: 8` detik
- Scene pattern umum: **Hook → Showcase → Detail → Lifestyle → CTA**
- Semua template punya `consistencyAnchors` untuk menjaga konsistensi visual antar scene
- `buildImagePrompt()` menghasilkan string prompt untuk image generation
- `buildVideoPrompt()` menghasilkan JSON object untuk video generation
- Image prompt menyertakan `[CRITICAL CONSISTENCY RULES: ...]` prefix
- Video prompt menyertakan `audio_instructions` berdasarkan toggle backsound

---

## 🗄️ Storage Decision: File-based (bukan Database)

Template disimpan di file TypeScript (`lib/templates/*.ts`), **bukan di database**. Keputusan ini diambil karena:

1. **Prompt builders adalah functions** — `buildImagePrompt()` dan `buildVideoPrompt()` mengandung logic per kategori produk yang tidak bisa di-serialize ke DB tanpa membuat template engine
2. **Type safety** — Template punya nested structure (`imagePrompt.pose`, `videoPrompt.camera.start`, `action_sequence[]`) yang di-validate TypeScript saat compile
3. **Git versioning** — Setiap perubahan prompt ke-track di git dan bisa di-rollback
4. **Zero latency** — Template available langsung tanpa query DB
5. **Simple to add** — 1 file + register di `index.ts` = selesai, tanpa migration

### Kapan Perlu Migrasi ke Database?

Pertimbangkan **hybrid approach** jika:
- Admin/non-developer perlu CRUD template via dashboard
- Reseller perlu custom template per brand
- Template count > 50 dan sering berubah
- Perlu A/B testing prompt antar template

**Hybrid**: metadata (name, icon, description) → DB | prompt builders (logic) → tetap di TS, di-map by template ID

---

## 🔑 Konsep Penting

### Konsistensi Visual Antar Scene
- Scene 1 menggunakan referenceImages: `[modelId, backgroundId, productId]`
- Scene 2+ menggunakan: `[modelId, previousSceneImageId, backgroundId]`
- `previousSceneImageId` = `mediaGenerationId` dari gambar scene sebelumnya
- Ini memastikan karakter, outfit, dan environment konsisten

### Regeneration Modes
| Mode | Apa yang di-regenerate | Kapan dipakai |
|---|---|---|
| `handleRegenerateScene(idx)` | Image + Video | Hasilnya jelek keduanya |
| `handleRegenerateImageOnly(idx)` | Image saja | Gambar jelek tapi video OK (atau belum ada video) |
| `handleRegenerateVideoOnly(idx)` | Video saja (pakai image existing) | Gambar bagus tapi video jelek |

### Prompt Editing
User bisa edit `imagePrompt` (string) dan `videoPrompt` (JSON string) per scene, lalu regenerate untuk menggunakan prompt custom.

### Upscale to 4K
Setelah video selesai, user bisa upscale ke resolusi 4K via `upscaleVideo` action. Hasilnya ditampilkan terpisah di bawah video original.

---

## 🚨 Error Handling & Recovery Flow

### Error Points & Behavior

```
Pipeline: Upload → [Scene 1: Image → Save → Video] → [Scene 2: Image → Save → Video] → ... → [Scene 5]
                 ↑          ↑            ↑                   ↑
              Error A     Error B      Error C             Error D
```

| Error | Titik Gagal | Behavior | Credits |
|-------|------------|----------|--------|
| **A — Upload Gagal** | Upload 3 gambar awal | Semua scene batal. Toast error. Status: `failed`. | ❌ Tidak ada deduction |
| **B — Image Gen Gagal** | Generate image scene N | Scene N status → `failed`. **Scene N+1 dst tetap jalan** (pakai fallback reference). | ❌ Tidak ada deduction untuk scene gagal |
| **C — Video Gen Gagal** | Generate video scene N | Scene N: image ada, video kosong. Status → `failed`. Scene berikutnya tetap lanjut. | ✅ Image sudah di-deduct, video tidak |
| **D — Mid-Pipeline Gagal** | Scene 3 gagal, scene 1-2 sudah done | Scene 1-2 tetap tersimpan. Scene 3 bisa di-regenerate manual. | ✅ Hanya scene sukses yang di-deduct |

### Detailed Error Scenarios

#### 1. Upload Failure (Error A)
```
User click Generate
  → Upload 3 gambar ke /api/internal/upload-image
  → Salah satu gagal (network error, file too large, server error)
  → Toast: "Gagal mengupload gambar. Silakan coba lagi."
  → Semua scene status tetap 'pending'
  → User bisa retry tanpa re-upload gambar (files masih di state)
```

#### 2. Image Generation Failure (Error B)
```
Scene N image generation gagal
  → Scene N status → 'failed', error message disimpan
  → Scene N+1:
    ├── Kalau N=1 gagal → Scene 2 pakai [modelId, backgroundId, productId] (fallback ke original refs)
    └── Kalau N>1 gagal → Scene N+1 pakai previousSceneImageId dari scene terakhir yang sukses
  → User bisa klik "Regenerate Image" untuk retry scene yang gagal
```

#### 3. Video Generation Failure (Error C)
```
Scene N video generation gagal (timeout, API error, captcha)
  → Scene N: image tersimpan, video kosong
  → Status → 'failed' (atau partial: image done, video failed)
  → User bisa klik "Regenerate Video" → retry hanya video, pakai image existing
  → Credits: image sudah di-deduct (5), video TIDAK di-deduct (20)
```

#### 4. Session Expiry
```
API response mengandung { shouldLogout: true }
  → Toast warning: "Sesi Anda telah berakhir"
  → Auto-reload page setelah 2 detik
  → Progress hilang — scene yang sudah selesai tetap di server tapi state lokal hilang
```

### Regeneration After Failure

User punya 3 opsi regenerate per scene (tersedia di `SceneResults` component):

| Button | Fungsi | Kapan Dipakai |
|--------|--------|---------------|
| 🔄 Regenerate All | Re-generate image + video | Hasil keduanya jelek |
| 🖼️ Regenerate Image | Re-generate image saja | Gambar jelek, belum ada video |
| 🎬 Regenerate Video | Re-generate video saja (pakai image existing) | Gambar bagus, video jelek |

> **Penting:** Regenerate image di scene N **TIDAK** otomatis regenerate scene N+1 dst. Konsistensi antar scene bisa terpengaruh jika image berubah.

---

## 💰 Credit Cost & Billing

### Cost Constants

| Operation | Cost | Constant | Source |
|-----------|------|----------|--------|
| Image Generation | 5 credits | `CREDIT_COST_IMAGE` | `contexts/generation-queue.tsx` |
| Video Generation | 20 credits | `CREDIT_COST_VIDEO` | `contexts/generation-queue.tsx` |
| Upscale to 4K | TBD | — | Belum diimplementasi di template |

### Cost Per Scene

| Step | Credits | Notes |
|------|---------|-------|
| Generate Image | 5 | 1 image per scene |
| Generate Video | 20 | 1 video per scene (I2V) |
| **Subtotal per scene** | **25** | Image + Video |

### Cost Per Template (5 Scenes)

| Scenario | Calculation | Total Credits |
|----------|-------------|---------------|
| Full template (happy path) | 5 scenes × (5 + 20) | **125 credits** |
| Template tanpa video | 5 scenes × 5 | **25 credits** |
| Regenerate 1 scene (image + video) | 1 × (5 + 20) | **+25 credits** |
| Regenerate 1 scene (video only) | 1 × 20 | **+20 credits** |
| Upscale 1 video to 4K | TBD | **TBD** |

### Deduction Flow

```
Per Scene:
  Image Gen → API call → Success?
    ├── ✅ Yes → Deduct 5 credits → POST /api/credits { amount: 5, feature: 'video-template' }
    │           → dispatch 'credits-updated' event
    └── ❌ No  → No deduction

  Video Gen → API call → Success?
    ├── ✅ Yes → Deduct 20 credits → POST /api/credits { amount: 20, feature: 'video-template' }
    │           → dispatch 'credits-updated' event
    └── ❌ No  → No deduction, image credits tetap terpakai
```

### Pre-Generation Validation

Sebelum generate, hook **harus** cek saldo cukup:
```typescript
// Minimum: semua scene image + video
const totalCost = template.scenes.length * (CREDIT_COST_IMAGE + CREDIT_COST_VIDEO)
if (balance < totalCost) {
  toast({ title: "Kredit tidak cukup", description: `Butuh ${totalCost} credits, saldo: ${balance}` })
  return
}
```

### UI Display

Tampilkan estimasi biaya di `TemplateForm` sebelum tombol Generate:
```
"Pembuatan 5 scene akan menggunakan ±125 credits (5 × 25 credits/scene)"
```

---

## ✅ Success Flow: Save & Download

### Per-Scene Result Actions

Setiap scene yang berhasil menampilkan aksi berikut di `SceneResults` component:

| Action | Target | Method |
|--------|--------|--------|
| 👁️ Preview | Image & Video | Inline preview (9:16 portrait) |
| 💾 Save to Gallery | Image | `POST /api/gallery/save` → `sourceAction: "video-template"` |
| 💾 Save to Gallery | Video | `POST /api/gallery/save` → `sourceAction: "video-template"` |
| ⬇️ Download Image | Image | `downloadImage()` dari `lib/download.ts` (proxy via `/api/ai/image-download`) |
| ⬇️ Download Video | Video | `downloadVideo()` dari `lib/download.ts` (proxy via `/api/ai/video-download`) |
| 🔄 Regenerate | Image/Video/Both | Lihat section Regeneration |
| 🔍 Edit Prompt | Image/Video prompt | Toggle inline editor, lalu regenerate |
| 📝 Edit Dialogue | Dialogue text | Toggle inline editor per scene |
| 📐 Upscale 4K | Video | `upscaleVideo` action via `/api/internal/media/actions` |

### Save to Gallery Pattern

```typescript
// Contoh save image ke gallery
const res = await fetch("/api/gallery/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: scene.image.fifeUrl,
    type: "image",
    prompt: scene.imagePrompt,
    model: "nano-banana-pro",
    aspectRatio: "9:16",
    sourceAction: "video-template",
    mediaGenerationId: scene.image.mediaGenerationId,
  }),
})

// Contoh save video ke gallery
const res = await fetch("/api/gallery/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: scene.video.fifeUrl,
    type: "video",
    prompt: scene.videoPrompt,
    model: "veo-3.1-fast",
    aspectRatio: "9:16",
    sourceAction: "video-template",
    mediaGenerationId: scene.video.mediaGenerationId,
  }),
})
```

### Download Pattern

Semua download menggunakan server proxy karena URL FIFE cross-origin (Safari/iOS tidak support `<a download>`):

```typescript
import { downloadImage, downloadVideo } from "@/lib/download"

// Download image
await downloadImage(scene.image.fifeUrl, `scene-${scene.scene}-image.jpg`)

// Download video
await downloadVideo(scene.video.fifeUrl, `scene-${scene.scene}-video.mp4`)
```

### Duplikat Detection

`/api/gallery/save` melakukan duplikat detection berdasarkan URL. Jika sudah tersimpan, response tetap `{ success: true }` tanpa membuat record baru.

### Save Button States

```
Simpan → Menyimpan... → Tersimpan ✅
  (idle)   (loading)     (saved, disabled)
```

---

## ⚠️ Gotchas & Known Patterns

1. **`deviceId` selalu `""`** — saat ini hardcoded empty string di hook.
2. **Gallery picker** di `image-upload-card.tsx` juga support upload baru (bukan hanya pilih dari galeri).
3. **Session handling**: jika upload response punya `shouldLogout: true`, auto-redirect ke reload page setelah 2 detik.
4. **Video prompt dikirim sebagai string** (bukan JSON object) ke API — di-`JSON.stringify()` sebelum dikirim.
5. **Semua proses sequential** per scene (bukan parallel) — karena scene berikutnya butuh `previousSceneImageId` dari scene sebelumnya.
6. **Aspect ratio selalu `portrait` (9:16)** — untuk format TikTok/Reels/Shorts.
7. **Feature gate**: fitur `video-template` termasuk dalam `enabledFeatures` default di Prisma schema.
8. **Download** menggunakan `downloadImage()` / `downloadVideo()` dari `lib/download.ts` — bukan link biasa karena URL FIFE butuh proxy.
9. **API route naming**: Dokumen ini menggunakan `/api/internal/*` routes yang **belum ada di codebase**. Saat implementasi, perlu dibuat baru ATAU di-map ke existing routes (`/api/ai/image-upload`, `/api/ai/image-generate`, `/api/ai/video-generate`, dll). Lihat AGENTS.md section 2.2 untuk daftar routes yang sudah ada.
10. **Credit cost tinggi**: 1 template penuh = 125 credits. Pastikan ada warning/konfirmasi sebelum user generate.

---

## 🎨 UI Layout

```
┌────────────────────────────────────────────────────────┐
│  DashboardHeader (Breadcrumb: Dashboard > Video Template)   │
├────────────────────┬───────────────────────────────────┤
│                    │                                    │
│  LEFT (col-5)      │  RIGHT (col-7)                    │
│                    │                                    │
│  ┌──────────────┐  │  ┌──────────────────────────────┐ │
│  │ Back Button   │  │  │  Scene Results                │ │
│  │ Hero Section  │  │  │                                │ │
│  │               │  │  │  ┌── Scene 1 ──────────────┐  │ │
│  │ Image Inputs  │  │  │  │ Status │ Name │ Actions  │  │ │
│  │ ┌─────┬─────┐│  │  │  │ Dialogue                 │  │ │
│  │ │Model│Prod ││  │  │  │ ┌──────┐ ┌──────┐       │  │ │
│  │ │     │     ││  │  │  │ │Image │ │Video │       │  │ │
│  │ ├─────┴─────┤│  │  │  │ │9:16  │ │9:16  │       │  │ │
│  │ │ Background ││  │  │  │ └──────┘ └──────┘       │  │ │
│  │ └───────────┘│  │  │  └──────────────────────────┘  │ │
│  │               │  │  │                                │ │
│  │ Dialogue      │  │  │  ┌── Scene 2 ──────────────┐  │ │
│  │ per Scene     │  │  │  │ ...                      │  │ │
│  │               │  │  │  └──────────────────────────┘  │ │
│  │ Backsound ⚙️  │  │  │                                │ │
│  │               │  │  │  ... (5 scenes total)          │ │
│  │ [Generate]    │  │  │                                │ │
│  │ Progress Bar  │  │  │  [Reset]                       │ │
│  └──────────────┘  │  └──────────────────────────────┘ │
│                    │                                    │
└────────────────────┴───────────────────────────────────┘
```

---

## 📝 Konvensi Kode

- **Bahasa UI**: Bahasa Indonesia (toast messages, labels, descriptions)
- **Bahasa kode**: English (variable names, functions, types)
- **State management**: React hooks only, no Redux/Zustand
- **API calls**: `postJson()` dan `postFormData()` dari `lib/client-api` — wrapper fetch dengan error handling
- **Toast notifications**: shadcn `useToast()` untuk feedback ke user
- **Component composition**: Props-based, no context (kecuali SessionProvider)
- **Lucide React icons**: Digunakan di seluruh UI
