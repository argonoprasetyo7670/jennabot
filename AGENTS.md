<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Jenna Bot Pro (new-jenna)

AI SaaS platform with credit-based billing, AI tools (image/video generation).

---

## 1. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.2.2 | App Router only, **NO Pages Router** |
| React | React | 19.2.4 | Server Components by default |
| Auth | NextAuth | v5 beta.31 | `auth.ts` at root, JWT strategy |
| Database | PostgreSQL | — | Via Prisma 7 + `@prisma/adapter-pg` |
| Prisma | Prisma Client | 7.8.0 | Output: `src/generated/prisma` (non-standard!) |
| UI | shadcn/ui v4 | — | Radix UI + Lucide icons |
| Styling | Tailwind CSS | v4 | CSS-first config in `globals.css`, **NO tailwind.config file** |
| Package Manager | yarn | — | Use `yarn add`, not `npm install` |

---

## 2. Project Structure

> **Untuk detail lengkap, lihat folder `docs/` yang berisi dokumentasi per-fitur.**

```
new-jenna/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts: Noto Sans + Playfair Display)
│   ├── page.tsx                  # Landing page (22KB, full featured)
│   ├── globals.css               # Tailwind v4 CSS config + design tokens + custom classes
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth route handler
│   │   ├── ai/
│   │   │   ├── image-generate/   # POST → UseAPI Google Flow (image gen)
│   │   │   ├── image-upload/     # POST → UseAPI Google Flow (asset upload)
│   │   │   └── image-download/   # GET → Proxy download (Safari/iOS fix)
│   │   └── gallery/              # GET → User's gallery items from DB
│   └── dashboard/
│       ├── layout.tsx            # Wraps children in DashboardShell
│       ├── page.tsx              # Dashboard home (stats, charts, activity)
│       ├── product-studio/       # Product Studio (placeholder)
│       └── tools/
│           ├── ai-image-generator/  # ✅ FULLY BUILT — main AI image gen page
│           └── product-studio/      # Product Studio (placeholder)
│
├── auth.ts                       # NextAuth v5 config (root level, NOT in app/)
├── proxy.ts                      # Next.js 16 proxy convention (replaces middleware.ts)
├── prisma/
│   └── schema.prisma             # Database schema (20 models)
├── prisma.config.ts              # Prisma config
│
├── components/
│   ├── ui/                       # shadcn/ui components — DO NOT MODIFY
│   ├── landing/                  # Landing page sections
│   ├── dashboard/
│   │   └── dashboard-shell.tsx   # Provider shell (Session + Queue + Sidebar + Tooltip)
│   ├── app-sidebar.tsx           # Sidebar navigation definition (all nav items)
│   ├── nav-main.tsx              # Collapsible navigation renderer
│   ├── nav-user.tsx              # User dropdown in sidebar footer
│   ├── dashboard-header.tsx      # Dashboard page header with breadcrumbs
│   ├── header-actions.tsx        # Top-right actions (credits, theme, queue bell, gallery)
│   └── dynamic-sidebar.tsx       # Dynamic import wrapper for AppSidebar
│
├── contexts/
│   └── generation-queue.tsx      # Global AI generation queue (window-level store)
│
├── hooks/
│   ├── use-image-generate.ts     # Per-component image generation hook
│   └── use-mobile.ts             # Mobile detection hook
│
├── lib/
│   ├── prisma.ts                 # Prisma client singleton with PrismaPg adapter
│   ├── auth-adapter.ts           # Custom Prisma adapter for NextAuth (currently unused)
│   ├── utils.ts                  # cn() utility for class merging
│   └── api/
│       └── google-flow.ts        # Client-side API wrapper for image gen/upload
│
├── src/generated/prisma/         # Generated Prisma client (non-standard path)
├── docs/                         # ⚡ Technical documentation
│   ├── sidebar.md                # Sidebar navigation & feature spec
│   ├── image-pipeline.md         # Image generation pipeline
│   ├── generate-video.md         # Video generation pipeline
│   ├── review-product.md         # Review Product 2-step pipeline
│   ├── credits-system.md         # Credits & Midtrans payment
│   └── gallery-system.md         # Gallery save system
└── public/
    └── jennabot/logo.png         # App logo
```

### 2.1 External Services

