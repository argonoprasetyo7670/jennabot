# Credits & Payment System — Technical Reference

Dokumentasi teknis sistem kredit dan pembayaran di Jenna Bot Pro.

---

## Arsitektur

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (Client)                                            │
│                                                              │
│  CreditsProvider (contexts/credits.tsx)                       │
│    ├── Fetches balance from /api/credits/balance              │
│    ├── Listens for 'credits-updated' CustomEvent              │
│    └── Provides { balance, refreshBalance } to children       │
│                                                              │
│  GenerationQueue (contexts/generation-queue.tsx)              │
│    ├── CREDIT_COST_IMAGE = 5                                 │
│    ├── CREDIT_COST_VIDEO = 20                                │
│    └── Deducts credits on successful job completion           │
│         → POST /api/credits { amount, feature }              │
│         → dispatch 'credits-updated'                         │
│                                                              │
│  Buy Credits Page (/dashboard/buy-credits)                   │
│    ├── Fetch packages → GET /api/credits/packages             │
│    ├── Purchase → POST /api/credits/purchase                  │
│    ├── Midtrans Snap popup                                   │
│    └── Transaction history → GET /api/credits/transactions    │
└──────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│ /api/credits/*  │  │ /api/credits/   │  │ /api/midtrans/       │
│ balance, deduct │  │ purchase        │  │ notification         │
│                 │  │ → Midtrans Snap │  │ → Webhook verify     │
│ Atomic DB ops   │  │                 │  │ → Credit top-up      │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

---

## File Utama

| File | Deskripsi |
|------|-----------|
| `contexts/credits.tsx` | CreditsProvider — global credit balance state |
| `contexts/generation-queue.tsx` | Credit cost constants + deduction logic |
| `app/dashboard/buy-credits/page.tsx` | Buy Credits UI page |
| `app/api/credits/balance/route.ts` | GET user credit balance |
| `app/api/credits/packages/route.ts` | GET credit packages (auto-seed) |
| `app/api/credits/purchase/route.ts` | POST create Midtrans transaction |
| `app/api/credits/transactions/route.ts` | GET transaction history |
| `app/api/midtrans/notification/route.ts` | POST webhook from Midtrans |

---

## Credit Costs

| Feature | Cost | Constant |
|---------|------|----------|
| Image Generation | 5 credits | `CREDIT_COST_IMAGE` |
| Video Generation | 20 credits | `CREDIT_COST_VIDEO` |
| Review Product | 25 credits | IMAGE + VIDEO combined |

### Deduction Flow

Credits are deducted **only on success** (never on failure):

```
Job submitted → uploading → generating → API response
  ├── Success → POST /api/credits { amount, feature }
  │             → DB: atomic balance update
  │             → dispatch 'credits-updated' event
  │             → CreditsProvider re-fetches balance
  └── Error → No deduction, user keeps credits
```

---

## CreditsProvider

```typescript
// contexts/credits.tsx
interface CreditsContext {
  balance: number        // Current credit balance
  loading: boolean       // Initial fetch loading
  refreshBalance: () => void  // Manual refresh
}
```

### Event-Based Refresh

```typescript
// After successful generation in generation-queue.tsx:
window.dispatchEvent(new CustomEvent("credits-updated"))

// In CreditsProvider:
useEffect(() => {
  const handler = () => refreshBalance()
  window.addEventListener("credits-updated", handler)
  return () => window.removeEventListener("credits-updated", handler)
}, [])
```

---

## Buy Credits — Midtrans Integration

### Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `MIDTRANS_PRODUCTION_SERVER_KEY` | Yes | Production server key |
| `MIDTRANS_PRODUCTION_CLIENT_KEY` | Yes | Production client key (Snap.js) |
| `MIDTRANS_IS_PRODUCTION` | Yes | `true` for production |

### Purchase Flow

```
1. User selects package → POST /api/credits/purchase
   → Creates transaction record (status: pending)
   → Returns Midtrans snap token

2. Client opens Midtrans Snap popup (snap.pay(token))
   → User completes payment

3. Midtrans sends webhook → POST /api/midtrans/notification
   → Verify SHA512 signature
   → Update transaction status
   → If success: atomic credit top-up
   → dispatch 'credits-updated'
```

### Default Credit Packages (Auto-seeded)

| Package | Credits | Price (IDR) | Bonus |
|---------|---------|-------------|-------|
| Starter | 100 | 25,000 | 0 |
| Basic | 500 | 100,000 | 50 |
| Pro | 1,200 | 200,000 | 200 |
| Business | 3,000 | 400,000 | 600 |
| Enterprise | 8,000 | 900,000 | 2,000 |

### Webhook Security

```typescript
// SHA512 verification
const signatureKey = crypto.createHash('sha512')
  .update(orderId + statusCode + grossAmount + serverKey)
  .digest('hex')

if (signatureKey !== notification.signature_key) {
  return 403 // Invalid signature
}
```

---

## Database Models

### user_credits
| Field | Type | Notes |
|-------|------|-------|
| userId | String | Unique, FK to users |
| balance | Int | Current credit balance |

### credit_transactions
| Field | Type | Notes |
|-------|------|-------|
| userId | String | FK to users |
| type | String | 'deduction' or 'topup' |
| amount | Int | Credits amount |
| balance | Int | Balance after transaction |
| feature | String | e.g. 'image-generation', 'review-product' |

### transactions (Midtrans)
| Field | Type | Notes |
|-------|------|-------|
| userId | String | FK to users |
| orderId | String | Unique Midtrans order ID |
| amount | Decimal | IDR amount |
| status | String | pending/success/failed |
| midtransToken | String | Snap token |

---

## Key Conventions

1. **Atomic operations**: Credit deduction uses Prisma `$transaction` to prevent race conditions
2. **Success-only deduction**: Never deduct on API errors
3. **Event-driven UI**: `credits-updated` event triggers real-time balance refresh
4. **No negative balance**: Server validates sufficient balance before deduction
5. **Midtrans Production**: Using production keys, NOT sandbox
