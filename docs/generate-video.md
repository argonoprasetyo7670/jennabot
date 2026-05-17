# Generate Videos — UseAPI Google Flow (Veo 3.1)

> **Endpoint:** `POST https://api.useapi.net/v1/google-flow/videos`
> **Internal proxy:** `POST /api/ai/video-generate`

Generate videos using Google Flow AI models from text prompts with optional start/end frames, reference images, or voice narration. Videos are returned as signed URLs (MP4, valid ~24h).

---

## Model Capabilities

| Parameter | Veo 3.1 Quality | Veo 3.1 Fast *(default)* | Veo 3.1 Lite | Veo 3.1 Lite LP |
|---|---|---|---|---|
| **Model ID** | `veo-3.1-quality` | `veo-3.1-fast` | `veo-3.1-lite` | `veo-3.1-lite-low-priority` |
| T2V (text-to-video) | ✓ | ✓ | ✓ | ✓ |
| I2V (start frame) | ✓ | ✓ | ✓ | ✓ |
| I2V-FL (start + end) | ✓ | ✓ | ✓ | ✓ |
| R2V (reference 1-3) | ✗ | ✓ | ✓ | ✓ |
| Voice narration | ✗ | ✓ | ✓ | ✓ |
| Aspect ratios | all | all | all | all |
| Duration (sec) | 4, 6, 8 | 4, 6, 8 | 4, 6, 8 | 4, 6, 8 |
| Count | 1-4 | 1-4 | 1-4 | 1-4 |
| Seed | ✓ | ✓ | ✓ | ✓ |
| Subscription | all | all | all | Ultra only |
| **Cost** | 100 credits / $0.50 | 10 credits / $0.05 | 5 credits / $0.025 | free (lower priority) |

---

## Generation Modes

### T2V — Text to Video
Prompt only, no images needed.

### I2V — Image to Video
Upload a **start frame** via `POST /assets/email` → use returned `mediaGenerationId` as `startImage`.

### I2V-FL — Image to Video (First + Last)
Upload **start frame** + **end frame** → use as `startImage` + `endImage`. End frame requires start frame.

### R2V — Reference to Video
Upload 1-3 **reference images** → use as `referenceImage_1` to `referenceImage_3`.
- Only supported by `veo-3.1-fast`, `veo-3.1-lite`, `veo-3.1-lite-low-priority`
- **NOT** supported by `veo-3.1-quality`

> [!IMPORTANT]
> - Cannot mix R2V and I2V in the same request
> - End frame only (without start frame) is NOT supported
> - Voice narration requires at least one referenceImage (R2V mode)
> - Duration 4 and 6 only work for T2V/I2V/I2V-FL — R2V always uses duration 8

---

## Request Headers

```
Authorization: Bearer {USEAPI_TOKEN}
Content-Type: application/json
```

---

## Request Body

```json
{
  "prompt": "A serene mountain landscape at sunset with camera slowly panning right",
  "model": "veo-3.1-fast",
  "aspectRatio": "landscape",
  "duration": 8,
  "count": 2,
  "seed": 123456
}
```

### Parameters

| Parameter | Required | Type | Default | Description |
|---|---|---|---|---|
| `prompt` | ✓ | string | — | Text description for video generation |
| `model` | — | string | `veo-3.1-fast` | Model to use (see table above) |
| `aspectRatio` | — | string | `landscape` | `landscape` or `portrait` |
| `duration` | — | number | `8` | Video length: `4`, `6`, or `8` seconds |
| `count` | — | number | `1` | Number of variations: 1-4 |
| `seed` | — | number | — | Random seed for reproducible results (integer ≥ 0) |
| `email` | — | string | — | Google Flow account email (auto-selected if omitted) |
| `startImage` | — | string | — | `mediaGenerationId` from asset upload (I2V mode) |
| `endImage` | — | string | — | `mediaGenerationId` from asset upload (I2V-FL, requires startImage) |
| `referenceImage_1` to `_3` | — | string | — | `mediaGenerationId` from asset upload (R2V mode) |
| `voice` | — | string | — | Voice name for AI narration (R2V only, case-insensitive) |
| `async` | — | boolean | `false` | Fire-and-forget mode, returns 201 immediately |
| `replyUrl` | — | string | — | Webhook URL for job status callbacks |
| `replyRef` | — | string | — | Custom reference for webhook tracking |

---

## Voice Names (for narration)

Requires R2V mode (at least one referenceImage). Preview: `https://www.gstatic.com/aistudio/voices/samples/{Name}.wav`