| Service | Kegunaan |
|---------|----------|
| **UseAPI** | Core API gateway → Google Flow (Imagen 4, Nano Banana) |
| **OpenAI** | Chat AI, DALL-E image generation |
| **Google Gemini** | Chat AI alternatif |
| **ElevenLabs** | Text-to-Speech |
| **Cloudinary** | Media storage (multi-account round-robin) |
| **Midtrans** | Payment gateway (production mode) |

### 2.2 API Routes (Planned)

| Route | Fungsi |
|-------|--------|
| `/api/auth` | NextAuth endpoints |
| `/api/ai/image-generate` | ✅ Image generation proxy |
| `/api/ai/image-upload` | ✅ Reference image upload proxy |
| `/api/ai/image-download` | ✅ Image download proxy (Safari fix) |
| `/api/gallery` | ✅ User gallery items (GET) |
| `/api/gallery/save` | ✅ Save to gallery (POST) |
| `/api/ai/video-generate` | ✅ Video generation proxy (with captcha retry) |
| `/api/ai/video-download` | ✅ Video download proxy |
| `/api/credits/balance` | ✅ User credit balance |
| `/api/credits/packages` | ✅ Credit packages (auto-seed) |
| `/api/credits/purchase` | ✅ Create Midtrans transaction |
| `/api/credits/transactions` | ✅ Transaction history |
| `/api/midtrans/notification` | ✅ Midtrans webhook (SHA512 verify) |
| `/api/v1` | Public REST API (for API key users) |
| `/api/keys` | API key management |
| `/api/openai` | OpenAI proxy |
| `/api/upscale-image` | Upscale resolusi gambar |
| `/api/health` | Health check |
| `/api/version` | App version info |

---

## 3. Architecture Patterns

### 3.1 Provider Hierarchy (Dashboard)

All dashboard pages are wrapped by `DashboardShell` which provides this exact nesting order:

```
SessionProvider (next-auth)
  └── GenerationQueueProvider (custom context)
       └── TooltipProvider (radix)
            └── SidebarProvider (shadcn)
                 ├── DynamicSidebar (AppSidebar)
                 └── SidebarInset
                      └── {children} (page content)
```

### 3.2 Routing & Auth Guard (`proxy.ts`)

Next.js 16 uses `proxy.ts` (NOT `middleware.ts`) for request interception:
- **Logged-in user on `/`** → redirect to `/dashboard`
- **Unauthenticated user on `/dashboard/*`** → redirect to `/`
- Checks cookie names: `authjs.session-token` OR `__Secure-authjs.session-token`

### 3.3 Theme System

- **Default: dark mode** (no class = dark)
- Toggle via `localStorage.setItem("theme", "light"|"dark")`
- `DashboardShell` reads localStorage on mount and applies class to `<html>`
- `HeaderActions` component handles toggle UI
- `globals.css` uses `html.dark, html:not(.light)` selector for dark and `html.light` for light

### 3.4 Dashboard Page Pattern

Every dashboard page follows this template:

```tsx
"use client"

import { DashboardHeader } from "@/components/dashboard-header"

export default function MyPage() {
  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Category", href: "/dashboard" },
        { label: "Page Name" },
      ]} />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Page content */}
      </div>
    </div>
  )
}
```

---

## 4. AI Image Generation Pipeline

This is the core feature. Understanding this flow is critical.

### 4.1 Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│  Client (Browser)                                          │
│                                                            │
│  Page (ai-image-generator)                                 │
│    ├── useGenerationQueue() ← context from DashboardShell  │
│    └── submitJob(params, refs) → fire-and-forget           │
│                                                            │
│  GenerationQueue (window-level global store)               │
│    ├── useSyncExternalStore for React binding               │
│    ├── Jobs survive navigation (window.__jenna_gen_queue__) │
│    └── Async pipeline:                                     │
│         1. Upload references → /api/ai/image-upload        │
│         2. Generate images  → /api/ai/image-generate       │
│         3. Update job status in store                      │
│                                                            │
│  HeaderActions (bell icon)                                  │
│    └── Shows queue popup with job statuses                  │
└────────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────────┐
│ /api/ai/        │  │ /api/ai/            │
│ image-upload    │  │ image-generate      │
│ (POST)          │  │ (POST)              │
│                 │  │                     │
│ Proxy to UseAPI │  │ Proxy to UseAPI     │
│ Google Flow     │  │ Google Flow         │
│ /assets         │  │ /images             │
└─────────────────┘  └─────────────────────┘
         │                    │
         ▼                    ▼
    UseAPI.net (3rd party API gateway)
         │
         ▼
    Google Flow (Imagen 4 / Nano Banana models)
