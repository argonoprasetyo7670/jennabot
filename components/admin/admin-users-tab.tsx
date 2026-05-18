"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  SearchIcon, UsersIcon, ChevronLeftIcon, ChevronRightIcon,
  Loader2Icon, ShieldIcon, UserIcon, CoinsIcon,
} from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: string
  isReseller: boolean
  creditBalance: number
}

export function AdminUsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState("")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleSearch = () => { setPage(1); fetchUsers() }

  const handleSaveRole = async (userId: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: editRole }),
      })
      if (res.ok) {
        setToast({ msg: "Role berhasil diubah", type: "success" })
        setEditingId(null)
        fetchUsers()
      } else {
        const err = await res.json()
        setToast({ msg: err.error || "Gagal mengubah role", type: "error" })
      }
    } catch {
      setToast({ msg: "Gagal mengubah role", type: "error" })
    } finally { setSaving(false) }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={handleSearch} variant="outline">Cari</Button>
        </div>
        <Badge variant="secondary" className="gap-1.5 self-start">
          <UsersIcon className="h-3 w-3" /> {total} user
        </Badge>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar User</CardTitle>
          <CardDescription>Kelola semua user yang terdaftar di platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Tidak ada user ditemukan</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium text-right">Credits</th>
                    <th className="px-4 py-3 font-medium">Bergabung</th>
                    <th className="px-6 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                              {(u.name || u.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">{u.name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingId === u.id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="rounded-md border bg-background px-2 py-1 text-xs"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="gap-1 text-[11px]">
                            {u.role === "admin" ? <ShieldIcon className="h-2.5 w-2.5" /> : <UserIcon className="h-2.5 w-2.5" />}
                            {u.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CoinsIcon className="h-3 w-3 text-amber-500" />
                          <span className="font-medium">{u.creditBalance.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-3 text-right">
                        {editingId === u.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Batal</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveRole(u.id)} disabled={saving}>
                              {saving ? <Loader2Icon className="h-3 w-3 animate-spin" /> : "Simpan"}
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingId(u.id); setEditRole(u.role) }}>
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
