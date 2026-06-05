# Audio Tools — ElevenLabs Integration

> Dokumentasi teknis fitur Audio Tools yang menggunakan ElevenLabs API.

---

## Arsitektur

```
┌────────────────────────────────────────────────┐
│  Client (Browser)                              │
│                                                │
│  /dashboard/audio-tools/text-to-speech         │
│    ├── Fetch voices  → GET  /api/ai/voices     │
│    └── Generate TTS  → POST /api/ai/tts        │
│                                                │
│  /dashboard/audio-tools/sound-effects          │
│    └── Generate SFX  → POST /api/ai/sfx        │
└────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────────┐
│ /api/ai/voices  │  │ /api/ai/tts         │
│ (GET)           │  │ /api/ai/sfx         │
│                 │  │ (POST)              │
│ List voices     │  │ Generate audio      │
│ Cache: 5min     │  │ Credit deduction    │
└─────────────────┘  └─────────────────────┘
         │                    │
         ▼                    ▼
    lib/api/elevenlabs.ts
    (Round-robin API key selection)
         │
         ▼
    ElevenLabs REST API
    https://api.elevenlabs.io/v1
```

---

## Round-Robin API Keys

File: `lib/api/elevenlabs.ts`

Menggunakan global counter untuk bergantian antara 2 API key:

| Counter | Key Used |
|---------|----------|
| Request #1 | `ELEVENLABS_API_KEY` |
| Request #2 | `ELEVENLABS_API_KEY_1` |
| Request #3 | `ELEVENLABS_API_KEY` |
| Request #4 | `ELEVENLABS_API_KEY_1` |
| ... | ... |

Setiap request ke ElevenLabs API di-log dengan info key mana yang digunakan:
```
[elevenlabs] Using API key #1 of 2 (request #5)
```

---

## API Routes

### GET `/api/ai/voices`

Mengembalikan daftar voice yang tersedia dari ElevenLabs.

**Response:**
```json
{
  "voices": [
    {
      "voice_id": "21m00Tcm4TlvDq8ikWAM",
      "name": "Rachel",
      "category": "premade",
      "labels": { "accent": "american", "age": "young", "gender": "female" },
      "preview_url": "https://...",
      "description": "..."
    }
  ]
}
```

**Cache:** `max-age=300` (5 menit)

---

### POST `/api/ai/tts`

Generate speech dari teks.

**Request Body:**
```json
{
  "text": "Halo, selamat datang di Jenna Bot Pro!",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "modelId": "eleven_multilingual_v2",
  "stability": 0.5,
  "similarityBoost": 0.75
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | ✅ | Max 5000 chars |
| `voiceId` | string | ✅ | Voice ID dari `/api/ai/voices` |
| `modelId` | string | ❌ | Default: `eleven_multilingual_v2` |
| `stability` | number | ❌ | 0–1, default: 0.5 |
| `similarityBoost` | number | ❌ | 0–1, default: 0.75 |

**Response:** `audio/mpeg` binary

**Credit Cost:** 3 poin

---

### POST `/api/ai/sfx`

Generate sound effects dari deskripsi teks.

**Request Body:**
```json
{
  "text": "Suara hujan deras di atap rumah",
  "durationSeconds": 5.0
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | ✅ | Max 1000 chars |
| `durationSeconds` | number | ❌ | 0.5–22 detik |

**Response:** `audio/mpeg` binary

**Credit Cost:** 5 poin

---

## Available Models

| Model ID | Nama | Deskripsi |
|----------|------|-----------|
| `eleven_v3` | Eleven v3 | Model terbaru, ekspresi emosi tinggi |
| `eleven_multilingual_v2` | Multilingual v2 | Stabil, 29+ bahasa (default) |
| `eleven_flash_v2_5` | Flash v2.5 | Ultra-low latency, ~75ms |

---

## Credit Costs

| Fitur | Credit Cost |
|-------|-------------|
| Text to Speech | 3 poin per generation |
| Sound Effects | 5 poin per generation |

Credit di-deduct sebelum API call. Jika API call gagal, credit otomatis di-refund.

---

## Environment Variables

```env
# Round-robin (kedua key bergantian)
ELEVENLABS_API_KEY=sk_xxx
ELEVENLABS_API_KEY_1=sk_yyy
```

---

## Halaman Dashboard

### Text to Speech (`/dashboard/audio-tools/text-to-speech`)

- Voice picker dengan search & preview
- Model selector (3 model)
- Voice settings (stability, similarity boost)
- Audio player dengan progress bar
- Download MP3

### Sound Effects (`/dashboard/audio-tools/sound-effects`)

- Prompt input dengan example prompts
- Duration control (opsional, 0.5–22s)
- History panel (client state)
- Play/pause per item
- Download & delete

---

## Sidebar Navigation

```
🎤 Audio Tools  ▼
  ├─ Text to Speech
  └─ Sound Effects
```

Ditambahkan setelah "Video Tools" di sidebar.