```

### 4.2 Key Concepts

**GenerationQueue (`contexts/generation-queue.tsx`):**
- Uses `window.__jenna_gen_queue__` as global store (survives HMR + navigation)
- React binding via `useSyncExternalStore` with proper server snapshot (`EMPTY_JOBS`)
- Jobs are fire-and-forget — run independently of React lifecycle
- Job statuses: `uploading` → `generating` → `done` | `error`

**Email Pinning:**
- When using reference images, first upload returns an `email` (Google account)
- All subsequent uploads + generation MUST use the same `email`
- This prevents cross-account reference mismatch in Google Flow

**Available Models:**
| Model ID | Name | Max References |
|----------|------|----------------|
| `imagen-4` | Imagen 4 | 3 |
| `nano-banana-2` | Nano Banana 2 | 10 |
| `nano-banana-pro` | Nano Banana Pro | 10 |

**Image Download Proxy (`/api/ai/image-download`):**
- Safari/iOS doesn't support `<a download>` for cross-origin URLs
- Server-side fetch → returns blob with `Content-Disposition: attachment`

### 4.3 Two Ways to Generate

1. **GenerationQueue (recommended for new pages):**
   - Import `useGenerationQueue()` from context
   - Call `submitJob(params, refs)` — returns job ID
   - Jobs visible globally in bell icon notification
   - Background processing, survives page navigation

2. **useImageGenerate hook (standalone):**
   - Import from `@/hooks/use-image-generate`
   - Self-contained state (isGenerating, generatedImages, referenceImages)
   - Does NOT integrate with global queue
   - Good for isolated components that don't need global visibility

### 4.4 API Client (`lib/api/google-flow.ts`)

Three exported functions:
- `uploadImageAsset(file, email?)` → Upload binary file
- `uploadImageFromUrl(url, email?)` → Upload from URL (gallery re-upload)
- `generateImages(params)` → Generate images from prompt

All communicate with `/api/ai/*` routes which proxy to UseAPI.net.

---

## 5. Authentication

### 5.1 NextAuth v5 Configuration (`auth.ts`)

- **Strategy:** JWT (no database sessions)
- **Providers:** Google OAuth + Credentials (email/password with bcrypt)
- **No adapter** — user creation handled manually in `signIn` callback
- **Sign-in page:** `/login`

### 5.2 Auth Flow

```
Google OAuth Sign-In:
  1. User clicks Google sign-in
  2. signIn callback:
     a. Find user by email in DB
     b. If not found → create user + account
     c. If found → check/create account link
     d. Set user.id = dbUser.id
  3. jwt callback: token.sub = user.id
  4. session callback: session.user.id = token.sub

Credentials Sign-In:
  1. authorize(): Find user by email, bcrypt.compare password
  2. Return user object → same jwt/session callbacks
```

### 5.3 Cookie Names

- Development: `authjs.session-token`
- Production (HTTPS): `__Secure-authjs.session-token`
- Both checked in `proxy.ts`

### 5.4 Auth Adapter (`lib/auth-adapter.ts`)

A `CustomPrismaAdapter` exists but is **NOT currently used** — `auth.ts` has no adapter configured and handles user creation manually. The adapter is available if needed for future migration.

---

## 6. Database Schema (Prisma)

### 6.1 Configuration

- **Schema:** `prisma/schema.prisma`
- **Output:** `src/generated/prisma` (non-standard!)
- **Adapter:** `@prisma/adapter-pg` (NOT Neon serverless)
- **Connection:** `process.env.DATABASE_URL`
- **Singleton:** `lib/prisma.ts` with `globalThis` caching in dev

### 6.2 Models Overview (20 models, all lowercase plural)

**Core User Models:**
| Model | Key Fields | Notes |
|-------|-----------|-------|
| `users` | id, email, name, role, password, referralCode, isReseller, resellerId | Central user model |
| `accounts` | userId, provider, providerAccountId | OAuth account links |
| `sessions` | sessionToken, userId, deviceId | DB sessions (unused with JWT) |
| `verification_tokens` | identifier, token, expires | Email verification |

**Credits & Billing:**
| Model | Key Fields | Notes |
|-------|-----------|-------|
| `user_credits` | userId (unique), balance | Current credit balance |
| `credit_transactions` | userId, type, amount, balance, feature | Credit history log |
| `credit_costs` | feature (unique), creditCost | Per-feature pricing |
| `credit_packages` | name, credits, price, bonusCredits | Purchasable packages |
| `subscription_plans` | name, price, duration, features | Available plans |
| `subscriptions` | userId (unique), plan, status, startDate, endDate | User's active subscription |
| `transactions` | userId, orderId, amount, status, midtransToken | Payment records |

**AI & Gallery:**
| Model | Key Fields | Notes |
|-------|-----------|-------|
| `gallery_items` | userId, gcsPath, gcsUrl, prompt, model, aspectRatio | Generated images/videos |
| `upscale_items` | userId, sourceGalleryItemId, resolution, gcsPath | Upscaled images |
| `user_assets` | userId, mediaGenerationId, type | User-uploaded reference assets |

**Reseller System:**
| Model | Key Fields | Notes |
|-------|-----------|-------|
| `resellers` | userId, brandName, slug, creditBalance, marginPercent | Reseller profiles |
| `reseller_credit_packages` | resellerId, name, credits, price | Custom packages per reseller |
| `reseller_transactions` | resellerId, type, credits, amount | Reseller credit log |
| `reseller_withdrawals` | resellerId, amount, status, bankName | Withdrawal requests |

**Other:**
| Model | Key Fields | Notes |
|-------|-----------|-------|
| `api_keys` | userId, key, permissions, rateLimit | External API access |
| `api_usage` | apiKeyId, endpoint, statusCode, creditsUsed | API usage tracking |
| `usage_stats` | userId, feature, requestCount, date | Aggregated usage stats |
| `referrals` | referrerId, referredId, status, reward | Referral program |
| `settings` | key (unique), value | App-wide settings KV |

---

## 7. Component Patterns

### 7.1 Sidebar Navigation

Navigation is defined in `components/app-sidebar.tsx` as a `NavItem[]` array with three types:
- `type: "link"` — Single navigation link
- `type: "collapsible"` — Expandable group with sub-items
- `type: "external"` — Opens in new tab

Collapsible sections persist open/close state in `localStorage` key `sidebar-open-sections`. Active section auto-opens on navigation.

Admin-only items have `adminOnly: true` flag (filtering not yet implemented).

### 7.2 shadcn/ui Components

Located in `components/ui/`. **DO NOT MODIFY** unless explicitly asked.

Key components used: `Button`, `Card`, `Badge`, `Avatar`, `Sidebar*`, `Collapsible`, `Tooltip`.

### 7.3 DashboardHeader

Reusable header with breadcrumbs and actions:
```tsx
<DashboardHeader breadcrumbs={[
  { label: "Jenna Bot Pro", href: "/dashboard" },
  { label: "Page Name" },  // last item = no href = current page
]} />
```

Includes `HeaderActions` with: Credits button, Refresh, Bell (generation queue), Gallery link, Theme toggle.

---

## 8. Styling & Theming

### 8.1 Tailwind v4 (CSS-First)

- **NO `tailwind.config.*` file** — all config in `app/globals.css`
- Uses `@theme inline {}` block for design tokens
- Uses `@custom-variant dark (&:is(.dark *))` for dark mode
- Imports: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`

### 8.2 Design Token System

Two layers of CSS variables:

**Layer 1 — shadcn/ui tokens** (`:root` and `.dark`):
- `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, etc.
- Uses `oklch()` color space

**Layer 2 — Custom landing page tokens** (`html.dark` and `html.light`):
- `--bg`, `--fg`, `--surface`, `--text-1` through `--text-4`
- `--orb-v`, `--glow-v-hero` (decorative effects)
- `--tag-bg`, `--tag-text` (pill badges)
- `--shadow-card`, `--shadow-hero` (elevation)

### 8.3 Custom CSS Classes

| Class | Purpose |
|-------|---------|
| `.gradient-text` | Violet→Blue→Cyan text gradient |
| `.gradient-text-warm` | Orange→Rose→Violet text gradient |
| `.glass-card` | Glassmorphism card with blur + border |
| `.btn-glow` | Gradient button with glow shadow |
| `.border-gradient` | Pseudo-element gradient border |
| `.hero-glow` | Background radial glow effect |
| `.orb`, `.orb-violet/blue/cyan` | Floating blur orbs |
| `.grid-pattern` | CSS grid background pattern |
| `.animate-fade-up` | Fade + slide up animation |
| `.shimmer` | Loading shimmer effect |
| `.hero-card-float` | Floating animation |
| `.stat-glow` | Hover glow on stat cards |
| `.section-divider` | Gradient horizontal line |
| `.pricing-popular` | VIP pricing card style |
| `.tag-pill` | Colored tag badge |
| `.live-dot` | Pulsing green dot |

### 8.4 Light Mode Overrides

`globals.css` has extensive `html.light` overrides that remap `text-white/*` utilities to `var(--fg-rgb)` equivalents. This is because the landing page was built dark-first with hardcoded `text-white/70` etc.

---

## 9. Key Conventions

### 9.1 Imports

```typescript
// Path alias: @/* maps to project root (./)
import { prisma } from "@/lib/prisma"
import { auth, signIn, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGenerationQueue } from "@/contexts/generation-queue"
import { generateImages } from "@/lib/api/google-flow"
```

### 9.2 Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret |
| `NEXTAUTH_URL` | Yes | Must match deployment URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth |
| `USEAPI_TOKEN` | Yes | UseAPI.net API key for image generation |

### 9.3 UI Language

The app UI is primarily in **Bahasa Indonesia** (Indonesian):
- "Apa yang ingin Anda buat?" (prompt placeholder)
- "Mengupload referensi..." (upload progress)
- "Membuat gambar..." (generation progress)
- "Antrean Generate" (generation queue)
- "baru saja", "5d lalu" (time ago)
- "Bersihkan" (clear)

When adding new UI text, use Indonesian to maintain consistency.

---

## 10. Common Gotchas

1. **Prisma output path** is `src/generated/prisma`, not default. After schema changes: `npx prisma generate`
2. **Next.js 16 uses `proxy.ts`** instead of `middleware.ts` for request interception
3. **Tailwind v4** has no JS config — all customization via `@theme` in `globals.css`
4. **NextAuth v5** uses `auth.ts` at root (not `[...nextauth]/route.ts` setup from v4)
5. **React 19** — Server Components by default, use `"use client"` only when needed
6. **Generation queue is window-global** — accessing `window.__jenna_gen_queue__` directly will bypass React
7. **Two theme systems coexist** — shadcn oklch tokens (`:root`/`.dark`) AND custom landing page tokens (`html.dark`/`html.light`). Both must be maintained.
8. **Light mode uses CSS overrides** with `!important` to remap `text-white/*` classes. Adding new landing page sections requires testing in both themes.
9. **Image download uses a server proxy** — never use direct `<a download>` for cross-origin images (Safari breaks)
10. **Reference image email pinning** — all references must be uploaded to same Google account. The first upload determines the email; subsequent uploads must pass it.

---

## 11. Page Status

> **Lihat `docs/sidebar.md` untuk deskripsi lengkap setiap halaman dan fiturnya.**

**✅ Fully built:**
- `/` — Landing page
- `/dashboard` — Dashboard home with stats & charts
- `/dashboard/tools/ai-image-generator` — Full AI image generation with queue
- `/dashboard/tools/ai-video-generator` — Full AI video generation (Veo 3.1)
- `/dashboard/review-product` — Review Product (2-step: image → video)
- `/dashboard/buy-credits` — Buy credits with Midtrans payment
- `/dashboard/product-studio` — Product Studio
- `/dashboard/model-studio` — Model Studio
- `/dashboard/thumbnail` — Thumbnail Generator

**❌ Not yet created (sidebar nav exists, no page):**
- Image Tools: `tools/prompt-generator`
- Video Tools: `storyboard`, `scene-builder`, `video-template`, `tiktok-hook-gen`, `extend-video`, `concatenate-video`, `motion-control`, `kling-v3-omni`, `seedance-pro`
- Other: `chat`, `gallery` (API exists), `api-keys`, `api-docs`, `admin`
- Public: `/about`, `/blog`, `/contact`, `/tutorial`, `/privacy-policy`, `/terms`, `/payment`
