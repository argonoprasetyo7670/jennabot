"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2Icon, ChevronLeftIcon, ChevronRightIcon,
  ArrowUpIcon, ArrowDownIcon, CoinsIcon,
  CreditCardIcon, ClockIcon, FilterIcon,
} from "lucide-react"

interface CreditTx {
  id: string
  userName: string
  userEmail: string
  type: string
  amount: number
  balance: number
  description: string
  feature: string | null
  createdAt: string
}

interface PaymentTx {
  id: string
  orderId: string
  userName: string
  userEmail: string
  plan: string
  amount: number
  status: string
  paymentType: string | null
  createdAt: string
}

export function AdminHistoryTab() {
  const [historyType, setHistoryType] = useState<"credit" | "payment">("credit")
  const [creditTxs, setCreditTxs] = useState<CreditTx[]>([])
  const [paymentTxs, setPaymentTxs] = useState<PaymentTx[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: historyType,
        page: String(page),
        limit: "20",
      })
      const res = await fetch(`/api/admin/history?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (historyType === "credit") {
          setCreditTxs(data.transactions)
        } else {
          setPaymentTxs(data.transactions)
        }
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [historyType, page])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const switchType = (t: "credit" | "payment") => {
    setHistoryType(t)
    setPage(1)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(p)

  const statusColor = (s: string) => {
    if (s === "settlement" || s === "capture") return "text-green-400 bg-green-500/10 border-green-500/20"
    if (s === "pending") return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    if (s === "deny" || s === "cancel" || s === "expire") return "text-red-400 bg-red-500/10 border-red-500/20"
    return "text-muted-foreground"
  }

  const typeLabel = (t: string) => {
    const map: Record<string, { label: string; color: string }> = {
      deduct: { label: "Pemakaian", color: "text-red-400" },
      admin_deduct: { label: "Admin Kurangi", color: "text-red-400" },
      admin_add: { label: "Admin Tambah", color: "text-green-400" },
      topup: { label: "Top Up", color: "text-green-400" },
      purchase: { label: "Pembelian", color: "text-green-400" },
      referral: { label: "Referral", color: "text-blue-400" },
    }
    return map[t] || { label: t, color: "text-muted-foreground" }
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1">
          <button
            onClick={() => switchType("credit")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              historyType === "credit" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CoinsIcon className="h-3.5 w-3.5" /> History Credit
          </button>
          <button
            onClick={() => switchType("payment")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              historyType === "payment" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCardIcon className="h-3.5 w-3.5" /> History Transaksi
          </button>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <FilterIcon className="h-3 w-3" /> {total.toLocaleString()} record
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {historyType === "credit" ? "Riwayat Penggunaan Credit" : "Riwayat Transaksi Pembayaran"}
          </CardTitle>
          <CardDescription>
            {historyType === "credit"
              ? "Semua aktivitas credit: pemakaian, top-up, dan penyesuaian admin"
              : "Semua transaksi pembayaran melalui Midtrans"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historyType === "credit" ? (
            /* Credit transactions table */
            creditTxs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Belum ada riwayat credit</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Tipe</th>
                      <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                      <th className="px-4 py-3 font-medium text-right">Saldo</th>
                      <th className="px-4 py-3 font-medium">Keterangan</th>
                      <th className="px-6 py-3 font-medium">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {creditTxs.map((tx) => {
                      const tl = typeLabel(tx.type)
                      return (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-3">
                            <div>
                              <p className="font-medium text-xs">{tx.userName}</p>
                              <p className="text-[11px] text-muted-foreground">{tx.userEmail}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${tl.color}`}>{tl.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {tx.amount > 0 ? (
                                <ArrowUpIcon className="h-3 w-3 text-green-400" />
                              ) : (
                                <ArrowDownIcon className="h-3 w-3 text-red-400" />
                              )}
                              <span className={`font-semibold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                                {tx.amount > 0 ? "+" : ""}{tx.amount}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{tx.balance}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{tx.description}</td>
                          <td className="px-6 py-3">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <ClockIcon className="h-2.5 w-2.5" /> {formatDate(tx.createdAt)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Payment transactions table */
            paymentTxs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Belum ada transaksi pembayaran</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Order ID</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Paket</th>
                      <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Metode</th>
                      <th className="px-6 py-3 font-medium">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paymentTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <span className="font-mono text-xs">{tx.orderId.slice(0, 20)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-xs">{tx.userName}</p>
                            <p className="text-[11px] text-muted-foreground">{tx.userEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">{tx.plan}</td>
                        <td className="px-4 py-3 text-right font-semibold text-xs">{formatPrice(tx.amount)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] ${statusColor(tx.status)}`}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{tx.paymentType || "—"}</td>
                        <td className="px-6 py-3">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <ClockIcon className="h-2.5 w-2.5" /> {formatDate(tx.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</p>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
