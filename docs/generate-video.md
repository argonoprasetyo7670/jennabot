# Generate Videos — UseAPI Google Flow (Veo 3.1 + Omni Flash)

> **Endpoint:** `POST https://api.useapi.net/v1/google-flow/videos`
> **Internal proxy:** `POST /api/ai/video-generate`

Generate videos using Google Flow AI models from text prompts with optional start/end frames, reference images, reference video (Omni Flash V2V edit), and voice narration. Videos are returned as signed URLs (MP4, valid ~24h).

---

## Model Capabilities

| Model | Generation type(s) | UseAPI Credits |
|---|---|---|
| `veo-3.1-lite` | 4s/6s/8s + Extend | Non-Ultra: 10, Ultra: 5 |
| `veo-3.1-lite-low-priority` | 4s/6s/8s + Extend | Ultra $200 only: **0** (lower priority) |
| `veo-3.1-fast` *(default)* | 4s/6s/8s + Extend | Non-Ultra: 20, Ultra: 10 |
| `veo-3.1-quality` | 8s only + Extend | 100 |
| `omni-flash` | 4s/6s/8s/10s (T2V, R2V, V2V edit) | 4s:15 / 6s:20 / 8s:25 / 10s:30; V2V edit: 40 |

> [!IMPORTANT]
> `CREDIT_COST_VIDEO = 5` in our app is a **simplification** — the actual UseAPI credit cost varies per model. Our internal credits are separate from UseAPI credits. Adjust pricing per-model if needed.

### Aspect Ratios

| Model | Supported |
|---|---|
| Veo (all variants) | `landscape` *(default)*, `portrait`, `1:1`, `4:3`, `3:4` |
| omni-flash | `landscape` *(default)*, `portrait` |

### Duration

| Mode / Model | Supported |
|---|---|
| Veo T2V / I2V / I2V-FL | `4`, `6`, `8` *(default)* — 4/6 are Ultra-only |
| Veo R2V | `8` only |
| omni-flash T2V / R2V | `4`, `6`, `8` *(default)*, `10` |
| omni-flash V2V edit | Not accepted — output matches input trim window |

### Reference Limits

| Reference | Parameter(s) | Veo | omni-flash |
|---|---|---|---|
| Start frame (I2V) | `startImage` | ✓ | ✗ |
| Start + end (I2V-FL) | `startImage` + `endImage` | ✓ | ✗ |
| Image refs (R2V) | `referenceImage_1..7` | up to 3 (not veo-quality) | up to 7 (R2V) / 5 (V2V edit) |
| Voice narration | `referenceAudio_1..5` | 1 (slot _1, R2V only) | up to 5 (R2V) / 3 (V2V edit) |
| Source video (V2V edit) | `referenceVideo_1` | — | ✓ (omni-flash only) |

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

### All Parameters

| Parameter | Required | Type | Default | Notes |
|---|---|---|---|---|
| `prompt` | ✓ | string | — | Text description |
| `model` | — | string | `veo-3.1-fast` | See table above |
| `aspectRatio` | — | string | `landscape` | Veo: landscape/portrait/1:1/4:3/3:4; omni: landscape/portrait |
| `duration` | — | number | `8` | 4/6/8/10 — see constraints above |
| `count` | — | number | `1` | 1-4 variations |
| `seed` | — | number | — | Integer ≥ 0 |
| `email` | — | string | — | Auto-selected if omitted (load balanced) |
| `startImage` | — | string | — | `mediaGenerationId` from asset upload (I2V) |
| `endImage` | — | string | — | `mediaGenerationId`, requires `startImage` |
| `referenceImage_1..7` | — | string | — | `mediaGenerationId` (R2V mode) |
| `referenceAudio_1..5` | — | string | — | Voice preset name (case-insensitive) |
| `referenceVideo_1` | — | string | — | `mediaGenerationId` of video (omni-flash V2V only) |
| `startFrameIndex_1` | — | number | `0` | V2V trim start on 24fps timeline (0-239) |
| `endFrameIndex_1` | — | number | auto | V2V trim end (1-240, 240=10s) |
| `async` | — | boolean | `false` | Fire-and-forget — returns 201 with jobId |
| `replyUrl` | — | string | — | Webhook URL for job callbacks |
| `replyRef` | — | string | — | Custom tracking reference |
| `captchaToken` | — | string | — | Your own reCAPTCHA v3 Enterprise token |
| `captchaRetry` | — | number | `3` | 1-10 retry attempts |
| `captchaOrder` | — | string | — | Comma-separated provider order |

---

## Response (200 OK)

```json
{
  "jobId": "j1731859234567v-u12345-email:jo***@gmail.com-bot:google-flow",
  "media": [
    {
      "name": "a1d95d21-...",
      "mediaGenerationId": "user:12345-email:6a6f...-video:a1d95d21-...",
      "videoUrl": "https://flow-content.google/video/a1d95d21-...?Expires=...",
      "thumbnailUrl": "https://flow-content.google/image/a1d95d21-...?Expires=...",
      "video": {
        "generatedVideo": {
          "seed": 123456,
          "model": "veo_3_1_t2v",
          "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
          "isLooped": false,
          "prompt": "A serene mountain landscape..."
        }
      }
    }
  ],
  "remainingCredits": 18760
}
```

