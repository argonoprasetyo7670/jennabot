"use client"

import { useState, useCallback, useEffect, useRef, use, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { cn } from "@/lib/utils"
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Node, type Edge,
  BackgroundVariant, MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  ArrowLeftIcon, SaveIcon, Trash2Icon, Loader2Icon,
  CheckCircle2Icon, BotIcon,
  PanelRightCloseIcon, ScanEyeIcon, PencilRulerIcon, ZapIcon,
  MousePointer2Icon, HandIcon, ChevronDownIcon, PlusIcon,
  Undo2Icon, Redo2Icon, Maximize2Icon, Minimize2Icon, XIcon,
} from "lucide-react"
import {
  getWorkflow, updateWorkflow, type WorkflowData,
} from "../_components/workflow-store"
import { useWorkflowHistory } from "@/hooks/use-workflow-history"
import { getPortColor } from "../_components/node-shell"
import { nodeTypes, PALETTE_ITEMS, AgentInputBox } from "../_components/node-registry"
import { DeletableEdge } from "../_components/deletable-edge"

const edgeTypes = { deletable: DeletableEdge }

export default function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTool, setActiveTool] = useState<"select" | "grab">("grab")
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentMessages, setAgentMessages] = useState<{ role: "user" | "agent"; text: string }[]>([])
  const [agentThinking, setAgentThinking] = useState(false)
  const agentEndRef = useRef<HTMLDivElement>(null)

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<{ getViewport: () => { x: number; y: number; zoom: number } } | null>(null)

  // Undo/Redo
  const { pushState, undo, redo, canUndo, canRedo } = useWorkflowHistory(30)
  const historyLockRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-scroll agent chat
  useEffect(() => {
    agentEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [agentMessages, agentThinking])

  // Apply agent canvas actions
  const applyAgentActions = useCallback((actions: Record<string, unknown>[]) => {
    if (!actions?.length) return 0
    let applied = 0
    for (const action of actions) {
      switch (action.type) {
        case "clearCanvas": setNodes([]); setEdges([]); applied++; break
        case "addNode": {
          const pos = action.position as { x: number; y: number } || { x: 100, y: 250 }
          setNodes(nds => [...nds, { id: action.id as string || `n_${Date.now()}`, type: action.nodeType as string, position: pos, data: (action.data as Record<string, unknown>) || {} }])
          applied++; break
        }
        case "addEdge": {
          setEdges(eds => [...eds, { id: `e_${Date.now()}`, source: action.source as string, target: action.target as string, sourceHandle: action.sourceHandle as string, targetHandle: action.targetHandle as string, animated: true, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, style: { stroke: getPortColor(action.sourceHandle as string || ""), strokeWidth: 2 } }])
          applied++; break
        }
        case "removeNode": setNodes(nds => nds.filter(n => n.id !== action.id)); setEdges(eds => eds.filter(e => e.source !== action.id && e.target !== action.id)); applied++; break
        case "updateNode": setNodes(nds => nds.map(n => n.id === action.id ? { ...n, data: { ...n.data, ...(action.data as Record<string, unknown>) } } : n)); applied++; break
      }
    }
    return applied
  }, [setNodes, setEdges])

  // Send message to agent
  const sendAgentMessage = useCallback(async (userText: string) => {
    const newMsgs = [...agentMessages, { role: "user" as const, text: userText }]
    setAgentMessages(newMsgs)
    setAgentThinking(true)
    try {
      const canvas = { nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })), edges: edges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })) }
      const res = await fetch("/api/ai/workflow-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMsgs, canvas }) })
      if (!res.ok) throw new Error("Agent error")
      const data = await res.json()
      const actions = data.actions as Record<string, unknown>[] || []
      const count = actions.length > 0 ? applyAgentActions(actions) : 0
      let reply = data.reply || "Siap!"
      if (count && count > 0) reply += `\n\n✅ ${count} perubahan diterapkan ke canvas.`
      setAgentMessages(prev => [...prev, { role: "agent", text: reply }])
    } catch {
      setAgentMessages(prev => [...prev, { role: "agent", text: "⚠️ Gagal menghubungi agent. Coba lagi nanti." }])
    } finally { setAgentThinking(false) }
  }, [agentMessages, nodes, edges, applyAgentActions])

  // Load workflow
  useEffect(() => {
    const wf = getWorkflow(id)
    if (!wf) { router.replace("/dashboard/workflow"); return }
    setWorkflow(wf)
    setNodes(wf.nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })))
    setEdges(wf.edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, animated: true, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, style: { stroke: getPortColor(e.sourceHandle), strokeWidth: 2 } })))
    setLoaded(true)
  }, [id, router, setNodes, setEdges])

  // Auto-save (3s debounce)
  useEffect(() => {
    if (!workflow || !loaded || historyLockRef.current) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      const viewport = rfInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
      updateWorkflow(workflow.id, { nodes: nodes.map(n => ({ id: n.id, type: n.type!, position: n.position, data: n.data as Record<string, unknown> })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || "", targetHandle: e.targetHandle || "" })), viewport })
      setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000)
    }, 3000)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // Push undo history (500ms debounce)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!loaded || historyLockRef.current) return
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
    historyTimerRef.current = setTimeout(() => { pushState(nodes, edges) }, 500)
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // Edge labels lookup
  const HANDLE_LABELS: Record<string, string> = useMemo(() => ({
    prompt: "Prompt", selectedImage: "Image", selectedVideo: "Video",
    images: "Images", media: "Media", audio: "Audio",
    poseData: "Pose", cameraParams: "Camera", startImage: "Start",
  }), [])

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      id: `e_${Date.now()}`, ...connection, source: connection.source!, target: connection.target!,
      animated: true, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { stroke: getPortColor(connection.sourceHandle || ""), strokeWidth: 2 },
      label: HANDLE_LABELS[connection.sourceHandle || ""] || "",
      labelStyle: { fontSize: 10, fontWeight: 500, fill: "var(--muted-foreground)" },
      labelBgPadding: [4, 2] as [number, number], labelBgBorderRadius: 4,
      labelBgStyle: { fill: "var(--card)", stroke: "var(--border)", strokeWidth: 1 },
    }
    setEdges(eds => addEdge(newEdge, eds))
  }, [setEdges, HANDLE_LABELS])

  const handleSave = useCallback(() => {
    if (!workflow) return
    setSaving(true)
    const viewport = rfInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
    updateWorkflow(workflow.id, { nodes: nodes.map(n => ({ id: n.id, type: n.type!, position: n.position, data: n.data as Record<string, unknown> })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || "", targetHandle: e.targetHandle || "" })), viewport })
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }, 300)
  }, [workflow, nodes, edges, rfInstance])

  const handleUndo = useCallback(() => {
    const snapshot = undo(); if (!snapshot) return
    historyLockRef.current = true; setNodes(snapshot.nodes); setEdges(snapshot.edges)
    setTimeout(() => { historyLockRef.current = false }, 100)
  }, [undo, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    const snapshot = redo(); if (!snapshot) return
    historyLockRef.current = true; setNodes(snapshot.nodes); setEdges(snapshot.edges)
    setTimeout(() => { historyLockRef.current = false }, 100)
  }, [redo, setNodes, setEdges])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return
      if (isCmd && e.key === "s") { e.preventDefault(); handleSave() }
      if (isCmd && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo() }
      if (isCmd && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); handleRedo() }
      if (!isCmd && e.key === "v") setActiveTool("select")
      if (!isCmd && e.key === "h") setActiveTool("grab")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleSave, handleUndo, handleRedo])

  const handleClear = () => { setNodes([]); setEdges([]) }
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData("application/reactflow"); if (!type) return
    const bounds = reactFlowWrapper.current?.getBoundingClientRect(); if (!bounds) return
    setNodes(nds => [...nds, { id: `n_${Date.now()}`, type, position: { x: e.clientX - bounds.left - 120, y: e.clientY - bounds.top - 30 }, data: {} }])
  }, [setNodes])

  const addNodeAtCenter = useCallback((type: string) => {
    const wrapper = reactFlowWrapper.current; if (!wrapper) return
    const bounds = wrapper.getBoundingClientRect()
    const viewport = rfInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
    const offset = Math.random() * 60 - 30
    setNodes(nds => [...nds, { id: `n_${Date.now()}`, type, position: { x: (bounds.width / 2 - viewport.x) / viewport.zoom - 140 + offset, y: (bounds.height / 2 - viewport.y) / viewport.zoom - 80 + offset }, data: {} }])
  }, [setNodes, rfInstance])


  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col bg-background transition-all duration-300", isFullscreen ? "fixed inset-0 z-50" : "h-[calc(100vh-0px)]")}>
      {!isFullscreen && (
        <DashboardHeader breadcrumbs={[
          { label: "Jenna Bot Pro", href: "/dashboard" },
          { label: "Workflow Builder", href: "/dashboard/workflow" },
          { label: workflow?.name || "Editor" },
        ]} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ─── Top Toolbar ─── */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/30 shrink-0 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={() => isFullscreen ? setIsFullscreen(false) : router.push("/dashboard/workflow")}
              className="flex shrink-0 h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title={isFullscreen ? "Keluar Fullscreen" : "Kembali"}>
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <button onClick={handleUndo} disabled={!canUndo} className="hidden sm:flex shrink-0 h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition disabled:opacity-30" title="Undo (⌘Z)"><Undo2Icon className="h-3.5 w-3.5" /></button>
            <button onClick={handleRedo} disabled={!canRedo} className="hidden sm:flex shrink-0 h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition disabled:opacity-30" title="Redo (⌘⇧Z)"><Redo2Icon className="h-3.5 w-3.5" /></button>
            <div className="hidden sm:block h-5 w-px bg-border/40" />
            <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[160px]">{workflow?.name}</span>
            {autoSaved && <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400/70"><CheckCircle2Icon className="h-3 w-3" /> Auto-saved</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleSave} disabled={saving}
              className={cn("flex shrink-0 h-8 w-8 items-center justify-center rounded-lg transition", saved ? "text-emerald-400" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              title={saved ? "Tersimpan" : "Simpan (⌘S)"}>
              {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2Icon className="h-4 w-4" /> : <SaveIcon className="h-4 w-4" />}
            </button>
            <button onClick={handleClear} className="hidden sm:flex shrink-0 h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition" title="Bersihkan canvas"><Trash2Icon className="h-4 w-4" /></button>
            <div className="hidden sm:block h-5 w-px bg-border/50 mx-0.5" />
            <button onClick={() => setIsFullscreen(f => !f)} className="hidden sm:flex shrink-0 h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition" title={isFullscreen ? "Keluar fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize2Icon className="h-4 w-4" /> : <Maximize2Icon className="h-4 w-4" />}
            </button>
            <button onClick={() => setAgentOpen(a => !a)}
              className={cn("flex shrink-0 h-8 w-8 items-center justify-center rounded-lg transition", agentOpen ? "bg-violet-500/15 text-violet-400" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              title="Workflow Agent">
              {agentOpen ? <PanelRightCloseIcon className="h-4 w-4" /> : <BotIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ─── Canvas + Agent Layout ─── */}
        <div className="flex-1 flex overflow-hidden">
          {/* ReactFlow Canvas */}
          <div ref={reactFlowWrapper} className="flex-1 relative">
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={(instance: { getViewport: () => { x: number; y: number; zoom: number } }) => setRfInstance(instance)}
              onDragOver={onDragOver} onDrop={onDrop}
              nodeTypes={nodeTypes} edgeTypes={edgeTypes}
              deleteKeyCode={["Delete", "Backspace"]}
              fitView snapToGrid snapGrid={[16, 16]}
              panOnDrag={activeTool === "grab"} selectionOnDrag={activeTool === "select"}
              defaultEdgeOptions={{ type: "deletable", animated: true, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } }}
              proOptions={{ hideAttribution: true }} className="workflow-canvas"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="var(--text-3)" />
              <Controls showInteractive={false} className="workflow-controls" />
              <MiniMap nodeColor={() => "#8b5cf6"} maskColor="rgba(0,0,0,0.3)" className="workflow-minimap" />

              {nodes.length === 0 && (
                <Panel position="top-center">
                  <div className="mt-32 text-center animate-fade-up">
                    <p className="text-sm text-muted-foreground/50 mb-1">Klik icon di toolbar bawah untuk menambah node</p>
                    <p className="text-xs text-muted-foreground/30">Atau drag icon ke canvas • Hubungkan port antar node</p>
                  </div>
                </Panel>
              )}

            </ReactFlow>

            {/* ─── Floating Bottom Toolbar ─── */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
              {/* Mobile Palette Dropdown */}
              {mobilePaletteOpen && (
                <div className="sm:hidden grid grid-cols-4 gap-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-xl p-3 w-[280px] animate-in slide-in-from-bottom-2 fade-in">
                  {PALETTE_ITEMS.map((item) => (
                    <div key={item.type}
                      onClick={() => { addNodeAtCenter(item.type); setMobilePaletteOpen(false); }}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all active:scale-95"
                    >
                      <item.Icon className="h-5 w-5" />
                      <span className="text-[9px] font-medium text-center leading-tight line-clamp-1">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Main Toolbar */}
              <div className="flex items-center gap-1 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-xl px-2 py-1.5 w-max max-w-[95vw] overflow-x-auto scrollbar-hide">
                <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-muted/50 p-0.5">
                  <button onClick={() => setActiveTool("select")} className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-all", activeTool === "select" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")} title="Select (V)"><MousePointer2Icon className="h-4 w-4" /></button>
                  <button onClick={() => setActiveTool("grab")} className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-all", activeTool === "grab" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")} title="Grab (H)"><HandIcon className="h-4 w-4" /></button>
                </div>
                <div className="h-6 w-px bg-border/60 mx-0.5 shrink-0" />
                
                {/* Desktop Inline Palette */}
                <div className="hidden sm:flex shrink-0 items-center gap-0.5">
                  {PALETTE_ITEMS.map((item) => (
                    <div key={item.type} draggable
                      onDragStart={(e) => { e.dataTransfer.setData("application/reactflow", item.type); e.dataTransfer.effectAllowed = "move" }}
                      onClick={() => addNodeAtCenter(item.type)}
                      className="relative flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all active:scale-90"
                      title={item.label}>
                      <item.Icon className="h-4 w-4" />
                    </div>
                  ))}
                </div>

                {/* Mobile Toggle Palette Button */}
                <button 
                  onClick={() => setMobilePaletteOpen(o => !o)} 
                  className={cn("sm:hidden flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all text-sm font-medium", mobilePaletteOpen ? "bg-violet-500/15 text-violet-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
                >
                  <PlusIcon className="h-4 w-4" /> Tambah Node
                </button>

                <div className="hidden sm:block h-6 w-px bg-border/60 mx-0.5 shrink-0" />
                <button className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition shrink-0">
                  <span className="text-sm">ⓟ</span><span className="text-xs font-medium">Canvas</span><ChevronDownIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Workflow Agent Sidebar ─── */}
          {agentOpen && (
            <div className={cn(
              "shrink-0 border-l border-border bg-card/95 sm:bg-card/50 backdrop-blur-md flex flex-col z-20",
              "absolute inset-y-0 right-0 w-full sm:w-[320px] sm:relative sm:inset-auto"
            )}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/15"><BotIcon className="h-3.5 w-3.5 text-violet-400" /></div>
                  <div><p className="text-xs font-semibold text-foreground">Workflow Agent</p><p className="text-[10px] text-muted-foreground">AI Assistant</p></div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[9px] font-medium text-violet-400">BETA</span>
                  <button onClick={() => setAgentOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"><XIcon className="h-3 w-3" /></button>
                </div>
              </div>

              {agentMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                  <div className="space-y-4 max-w-[250px]">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground"><ScanEyeIcon className="h-3 w-3" /> Canvas</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-[10px] font-medium text-violet-400"><PencilRulerIcon className="h-3 w-3" /> Prepare edits</span>
                    </div>
                    <div className="flex justify-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground"><ZapIcon className="h-3 w-3" /> Output</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground leading-snug">AI assistant yang langsung menyusun workflow di canvas kamu.</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Cukup deskripsikan kebutuhan, agent akan membuat node, menghubungkan, dan mengonfigurasi semuanya.</p>
                    <div className="space-y-2 pt-2">
                      <button onClick={() => { setAgentMessages([{ role: "agent", text: `Halo! Saya Workflow Agent. Saya bisa bantu:\n\n• 📖 Baca canvas kamu & analisis alur\n• 🔧 Siapkan template workflow\n• ⚡ Bantu konfigurasi node\n\nMau mulai dari mana?` }]) }}
                        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:shadow-md hover:shadow-violet-500/20 transition-all active:scale-[0.98]">
                        Mulai Agent
                      </button>
                      <button onClick={() => { setAgentMessages([]) }} className="w-full rounded-xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition">Langsung ke chat</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    {agentMessages.map((msg, i) => (
                      <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap", msg.role === "user" ? "bg-violet-500 text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>{msg.text}</div>
                      </div>
                    ))}
                    {agentThinking && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={agentEndRef} />
                  </div>
                  <div className="px-3 pb-1 flex flex-wrap gap-1">
                    {[
                      { label: "Baca canvas", icon: ScanEyeIcon, msg: "Baca dan analisis canvas saya sekarang" },
                      { label: "Image → Video", icon: PencilRulerIcon, msg: "Buatkan workflow: Prompt → Image Generate → Video Generate → Output" },
                      { label: "Batch gambar", icon: ZapIcon, msg: "Buatkan workflow batch generate 4 gambar dengan nano-banana-2 lalu simpan ke gallery" },
                    ].map(q => (
                      <button key={q.label} onClick={() => sendAgentMessage(q.msg)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition">
                        <q.icon className="h-3 w-3" /> {q.label}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-border">
                    <AgentInputBox onSend={sendAgentMessage} disabled={agentThinking} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
