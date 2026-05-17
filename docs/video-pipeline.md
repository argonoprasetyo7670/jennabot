# Video Pipeline & Deployment — Session Notes (17 Mei 2026)

## Ringkasan Perubahan

### 1. Auth Production Fix
- **File:** `auth.ts`
- **Perubahan:** Tambah `trustHost: true` untuk fix `UntrustedHost` error di production
- **Env wajib:** `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL=https://jennabot.pro`

### 2. Captcha Broker Proxy
- **File:** `app/captcha/[...path]/route.ts` (BARU)
- **Fungsi:** Proxy `/captcha/*` → `localhost:4000` (captcha broker)
- **Env:** `CAPTCHA_SERVERS=http://localhost:4000`
- **Alasan:** Agar captcha broker bisa diakses dari domain utama tanpa konfigurasi Nginx tambahan

### 3. Video Generation — Non-Blocking Polling
- **File:** `app/api/ai/video-generate/route.ts`
- **Masalah:** Safari/iOS timeout setelah ~60 detik, tapi video butuh 60-180 detik
- **Solusi:** Ubah dari blocking ke polling pattern

```
POST /api/ai/video-generate
  Body: { ...params, async: true }    ← new client
  Body: { ...params }                 ← old client (backward compatible)

  async=true  → return { jobId, status: "processing" } langsung
  async=false → block & wait (old behavior)

GET /api/ai/video-generate?jobId=xxx
  → { status: "processing" }
  → { status: "done", media: [...] }
  → { status: "error", error: "..." }
```

- **In-memory job store:** `videoJobs` Map, auto-cleanup 30 menit
- **Backward compatible:** Old client tanpa `async` flag tetap pakai sync mode

### 4. Server-Side Credit Deduction (Video)
- **File:** `app/api/ai/video-generate/route.ts`
- **Sebelumnya:** Credits di-deduct di client (browser) setelah terima hasil
- **Sekarang:** Credits di-deduct di **server** saat video berhasil di-generate
- **Keuntungan:**
  - User tutup browser → credits tetap ter-deduct
  - Cek saldo sebelum mulai (402 kalau kurang)
  - Tidak deduct kalau gagal
- **Fungsi:** `deductCredits(userId, videoCount, feature)`

### 5. Video Download Proxy — Safari Range Support
- **File:** `app/api/ai/video-download/route.ts`
- **Masalah:** Safari menolak play video tanpa Range request support
- **Solusi:** Support `206 Partial Content` + byte-range serving
- **Bonus:** In-memory video cache (max 10, TTL 15 menit) untuk avoid re-fetch
- **Mode:** `?mode=inline` (default, playback) atau `?mode=attachment` (download)

### 6. Review Product — Queue Integration
- **File:** `app/dashboard/review-product/page.tsx`
- **Sebelumnya:** Semua proses inline, tidak muncul di bell notification
- **Sekarang:**
  - Job ditambahkan ke GenerationQueue saat mulai generate
  - Progress update di setiap phase (composing → uploading → generating image → generating video)
  - Hasil muncul di bell notification
  - Video di-proxy lewat `/api/ai/video-download` untuk avoid CORS
  - Image credits deducted client-side, video credits deducted server-side

### 7. Generation Queue Persistence
- **File:** `contexts/generation-queue.tsx`
- **Sebelumnya:** Jobs hilang saat refresh browser
- **Sekarang:**
  - Jobs di-persist ke `localStorage` (key: `jenna_gen_queue_jobs`)
  - Di-restore saat page load
  - Video jobs yang masih processing (id `vj-*`) auto-resume polling
  - Non-resumable jobs (image/custom) ditandai "Terhenti karena halaman di-refresh"
- **API baru:** `addCustomJob(job)` dan `updateJob(id, updates)` untuk custom pipelines

---

## Arsitektur Credit Deduction

```
Image Generation:
  → Credits deducted CLIENT-SIDE via POST /api/credits
  → Dilakukan setelah client terima hasil

Video Generation:
  → Credits deducted SERVER-SIDE di runVideoGeneration()
  → Dilakukan saat UseAPI return success
  → User tutup browser pun credits tetap ter-deduct
  → CREDIT_COST_VIDEO = 10 per video (hardcoded di route.ts)

Review Product:
  → Image: CLIENT-SIDE deduction (CREDIT_COST_IMAGE = 5)
  → Video: SERVER-SIDE deduction (CREDIT_COST_VIDEO = 10)
```

---

## Nginx Config (WAJIB di Production)

```nginx
# Increase timeout untuk AI generation routes
location /api/ai/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
}
```

Reload: `sudo nginx -t && sudo systemctl reload nginx`

---

## Deploy Checklist

```bash
# 1. Start captcha broker
pm2 start captcha-broker/server.js --name captcha-broker

# 2. Build & restart
yarn build
pm2 restart jenna-bot

# 3. Save PM2 config
pm2 save
```

---

## TODO / Known Issues

### Belum Dikerjakan
1. **DB persistence untuk queue** — Saat ini pakai localStorage + server in-memory Map. Bisa upgrade ke DB (buat tabel `generation_jobs`) untuk persistence yang lebih robust
2. **Image generation juga bisa pakai polling** — Saat ini hanya video yang pakai async polling
3. **Image credit deduction ke server-side** — Saat ini image masih client-side, belum se-robust video

### Perlu Ditest
1. **Safari iPhone video playback** — Setelah deploy, test apakah Range request proxy fix video playback di Safari
2. **Review Product end-to-end** — Test full flow: compose → upload → generate image → generate video → play video
3. **Queue persistence** — Test: generate video → refresh browser → cek bell notification masih ada → polling lanjut
4. **Backward compatibility** — Old client (tanpa async flag) masih bisa generate video via sync mode
5. **Credit deduction accuracy** — Pastikan tidak ada double deduction (server + client)

### Risiko
- **Server restart saat video processing:** Job di in-memory Map hilang. Client akan dapat "Job not found". User harus generate ulang. Credits TIDAK ter-deduct (karena server belum sempat deduct)
- **PM2 cluster mode:** Kalau pakai `instances: 2+`, job Map terpisah per worker. Polling bisa masuk worker yang salah. **Solusi:** Tetap `instances: 1` atau migrate ke Redis/DB
