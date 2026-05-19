"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { cn } from "@/lib/utils"
import {
  PlusIcon,
  GitMergeIcon,
  Trash2Icon,
  CopyIcon,
  PencilIcon,
  ClockIcon,
  XIcon,
  AlertTriangleIcon,
} from "lucide-react"
import {
  getWorkflows,
  createWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  canCreateWorkflow,
  getWorkflowCount,
  TEMPLATES,
  MAX_WORKFLOWS,
  type WorkflowData,
} from "./_components/workflow-store"

/* ─── Node type icons for mini preview ─── */
const NODE_ICONS: Record<string, string> = {
  promptNode: "📝",
  imageGenNode: "🖼️",
  videoGenNode: "🎬",
  galleryNode: "💾",
  outputNode: "👁️",
}

/* ─── Time ago helper ─── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins}m lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}j lalu`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}h lalu`
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

export default function WorkflowListPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowData[]>([])
  const [loaded, setLoaded] = useState(false)

  // Dialog state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("blank")

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  useEffect(() => {
    setWorkflows(getWorkflows())
    setLoaded(true)
  }, [])

  const refresh = () => setWorkflows(getWorkflows())

  const handleCreate = () => {
    if (!newName.trim()) return
    try {
      const wf = createWorkflow(newName.trim(), selectedTemplate === "blank" ? undefined : selectedTemplate)
      setShowCreate(false)
      setNewName("")
      setSelectedTemplate("blank")
      router.push(`/dashboard/workflow/${wf.id}`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal membuat workflow")
    }
  }

  const handleDelete = (id: string) => {
    deleteWorkflow(id)
    setDeleteId(null)
    refresh()
  }

  const handleDuplicate = (id: string) => {
    try {
      duplicateWorkflow(id)
      refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal menduplikat workflow")
    }
  }

  const handleRename = (id: string) => {
    if (!renameValue.trim()) return
    const wfs = getWorkflows()
    const wf = wfs.find(w => w.id === id)
    if (wf) {
      wf.name = renameValue.trim()
      wf.updatedAt = new Date().toISOString()
      localStorage.setItem("jenna_workflows", JSON.stringify(wfs))
      refresh()
    }
    setRenamingId(null)
  }

  const count = getWorkflowCount()
  const canCreate = canCreateWorkflow()

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Workflow Builder" },
      ]} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <GitMergeIcon className="h-5 w-5 text-violet-400" />
                Workflow Saya
                {loaded && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({count}/{MAX_WORKFLOWS})
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Buat alur kerja AI otomatis dengan menghubungkan node-node visual
              </p>
            </div>

            <button
              onClick={() => canCreate ? setShowCreate(true) : null}
              disabled={!canCreate}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95",
                canCreate
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              title={canCreate ? "Buat workflow baru" : `Maksimal ${MAX_WORKFLOWS} workflow`}
            >
              <PlusIcon className="h-4 w-4" />
              Buat Baru
            </button>
          </div>

          {/* ── Content ── */}
          {!loaded ? (
            <div className="flex items-center justify-center py-32">
              <div className="h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
            </div>
          ) : workflows.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
              <div className="relative mb-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20">
                  <GitMergeIcon className="h-10 w-10 text-violet-400/60" />
                </div>
                <div className="absolute -inset-6 rounded-3xl bg-violet-500/5 blur-xl -z-10" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Belum ada workflow</h2>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                Buat workflow pertamamu untuk mengotomasi alur kerja AI — dari generate gambar hingga video, semua dalam satu canvas visual.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
                Buat Workflow Pertama
              </button>
            </div>
          ) : (
            /* Workflow Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf, i) => (
                <div
                  key={wf.id}
                  className="group relative rounded-2xl border border-border bg-card/50 overflow-hidden transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5 animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Card Header */}
                  <div className="px-4 pt-4 pb-3">
                    {renamingId === wf.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleRename(wf.id)
                            if (e.key === "Escape") setRenamingId(null)
                          }}
                          className="flex-1 bg-transparent border-b border-violet-500 text-sm font-semibold text-foreground focus:outline-none"
                        />
                        <button
                          onClick={() => handleRename(wf.id)}
                          className="text-xs text-violet-400 hover:text-violet-300"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <h3
                        className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-violet-400 transition-colors"
                        onClick={() => router.push(`/dashboard/workflow/${wf.id}`)}
                        title={wf.name}
                      >
                        {wf.name}
                      </h3>
                    )}
                  </div>

                  {/* Mini Node Preview */}
                  <div
                    className="mx-4 rounded-xl bg-muted/30 border border-border/50 px-3 py-3 mb-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/dashboard/workflow/${wf.id}`)}
                  >
                    {wf.nodes.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {wf.nodes.map((n, ni) => (
                          <span key={n.id} className="flex items-center gap-0.5">
                            <span className="flex items-center gap-1 rounded-md bg-background/80 border border-border/50 px-2 py-1 text-[10px] text-foreground/80">
                              <span>{NODE_ICONS[n.type] || "⚡"}</span>
                              <span className="max-w-[60px] truncate">
                                {n.type.replace("Node", "").replace(/([A-Z])/g, " $1").trim()}
                              </span>
                            </span>
                            {ni < wf.nodes.length - 1 && (
                              <span className="text-muted-foreground/40 text-[10px]">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 text-center py-2">
                        Canvas kosong
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                      <ClockIcon className="h-3 w-3" />
                      {timeAgo(wf.updatedAt)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/workflow/${wf.id}`) }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        title="Edit"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDuplicate(wf.id) }}
                        disabled={!canCreate}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition disabled:opacity-30"
                        title={canCreate ? "Duplikat" : "Slot penuh"}
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteId(wf.id) }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition"
                        title="Hapus"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Card (dashed) */}
              {canCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border hover:border-violet-500/40 bg-transparent py-12 transition-all hover:bg-violet-500/5 active:scale-[0.98] animate-fade-up"
                  style={{ animationDelay: `${workflows.length * 80}ms` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <PlusIcon className="h-5 w-5 text-violet-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">Buat Workflow Baru</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Create Dialog ═══════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div
            className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-fade-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-foreground">Buat Workflow Baru</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Name Input */}
            <div className="px-5 pb-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Workflow</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="contoh: Product Review Flow"
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
              />
            </div>

            {/* Template Selection */}
            <div className="px-5 pb-5">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Template</label>
              <div className="grid gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all border",
                      selectedTemplate === t.id
                        ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/20"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    )}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 pb-5">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/35 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-4 w-4" />
                Buat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Delete Confirm Dialog ═══════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div
            className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-fade-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-3">
                <AlertTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Hapus Workflow?</h3>
              <p className="text-sm text-muted-foreground">
                Workflow &quot;{workflows.find(w => w.id === deleteId)?.name}&quot; akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center gap-2 px-5 pb-5">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl py-2.5 text-sm text-muted-foreground hover:bg-muted transition"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/30 transition active:scale-95"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