### Key Response Fields

| Field | Description |
|---|---|
| `media[].videoUrl` | Signed MP4 URL (~24h expiry, parse `?Expires=` for countdown) |
| `media[].thumbnailUrl` | Signed JPEG thumbnail URL (~24h expiry) — use for gallery previews |
| `media[].mediaGenerationId` | Reference ID for subsequent API calls (reference upload re-use) |
| `media[].video.generatedVideo.seed` | Seed used |
| `media[].video.generatedVideo.model` | `veo_3_1_t2v` / `veo_3_1_i2v` / `veo_3_1_i2v_fl` / `veo_3_1_r2v` / `omni_flash_*` |

---

## Async + Webhook Flow (Hybrid)

Our implementation uses a **hybrid approach** — replyUrl for fast delivery + polling as fallback:

```
POST /api/ai/video-generate (async: true)
  → UseAPI: {async: true, replyUrl: ".../api/ai/video-callback?secret=..."}
  → Store job metadata in DB (vjmeta:{jobId})
  → Return immediately: {jobId, status: "processing"}

UseAPI finishes:
  → POST /api/ai/video-callback?secret=...
    → Verify secret (first 16 chars of NEXTAUTH_SECRET)
    → Extract media[], deduct credits
    → Cache result in DB (vj:{jobId})

Client polls GET /api/ai/video-generate?jobId=...
  → Check DB cache first (fast path if webhook delivered)
  → Fallback: poll UseAPI directly (if webhook not yet arrived / local dev)
  → On completion: cache to DB, return result
```

> [!NOTE]
> `replyUrl` is only attached in **production** (when `NEXTAUTH_URL` doesn't contain `localhost`). In local dev, polling mode is used automatically.

---

## Error Handling

| Status | Cause | Action |
|---|---|---|
| `400` | Invalid params | Fix request |
| `401` | Bad auth token | Check `USEAPI_TOKEN` |
| `402` | Insufficient credits | Buy more credits |
| `403` | Captcha rejected | Increase `captchaRetry`, add more providers |
| `404` | Account not found | Check email param |
| `408` | Timeout | Retry |
| `429: PUBLIC_ERROR_UNUSUAL_ACTIVITY_TOO_MUCH_TRAFFIC` | Captcha provider overloaded | Add more providers, wait 30-60s |
| `429: PUBLIC_ERROR_USER_REQUESTS_THROTTLED` | Too many concurrent requests | Wait 10-60min |
| `429: PUBLIC_ERROR_PER_MODEL_DAILY_QUOTA_REACHED` | Daily quota hit | Wait until UTC midnight or switch model |
| `429: PUBLIC_ERROR_USER_QUOTA_REACHED` | Overall account quota | Add more accounts |
| `503` | Transient Google issue | Wait 5-10s, retry |

---

## Voice Presets (30 names)

```
Achird, Achernar, Algieba, Algenib, Alnilam, Aoede, Autonoe, Callirrhoe,
Charon, Despina, Enceladus, Erinome, Fenrir, Gacrux, Iapetus, Kore,
Laomedeia, Leda, Orus, Puck, Pulcherrima, Rasalgethi, Sadachbia,
Sadaltager, Schedar, Sulafat, Umbriel, Vindemiatrix, Zephyr, Zubenelgenubi
```

Preview: `https://www.gstatic.com/aitestkitchen/voices/samples/{Name}.wav`

---

## Files

| File | Purpose |
|---|---|
| `app/api/ai/video-generate/route.ts` | API proxy — POST (start job) + GET (poll status) |
| `app/api/ai/video-callback/route.ts` | Webhook endpoint for UseAPI replyUrl callbacks |
| `app/api/ai/video-download/route.ts` | Download/inline proxy (Safari fix) |
| `lib/api/google-flow.ts` | Client-side `generateVideos()` + type definitions |
| `lib/credits.ts` | Shared `deductCredits()` + DB job cache helpers |
| `contexts/generation-queue.tsx` | `submitVideoJob()` in global queue |
| `app/dashboard/tools/ai-video-generator/page.tsx` | Video generator UI |

## Implementation Status

| Feature | Status |
|---|---|
| T2V (text to video) | ✅ |
| I2V (start frame) | ✅ |
| I2V-FL (start + end frame) | ✅ |
| R2V (reference images, up to 3) | ✅ |
| Voice narration (`referenceAudio_1`) | ✅ |
| `async: true` + polling | ✅ |
| `replyUrl` webhook callback | ✅ (production only) |
| `thumbnailUrl` extraction | ✅ |
| `omni-flash` model in UI | ❌ not yet |
| Veo aspect ratios 1:1, 4:3, 3:4 in UI | ❌ not yet |
| omni-flash R2V refs 4-7 | ❌ not yet |
| omni-flash V2V edit (`referenceVideo_1`) | ❌ not yet |
| Voice presets 2-5 (omni-flash only) | ❌ not yet |
| Per-model credit pricing | ❌ flat 5 credits for now |
