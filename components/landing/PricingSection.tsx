"use client"

import { useEffect, useState } from "react"
import { CheckIcon } from "./Icons"

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  bonusCredits: number
  discountPercent: number
  description: string
  isPopular: boolean
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
}

export default function PricingSection() {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/credits/packages/public")
      .then((r) => r.json())
      .then((d) => setPackages(d.packages || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card animate-pulse rounded-3xl p-8 h-72" />
        ))}
      </div>
    )
  }

  if (packages.length === 0) return null

  return (
    <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className={`relative rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1 ${
            pkg.isPopular
              ? "pricing-popular backdrop-blur"
              : "glass-card"
          }`}
        >
          {pkg.isPopular && (
            <span className="absolute -top-3 right-6 rounded-full bg-violet-500/90 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-violet-500/30">
              Populer
            </span>
          )}

          <p className={`text-xs font-semibold uppercase tracking-wider ${pkg.isPopular ? "text-violet-400" : "text-white/40"}`}>
            {pkg.name}
          </p>

          <h3 className="font-display mt-3 text-3xl font-bold">
            {formatRupiah(pkg.price)}
          </h3>

          <p className="mt-2 text-sm leading-6 text-white/45">{pkg.description}</p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-sm text-white/60">
                {pkg.credits.toLocaleString("id-ID")} poin kredit
              </p>
            </div>
            {pkg.bonusCredits > 0 && (
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-white/60">
                  +{pkg.bonusCredits.toLocaleString("id-ID")} bonus poin
                </p>
              </div>
            )}
            {pkg.discountPercent > 0 && (
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-white/60">
                  Hemat {pkg.discountPercent}%
                </p>
              </div>
            )}
            <div className="flex items-start gap-3">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-sm text-white/60">Semua AI tools</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-sm text-white/60">Gallery & download</p>
            </div>
          </div>

          <a
            href="#auth-section"
            className={`mt-8 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-white transition ${
              pkg.isPopular
                ? "btn-glow"
                : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
            }`}
          >
            {pkg.isPopular ? "Pilih paket ini" : "Beli sekarang"}
          </a>
        </div>
      ))}
    </div>
  )
}
