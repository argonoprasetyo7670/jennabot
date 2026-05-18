"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  SearchIcon, Loader2Icon, CoinsIcon, PlusCircleIcon, MinusCircleIcon,
} from "lucide-react"

interface UserResult {
  id: string
  name: string | null
  email: string
  creditBalance: number
}

export function AdminCreditsTab() {
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [actionType, setActionType] = useState<"add" | "deduct">("add")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const searchUsers = useCallback(async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [search])

  const handleSubmit = async () => {
    if (!selectedUser || !amount) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: Number(amount),
          type: actionType,
          description: description || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setToast({ msg: `Berhasil! Saldo: ${data.previousBalance} → ${data.balance}`, type: "success" })
        setSelectedUser({ ...selectedUser, creditBalance: data.balance })
        setAmount("")
        setDescription("")
        // Refresh the user in the list
        setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, creditBalance: data.balance } : u))
      } else {
        const err = await res.json()
        setToast({ msg: err.error || "Gagal memproses", type: "error" })
      }
    } catch {
      setToast({ msg: "Terjadi kesalahan", type: "error" })
    } finally { setSubmitting(false) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Left: Search */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cari User</CardTitle>
            <CardDescription>Cari user berdasarkan nama atau email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama atau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  className="pl-9"
                />
              </div>
              <Button size="sm" onClick={searchUsers} variant="outline">Cari</Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 ${
                      selectedUser?.id === u.id ? "bg-violet-500/10 ring-1 ring-violet-500/30" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                        {(u.name || u.email).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="gap-1 text-[10px] shrink-0">
                      <CoinsIcon className="h-2.5 w-2.5 text-amber-500" />
                      {u.creditBalance.toLocaleString()}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : search && !loading ? (
              <p className="text-xs text-muted-foreground text-center py-6">Tidak ada user ditemukan</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Right: Credit adjustment form */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kelola Credit</CardTitle>
            <CardDescription>Tambah atau kurangi credit user secara manual</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                  <CoinsIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Pilih user dari daftar di samping<br />untuk mengelola credit</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Selected user info */}
                <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                      {(selectedUser.name || selectedUser.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{selectedUser.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo saat ini</p>
                    <p className="text-xl font-bold text-amber-500">{selectedUser.creditBalance.toLocaleString()}</p>
                  </div>
                </div>

                {/* Action type toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={actionType === "add" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setActionType("add")}
                  >
                    <PlusCircleIcon className="h-4 w-4" /> Tambah Credit
                  </Button>
                  <Button
                    variant={actionType === "deduct" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setActionType("deduct")}
                  >
                    <MinusCircleIcon className="h-4 w-4" /> Kurangi Credit
                  </Button>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Jumlah Credit</label>
                  <Input
                    type="number"
                    placeholder="Masukkan jumlah..."
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={1}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Keterangan (opsional)</label>
                  <Input
                    placeholder="Alasan penambahan/pengurangan..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <Button
                  className="w-full gap-2"
                  onClick={handleSubmit}
                  disabled={submitting || !amount || Number(amount) <= 0}
                >
                  {submitting ? (
                    <><Loader2Icon className="h-4 w-4 animate-spin" /> Memproses...</>
                  ) : (
                    <>{actionType === "add" ? <PlusCircleIcon className="h-4 w-4" /> : <MinusCircleIcon className="h-4 w-4" />}
                      {actionType === "add" ? "Tambah" : "Kurangi"} {amount ? Number(amount).toLocaleString() : "0"} Credits
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${
            toast.type === "success" ? "border-green-500/30 bg-green-500/15 text-green-400" : "border-red-500/30 bg-red-500/15 text-red-400"
          }`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