```
achird, achernar, algieba, algenib, alnilam, aoede, autonoe, callirrhoe,
charon, despina, enceladus, erinome, fenrir, gacrux, iapetus, kore,
laomedeia, leda, orus, puck, pulcherrima, rasalgethi, sadachbia,
sadaltager, schedar, sulafat, umbriel, vindemiatrix, zephyr, zubenelgenubi
```

---

## Response (200 OK)

```json
{
  "jobId": "j1731859234567v-u12345-email:jo***@gmail.com-bot:google-flow",
  "media": [
    {
      "name": "CAUSJ...OWQ5ZA",
      "projectId": "...",
      "mediaMetadata": {
        "mediaStatus": {
          "mediaGenerationStatus": "MEDIA_GENERATION_STATUS_SUCCESSFUL"
        },
        "visibility": "PRIVATE"
      },
      "video": {
        "generatedVideo": {
          "seed": 123456,
          "model": "veo_3_1_t2v",
          "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
          "isLooped": false,
          "prompt": "A serene mountain landscape at sunset..."
        },
        "operation": { "name": "d00af...6f7a" }
      },
      "mediaGenerationId": "user:12345-email:6a6f...-video:CAUSJ...",
      "videoUrl": "https://storage.googleapis.com/ai-sandbox-videofx/video/..."
    }
  ],
  "remainingCredits": 18760
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `jobId` | string | Job identifier |
| `media[]` | array | **Preferred** — video data array |
| `media[].videoUrl` | string | Signed video download URL (MP4, valid ~24h) |
| `media[].mediaGenerationId` | string | Encoded reference ID for subsequent API calls |
| `media[].video.generatedVideo.seed` | number | Seed used for generation |
| `media[].video.generatedVideo.model` | string | `veo_3_1_t2v` / `veo_3_1_i2v` / `veo_3_1_i2v_fl` / `veo_3_1_r2v` |
| `media[].video.generatedVideo.aspectRatio` | string | `VIDEO_ASPECT_RATIO_LANDSCAPE` / `PORTRAIT` |
| `operations[]` | array | **Deprecated** — will be removed |
| `remainingCredits` | number | Credits remaining after generation |

---

## Error Responses

| Status | Description | Action |
|---|---|---|
| `400` | Bad request (invalid params) | Fix request body |
| `401` | Unauthorized (invalid token) | Check USEAPI_TOKEN |
| `402` | Insufficient credits | Buy more credits |
| `403` | Captcha required/failed | Retry with captcha token |
| `404` | Account not found | Check email param |
| `408` | Timeout | Retry — generation may still be running |
| `429` | Too many requests | Wait 5-10 seconds, retry. If persistent, cool off a few hours |
| `503` | Service unavailable | Wait 5-10 seconds, retry |

> [!TIP]
> Both 429 and 503 are temporary — safe to retry after 5-10 seconds.

---

## Timing

- Video generation: **60-180 seconds** depending on model and mode
- Generation time is the same regardless of duration (4/6/8s)
- Use `async: true` to avoid long request timeouts

---

## Internal Architecture

```
┌─────────────────────────────────────────────────────┐
│ Client (Browser)                                    │
│                                                     │
│ AI Video Generator Page                             │
│   └── useGenerationQueue().submitVideoJob()         │
│        ├── Upload assets → /api/ai/image-upload     │
│        └── Generate      → /api/ai/video-generate   │
│                                                     │
│ GenerationQueue (window-level store)                │
│   └── Job type: "video"                             │
│        Status: uploading → generating → done/error  │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌──────────────────────┐
│ /api/ai/        │  │ /api/ai/             │
│ image-upload    │  │ video-generate       │
│ (POST)          │  │ (POST)               │
│ → UseAPI        │  │ → UseAPI             │
│ /assets         │  │ /videos              │
└─────────────────┘  └──────────────────────┘
         │                    │
         ▼                    ▼
    UseAPI.net → Google Flow (Veo 3.1)
```

### Download Proxy

`GET /api/ai/video-download?url={videoUrl}&filename={name}.mp4`

Server-side fetch → returns blob with `Content-Disposition: attachment`. Fixes Safari/iOS cross-origin download issues.

---

## Files

| File | Purpose |
|---|---|
| `app/api/ai/video-generate/route.ts` | API proxy to UseAPI `/v1/google-flow/videos` |
| `app/api/ai/video-download/route.ts` | Download proxy for videos |
| `lib/api/google-flow.ts` | Client-side `generateVideos()` function |
| `contexts/generation-queue.tsx` | `submitVideoJob()` in global queue |
| `app/dashboard/tools/ai-video-generator/page.tsx` | Video generator UI page |
