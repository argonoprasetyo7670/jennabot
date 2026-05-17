# Gallery System — Technical Reference

Dokumentasi teknis sistem Gallery di Jenna Bot Pro.

---

## API Routes

### GET /api/gallery
Fetch user's gallery items (images only, max 50).

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "gcsUrl": "https://...",
      "mediaGenerationId": "...",
      "prompt": "...",
      "model": "nano-banana-2",
      "aspectRatio": "3:4",
      "width": null,
      "height": null,
      "createdAt": "2026-05-17T..."
    }
  ]
}
```

### POST /api/gallery/save
Save an image or video to user's gallery.

**Request Body:**
```json
{
  "url": "https://...",       // Required
  "type": "image|video",     // Default: "image"
  "prompt": "...",            // Optional
  "model": "nano-banana-2",  // Optional
  "aspectRatio": "3:4",      // Optional
  "mediaGenerationId": "..." // Optional
}
```

**Response:**
```json
{
  "item": { /* gallery_items record */ },
  "alreadySaved": false  // true if duplicate URL detected
}
```

**Features:**
- Duplicate detection by URL (prevents double-save)
- Sets `sourceAction` for origin tracking (e.g. "review-product")
- Auto-generates `gcsPath` as `gallery/{userId}/{uuid}`
- 1-year expiry by default

---

## Database Model: gallery_items

| Field | Type | Notes |
|-------|------|-------|
| id | String | UUID primary key |
| userId | String | FK to users |
| type | String | "image" or "video" |
| gcsPath | String | Storage path |
| gcsUrl | String | Public URL |
| prompt | String? | Generation prompt |
| model | String? | AI model used |
| aspectRatio | String? | e.g. "3:4", "9:16" |
| mediaGenerationId | String? | Google Flow asset ID |
| sourceAction | String? | Origin tracking |
| width | Int? | Image width |
| height | Int? | Image height |
| expiresAt | DateTime? | Expiry date |
| createdAt | DateTime | Auto-generated |
| updatedAt | DateTime | Auto-updated |

---

## Client Usage

### Save to Gallery (Review Product)
```typescript
await fetch("/api/gallery/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: generatedImage.url,
    type: "image",
    prompt: customPrompt,
    model: "nano-banana-2",
    aspectRatio: "3:4",
    mediaGenerationId: generatedImage.mediaGenerationId,
  }),
})
```

### UI States
| State | Display |
|-------|---------|
| Default | 🔖 Simpan |
| Loading | ⏳ Menyimpan... (spinner) |
| Saved | ✅ Tersimpan (green, disabled) |

---

## File Map

| File | Deskripsi |
|------|-----------|
| `app/api/gallery/route.ts` | GET — fetch gallery items |
| `app/api/gallery/save/route.ts` | POST — save to gallery |
| `components/header-actions.tsx` | Gallery quick access dialog |
