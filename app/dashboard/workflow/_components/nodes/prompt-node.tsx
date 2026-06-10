"use client"

import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { MoreHorizontalIcon, CopyIcon, TrashIcon, PencilIcon } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { getPortColor } from "../node-shell"

export function PromptNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const { updateNodeData, deleteElements, getNodes, setNodes } = useReactFlow()
  const nodeData = data as Record<string, unknown>
  const promptText = (nodeData.prompt as string) || ""
  const title = (nodeData.title as string) ?? "Prompt"

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  const handleDuplicate = useCallback(() => {
    setMenuOpen(false)
    const nodes = getNodes()
    const currentNode = nodes.find(n => n.id === nodeId)
    if (!currentNode) return
    const newId = `prompt_${Date.now()}`
    const newNode = {
      ...currentNode,
      id: newId,
      position: { x: currentNode.position.x + 40, y: currentNode.position.y + 40 },
      data: { ...currentNode.data, title: `${title} (copy)` },
      selected: false,
    }
    setNodes([...nodes, newNode])
  }, [getNodes, setNodes, nodeId, title])

  const handleDelete = useCallback(() => {
    setMenuOpen(false)
    deleteElements({ nodes: [{ id: nodeId }] })
  }, [deleteElements, nodeId])

  const handleRename = useCallback(() => {
    setMenuOpen(false)
    setIsEditingTitle(true)
  }, [])

  return (
    <div className={cn(
      "group relative min-w-[360px] max-w-[420px] rounded-2xl border bg-card transition-all font-sans",
      selected 
        ? "border-violet-500/80 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30" 
        : "border-border/60 shadow-sm hover:border-border hover:shadow-md"
    )}>
      


      {/* ─── Right Handle: Prompt ─── */}
      <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex items-center justify-start">
        <span className={cn(
          "absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )} style={{ top: "50%", transform: "translateY(-50%)" }}>
          Prompt
        </span>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="prompt"
        className="!border-[4px] !border-[#f472b6]"
        style={{ 
          background: "var(--card)", 
          width: 16, 
          height: 16, 
          right: -8,
          zIndex: 10
        }} 
      />

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {isEditingTitle ? (
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => updateNodeData(nodeId, { title: e.target.value })}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={e => e.key === "Enter" && setIsEditingTitle(false)}
            className="bg-transparent text-sm font-medium text-foreground focus:outline-none border-b border-border"
          />
        ) : (
          <h3 
            className="text-sm font-medium text-foreground cursor-text"
            onClick={() => setIsEditingTitle(true)}
            title="Klik untuk mengubah nama"
          >
            {title}
          </h3>
        )}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-fade-in">
              <button
                onClick={handleRename}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition"
              >
                <PencilIcon className="h-3 w-3" /> Rename
              </button>
              <button
                onClick={handleDuplicate}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition"
              >
                <CopyIcon className="h-3 w-3" /> Duplicate
              </button>
              <div className="h-px bg-border/50 mx-2" />
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition"
              >
                <TrashIcon className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Content (Darker inner box) ─── */}
      <div className="mx-2 mb-2 rounded-xl bg-muted/40 p-4 border border-border/50">
        <textarea
          value={promptText}
          onChange={e => updateNodeData(nodeId, { prompt: e.target.value })}
          placeholder='Try "A beautiful female animated character with a happy vibe."'
          className="w-full min-h-[140px] bg-transparent text-[13px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none resize-none"
        />
        

      </div>

    </div>
  )
}
