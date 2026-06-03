# Agent Context — Jenna Bot Pro (SIMPLENGAT)

> Dokumentasi ini ditujukan untuk AI agent/developer agar memahami arsitektur, konvensi, dan cara kerja fitur **Video Template** di project ini.

---

## 🏗️ Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router, `"use client"`) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui components |
| Auth | NextAuth (JWT) |
| Database | Prisma + PostgreSQL |
| AI Models | `nano-banana-pro` (image generation), `veo-3.1-fast` (video generation) |
| State | React hooks (useState, useCallback) — no external state library |

---

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

## ⚠️ Gotchas & Known Patterns

1. **`deviceId` selalu `""`** — saat ini hardcoded empty string di hook.
2. **Gallery picker** di `image-upload-card.tsx` juga support upload baru (bukan hanya pilih dari galeri).
3. **Session handling**: jika upload response punya `shouldLogout: true`, auto-redirect ke reload page setelah 2 detik.
4. **Video prompt dikirim sebagai string** (bukan JSON object) ke API — di-`JSON.stringify()` sebelum dikirim.
5. **Semua proses sequential** per scene (bukan parallel) — karena scene berikutnya butuh `previousSceneImageId` dari scene sebelumnya.
6. **Aspect ratio selalu `portrait` (9:16)** — untuk format TikTok/Reels/Shorts.
7. **Feature gate**: fitur `video-template` termasuk dalam `enabledFeatures` default di Prisma schema.
8. **Download** menggunakan `downloadMediaFile()` dari `lib/download-media` — bukan link biasa karena URL FIFE butuh proxy.

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
