"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Pencil, Check, Loader2, Users, Wallet } from "lucide-react"

export function ReferralClient({ 
  initialCode, 
  earnings, 
  referrals 
}: { 
  initialCode: string
  earnings: number
  referrals: any[] 
}) {
  const [code, setCode] = useState(initialCode)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(initialCode)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setError("")
    const newCode = editValue.trim().toUpperCase()

    if (newCode === code) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch("/api/user/referral", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: newCode })
      })
      const data = await res.json()
      
      if (res.ok) {
        setCode(data.referralCode)
        setIsEditing(false)
      } else {
        setError(data.error || "Gagal menyimpan kode referral")
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan")
    } finally {
      setIsSaving(false)
    }
  }

  const formattedEarnings = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(earnings)

  return (
    <div className="space-y-6">
      
      {/* Cards Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Kode Referral */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="bg-white/5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              Kode Referral Anda
            </CardTitle>
            <CardDescription>Bagikan kode ini untuk mendapatkan komisi.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                      placeholder="JENNA-XXXX"
                      maxLength={20}
                      className="uppercase font-mono"
                    />
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      Batal
                    </Button>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <p className="text-xs text-muted-foreground">5-20 karakter, huruf dan angka saja.</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-2xl font-mono font-bold tracking-wider text-primary flex-1">
                    {code}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Tersalin!" : "Salin"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Penghasilan */}
        <Card className="glass-card overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Penghasilan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formattedEarnings}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Dari {referrals.filter(r => r.status === "success").length} transaksi sukses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Riwayat Referral */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Riwayat Referral
          </CardTitle>
          <CardDescription>
            Daftar pengguna yang mendaftar dan membeli dengan kode Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">Belum ada referral</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Bagikan kode Anda untuk mulai mendapatkan penghasilan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="font-medium">{ref.referredUser?.name || "Pengguna Baru"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ref.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">
                      +{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(ref.reward)}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">{ref.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
