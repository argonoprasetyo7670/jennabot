"use client"

import { useState, useEffect, useCallback } from "react"
import { Handle, Position, useReactFlow, useEdges } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import {
  GitBranchIcon, RepeatIcon, TimerIcon, FilterIcon,
  GitMergeIcon, VariableIcon, StickyNoteIcon, BrainCircuitIcon,
  SplitIcon, PlayIcon, Loader2Icon, CheckCircle2Icon,
  AlertCircleIcon, XIcon, ChevronDownIcon, SparklesIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NodeShell, NodeCloseBtn } from "../node-shell"
import { useConnectedValue } from "../use-connected-value"

/* ═══════════════════════════════════════════════════════════
   IF/ELSE NODE — Routes data based on condition
   ═══════════════════════════════════════════════════════════ */

const IF_OPERATORS = [
  { value: "equals", label: "Sama dengan" },
  { value: "not_equals", label: "Tidak sama dengan" },
  { value: "contains", label: "Mengandung" },
  { value: "not_contains", label: "Tidak mengandung" },
  { value: "starts_with", label: "Dimulai dengan" },
  { value: "ends_with", label: "Diakhiri dengan" },
  { value: "is_empty", label: "Kosong" },
  { value: "is_not_empty", label: "Tidak kosong" },
  { value: "greater_than", label: "Lebih dari (angka)" },
  { value: "less_than", label: "Kurang dari (angka)" },
] as const

export function evaluateCondition(
  value: string,
  operator: string,
  compareValue: string
): boolean {
  const v = (value || "").toString().trim()
  const c = (compareValue || "").toString().trim()
  switch (operator) {
    case "equals": return v === c
    case "not_equals": return v !== c
    case "contains": return v.toLowerCase().includes(c.toLowerCase())
    case "not_contains": return !v.toLowerCase().includes(c.toLowerCase())
    case "starts_with": return v.toLowerCase().startsWith(c.toLowerCase())
    case "ends_with": return v.toLowerCase().endsWith(c.toLowerCase())
    case "is_empty": return v.length === 0
    case "is_not_empty": return v.length > 0
    case "greater_than": return parseFloat(v) > parseFloat(c)
    case "less_than": return parseFloat(v) < parseFloat(c)
    default: return false
  }
}

export function IfElseNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedValue = useConnectedValue("value") as string | null
  const operator = (nd.operator as string) || "is_not_empty"
  const compareValue = (nd.compareValue as string) || ""
  const lastResult = nd._lastResult as boolean | undefined

  const needsCompareValue = !["is_empty", "is_not_empty"].includes(operator)

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="If / Else" icon="🔀" status={(nd._runStatus || nd.status) as string} nodeType="ifElseNode" nodeId={nodeId} selected={selected}>
        {/* Input: value (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "30%", transform: "translateY(-50%)" }}>Value</span>
        <Handle type="target" position={Position.Left} id="value"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "30%", zIndex: 10 }} />

        {/* Output: true (right top) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-emerald-400 pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "35%", transform: "translateY(-50%)" }}>✓ True</span>
        <Handle type="source" position={Position.Right} id="true"
          className="!border-[4px] !border-emerald-400"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "35%", zIndex: 10 }} />

        {/* Output: false (right bottom) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-red-400 pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "65%", transform: "translateY(-50%)" }}>✗ False</span>
        <Handle type="source" position={Position.Right} id="false"
          className="!border-[4px] !border-red-400"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "65%", zIndex: 10 }} />

        <div className="space-y-2">
          {/* Operator select */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Kondisi</label>
            <select
              value={operator}
              onChange={e => updateNodeData(nodeId, { operator: e.target.value })}
              className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            >
              {IF_OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
          </div>

          {/* Compare value */}
          {needsCompareValue && (
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Nilai pembanding</label>
              <input
                value={compareValue}
                onChange={e => updateNodeData(nodeId, { compareValue: e.target.value })}
                placeholder="Masukkan nilai..."
                className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
              />
            </div>
          )}

          {/* Connected value preview */}
          {connectedValue !== null && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Input value:</p>
              <p className="text-[10px] text-foreground/70 truncate italic">&quot;{String(connectedValue).slice(0, 80)}&quot;</p>
            </div>
          )}

          {/* Last result indicator */}
          {lastResult !== undefined && (
            <div className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1", lastResult ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20")}>
              {lastResult ? <CheckCircle2Icon className="h-3 w-3 text-emerald-400" /> : <AlertCircleIcon className="h-3 w-3 text-red-400" />}
              <span className={cn("text-[10px] font-medium", lastResult ? "text-emerald-400" : "text-red-400")}>
                Hasil: {lastResult ? "True" : "False"}
              </span>
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   LOOP NODE — Iterates over an array or N times
   ═══════════════════════════════════════════════════════════ */

export function LoopNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedItems = useConnectedValue("items") as string | string[] | null
  const mode = (nd.loopMode as string) || "count"
  const maxIterations = (nd.maxIterations as number) || 5
  const currentIteration = nd._currentIteration as number | undefined
  const totalIterations = nd._totalIterations as number | undefined

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Loop" icon="🔁" status={(nd._runStatus || nd.status) as string} nodeType="loopNode" nodeId={nodeId} selected={selected}>
        {/* Input: items (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#8b5cf6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "30%", transform: "translateY(-50%)" }}>Items</span>
        <Handle type="target" position={Position.Left} id="items"
          className="!border-[4px] !border-[#8b5cf6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "30%", zIndex: 10 }} />

        {/* Output: item (current iteration value) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "30%", transform: "translateY(-50%)" }}>Item</span>
        <Handle type="source" position={Position.Right} id="item"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "30%", zIndex: 10 }} />

        {/* Output: index */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#f59e0b] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "55%", transform: "translateY(-50%)" }}>Index</span>
        <Handle type="source" position={Position.Right} id="index"
          className="!border-[4px] !border-[#f59e0b]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "55%", zIndex: 10 }} />

        {/* Output: all results collected */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "80%", transform: "translateY(-50%)" }}>Results</span>
        <Handle type="source" position={Position.Right} id="results"
          className="!border-[4px] !border-[#34d399]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "80%", zIndex: 10 }} />

        <div className="space-y-2">
          {/* Mode selector */}
          <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
            <button onClick={() => updateNodeData(nodeId, { loopMode: "count" })} className={cn("flex-1 px-2 py-1 rounded-full text-[10px] font-medium transition", mode === "count" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>N Kali</button>
            <button onClick={() => updateNodeData(nodeId, { loopMode: "array" })} className={cn("flex-1 px-2 py-1 rounded-full text-[10px] font-medium transition", mode === "array" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Array</button>
          </div>

          {mode === "count" && (
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Jumlah iterasi</label>
              <input type="number" min={1} max={20} value={maxIterations}
                onChange={e => updateNodeData(nodeId, { maxIterations: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) })}
                className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400/50" />
            </div>
          )}

          {mode === "array" && (
            <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">
                {connectedItems
                  ? `${Array.isArray(connectedItems) ? connectedItems.length : 1} item terhubung`
                  : "Hubungkan array dari node lain (e.g. Text Splitter)"}
              </p>
            </div>
          )}

          {/* Progress */}
          {currentIteration !== undefined && totalIterations !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Iterasi</span>
                <span className="text-violet-400 font-medium">{currentIteration}/{totalIterations}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-300" style={{ width: `${(currentIteration / totalIterations) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   DELAY NODE — Waits N seconds then passes data
   ═══════════════════════════════════════════════════════════ */

export function DelayNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const delaySeconds = (nd.delaySeconds as number) || 3
  const remaining = nd._remaining as number | undefined

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Delay" icon="⏱️" status={(nd._runStatus || nd.status) as string} nodeType="delayNode" nodeId={nodeId} selected={selected}>
        {/* Input (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "50%", transform: "translateY(-50%)" }}>Input</span>
        <Handle type="target" position={Position.Left} id="input"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "50%", zIndex: 10 }} />

        {/* Output (right) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "50%", transform: "translateY(-50%)" }}>Output</span>
        <Handle type="source" position={Position.Right} id="output"
          className="!border-[4px] !border-[#34d399]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "50%", zIndex: 10 }} />

        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Tunggu (detik)</label>
            <input type="number" min={1} max={300} value={delaySeconds}
              onChange={e => updateNodeData(nodeId, { delaySeconds: Math.min(300, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50" />
          </div>

          {remaining !== undefined && (
            <div className="flex items-center justify-center gap-2 py-2">
              <TimerIcon className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="text-sm font-mono text-amber-400">{remaining}s</span>
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   FILTER NODE — Filters array items by condition
   ═══════════════════════════════════════════════════════════ */

export function FilterNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const operator = (nd.filterOperator as string) || "contains"
  const filterValue = (nd.filterValue as string) || ""
  const lastCount = nd._filteredCount as number | undefined
  const lastTotal = nd._totalCount as number | undefined

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Filter" icon="🔍" status={(nd._runStatus || nd.status) as string} nodeType="filterNode" nodeId={nodeId} selected={selected}>
        {/* Input: items (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#8b5cf6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "40%", transform: "translateY(-50%)" }}>Items</span>
        <Handle type="target" position={Position.Left} id="items"
          className="!border-[4px] !border-[#8b5cf6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "40%", zIndex: 10 }} />

        {/* Output: filtered (right) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "40%", transform: "translateY(-50%)" }}>Filtered</span>
        <Handle type="source" position={Position.Right} id="filtered"
          className="!border-[4px] !border-[#34d399]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "40%", zIndex: 10 }} />

        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Kondisi filter</label>
            <select value={operator} onChange={e => updateNodeData(nodeId, { filterOperator: e.target.value })}
              className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground focus:outline-none">
              {IF_OPERATORS.filter(o => !["is_empty", "is_not_empty", "greater_than", "less_than"].includes(o.value)).map(op =>
                <option key={op.value} value={op.value}>{op.label}</option>
              )}
            </select>
          </div>
          <input value={filterValue} onChange={e => updateNodeData(nodeId, { filterValue: e.target.value })}
            placeholder="Nilai filter..." className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50" />

          {lastCount !== undefined && (
            <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-2 py-1">
              <p className="text-[10px] text-emerald-400">✓ {lastCount} dari {lastTotal} item lolos filter</p>
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   MERGE NODE — Combines multiple inputs into one output
   ═══════════════════════════════════════════════════════════ */

export function MergeNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { deleteElements } = useReactFlow()

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Merge" icon="🔗" status={(nd._runStatus || nd.status) as string} nodeType="mergeNode" nodeId={nodeId} selected={selected}>
        {/* Inputs: A and B (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "30%", transform: "translateY(-50%)" }}>A</span>
        <Handle type="target" position={Position.Left} id="input_a"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "30%", zIndex: 10 }} />

        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#06b6d4] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "60%", transform: "translateY(-50%)" }}>B</span>
        <Handle type="target" position={Position.Left} id="input_b"
          className="!border-[4px] !border-[#06b6d4]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "60%", zIndex: 10 }} />

        {/* Output: merged (right) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "45%", transform: "translateY(-50%)" }}>Merged</span>
        <Handle type="source" position={Position.Right} id="merged"
          className="!border-[4px] !border-[#34d399]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "45%", zIndex: 10 }} />

        <div className="rounded-lg bg-muted/20 border border-border/50 px-2 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">Menggabungkan input A dan B menjadi satu output</p>
        </div>
      </NodeShell>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   SET VARIABLE NODE — Stores a named variable
   ═══════════════════════════════════════════════════════════ */

export function SetVariableNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const varName = (nd.variableName as string) || "my_var"
  const varValue = (nd.variableValue as string) || ""

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Set Variable" icon="📌" status={(nd._runStatus || nd.status) as string} nodeType="setVariableNode" nodeId={nodeId} selected={selected}>
        {/* Input (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "40%", transform: "translateY(-50%)" }}>Value</span>
        <Handle type="target" position={Position.Left} id="value"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "40%", zIndex: 10 }} />

        {/* Output (right) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#34d399] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "40%", transform: "translateY(-50%)" }}>Output</span>
        <Handle type="source" position={Position.Right} id="output"
          className="!border-[4px] !border-[#34d399]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "40%", zIndex: 10 }} />

        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Nama variabel</label>
            <input value={varName} onChange={e => updateNodeData(nodeId, { variableName: e.target.value })}
              placeholder="my_var" className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-400/50" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Nilai (jika tidak terhubung)</label>
            <input value={varValue} onChange={e => updateNodeData(nodeId, { variableValue: e.target.value })}
              placeholder="Isi nilai..." className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-400/50" />
          </div>
        </div>
      </NodeShell>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   NOTE NODE — Non-functional sticky note
   ═══════════════════════════════════════════════════════════ */

export function NoteNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const noteText = (nd.noteText as string) || ""
  const noteColor = (nd.noteColor as string) || "yellow"

  const colors: Record<string, string> = {
    yellow: "bg-amber-500/10 border-amber-500/30",
    blue: "bg-blue-500/10 border-blue-500/30",
    green: "bg-emerald-500/10 border-emerald-500/30",
    pink: "bg-pink-500/10 border-pink-500/30",
    violet: "bg-violet-500/10 border-violet-500/30",
  }

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <div className={cn("workflow-note rounded-2xl border-2 border-dashed min-w-[200px] max-w-[300px] p-3 transition-all", colors[noteColor] || colors.yellow, selected && "ring-2 ring-violet-500/30")}>
        {/* Color dots */}
        <div className="flex items-center gap-1 mb-2">
          <StickyNoteIcon className="h-3.5 w-3.5 text-muted-foreground/50 mr-1" />
          {Object.keys(colors).map(c => (
            <button key={c} onClick={() => updateNodeData(nodeId, { noteColor: c })}
              className={cn("h-3 w-3 rounded-full border transition-transform", noteColor === c ? "scale-125 ring-1 ring-foreground/30" : "opacity-50 hover:opacity-100",
                c === "yellow" && "bg-amber-400", c === "blue" && "bg-blue-400", c === "green" && "bg-emerald-400", c === "pink" && "bg-pink-400", c === "violet" && "bg-violet-400"
              )} />
          ))}
        </div>
        <textarea
          value={noteText}
          onChange={e => updateNodeData(nodeId, { noteText: e.target.value })}
          placeholder="Tulis catatan..."
          rows={3}
          className="w-full bg-transparent text-[11px] text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   TEXT SPLITTER NODE — Splits text into array
   ═══════════════════════════════════════════════════════════ */

export function TextSplitterNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedText = useConnectedValue("text") as string | null
  const splitMode = (nd.splitMode as string) || "newline"
  const customDelimiter = (nd.customDelimiter as string) || ","
  const lastCount = nd._splitCount as number | undefined

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Text Splitter" icon="✂️" status={(nd._runStatus || nd.status) as string} nodeType="textSplitterNode" nodeId={nodeId} selected={selected}>
        {/* Input: text (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "40%", transform: "translateY(-50%)" }}>Text</span>
        <Handle type="target" position={Position.Left} id="text"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "40%", zIndex: 10 }} />

        {/* Output: items (right) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#8b5cf6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "40%", transform: "translateY(-50%)" }}>Items</span>
        <Handle type="source" position={Position.Right} id="items"
          className="!border-[4px] !border-[#8b5cf6]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "40%", zIndex: 10 }} />

        <div className="space-y-2">
          <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
            {[
              { id: "newline", label: "Per Baris" },
              { id: "comma", label: "Koma" },
              { id: "numbered", label: "Numbered" },
              { id: "custom", label: "Custom" },
            ].map(m => (
              <button key={m.id} onClick={() => updateNodeData(nodeId, { splitMode: m.id })}
                className={cn("flex-1 px-1.5 py-1 rounded-full text-[9px] font-medium transition", splitMode === m.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>{m.label}</button>
            ))}
          </div>

          {splitMode === "custom" && (
            <input value={customDelimiter} onChange={e => updateNodeData(nodeId, { customDelimiter: e.target.value })}
              placeholder="Delimiter..." className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1 text-[11px] font-mono text-foreground focus:outline-none" />
          )}

          {connectedText && (
            <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 px-2 py-1">
              <p className="text-[10px] text-muted-foreground truncate">&quot;{String(connectedText).slice(0, 60)}...&quot;</p>
            </div>
          )}

          {lastCount !== undefined && (
            <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-2 py-1">
              <p className="text-[10px] text-emerald-400">✓ {lastCount} item setelah split</p>
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   GEMINI / LLM NODE — AI Text Generation
   ═══════════════════════════════════════════════════════════ */

export function GeminiNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const nd = data as Record<string, unknown>
  const { updateNodeData, deleteElements } = useReactFlow()
  const connectedPrompt = useConnectedValue("prompt") as string | null
  const [localPrompt, setLocalPrompt] = useState((nd._localPrompt as string) || "")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activePrompt = connectedPrompt || localPrompt
  const resultText = nd._resultText as string | undefined
  const [showFull, setShowFull] = useState(false)

  const model = (nd.geminiModel as string) || "gemini"
  const temperature = (nd.temperature as number) ?? 0.7
  const maxTokens = (nd.maxTokens as number) || 1000
  const systemPrompt = (nd.systemPrompt as string) || ""

  const handleGenerate = async () => {
    if (!activePrompt.trim()) return
    setIsGenerating(true)
    setError(null)
    updateNodeData(nodeId, { status: "running", _resultText: undefined })

    try {
      const res = await fetch("/api/ai/gemini-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: activePrompt.trim(),
          systemPrompt: systemPrompt.trim() || undefined,
          model,
          temperature,
          maxTokens,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API error ${res.status}`)
      }

      const data = await res.json()
      const text = data.text || ""
      updateNodeData(nodeId, {
        status: "done",
        _resultText: text,
        prompt: text, // Output for downstream nodes
        selectedText: text,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal generate teks"
      setError(msg)
      updateNodeData(nodeId, { status: "error" })
    } finally {
      setIsGenerating(false)
    }
  }

  // Sync local prompt to node data
  useEffect(() => {
    if (!connectedPrompt) {
      updateNodeData(nodeId, { _localPrompt: localPrompt })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPrompt])

  return (
    <div className="relative group">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Gemini AI" icon="✨" status={(nd._runStatus || nd.status) as string} nodeType="geminiNode" nodeId={nodeId} selected={selected}>
        {/* Input: prompt (left) */}
        <span className={cn("absolute right-full mr-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "25%", transform: "translateY(-50%)" }}>Prompt</span>
        <Handle type="target" position={Position.Left} id="prompt"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", left: -8, top: "25%", zIndex: 10 }} />

        {/* Output: text (right) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#f472b6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "25%", transform: "translateY(-50%)" }}>Text</span>
        <Handle type="source" position={Position.Right} id="prompt"
          className="!border-[4px] !border-[#f472b6]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "25%", zIndex: 10 }} />

        {/* Output: items (for array output mode) */}
        <span className={cn("absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium text-[#8b5cf6] pointer-events-none select-none transition-opacity duration-200", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ top: "55%", transform: "translateY(-50%)" }}>Items</span>
        <Handle type="source" position={Position.Right} id="items"
          className="!border-[4px] !border-[#8b5cf6]"
          style={{ width: 16, height: 16, background: "var(--card)", right: -8, top: "55%", zIndex: 10 }} />

        <div className="space-y-2">
          {/* Model & Settings */}
          <div className="flex items-center gap-1.5">
            <select value={model} onChange={e => updateNodeData(nodeId, { geminiModel: e.target.value })}
              className="flex-1 rounded-lg border border-border bg-muted/20 px-2 py-1 text-[10px] text-foreground focus:outline-none">
              <option value="gemini">Gemini 2.0 Flash</option>
              <option value="openai">GPT-4o Mini</option>
            </select>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/20 px-1.5 py-1">
              <span className="text-[9px] text-muted-foreground">T:</span>
              <input type="number" min={0} max={2} step={0.1} value={temperature}
                onChange={e => updateNodeData(nodeId, { temperature: parseFloat(e.target.value) || 0.7 })}
                className="w-8 bg-transparent text-[10px] text-foreground text-center focus:outline-none" />
            </div>
          </div>

          {/* System prompt */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">System Prompt (opsional)</label>
            <textarea value={systemPrompt} onChange={e => updateNodeData(nodeId, { systemPrompt: e.target.value })}
              placeholder="Kamu adalah AI yang mencari berita viral..." rows={2}
              className="w-full rounded-xl border border-border bg-muted/20 px-2 py-1.5 text-[10px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 resize-none" />
          </div>

          {/* Prompt input */}
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Prompt</label>
            <textarea
              value={connectedPrompt || localPrompt}
              onChange={e => { if (!connectedPrompt) setLocalPrompt(e.target.value) }}
              readOnly={!!connectedPrompt}
              placeholder={connectedPrompt ? "Prompt dari node..." : "Cari 5 berita viral hari ini..."}
              rows={3}
              className={cn("w-full rounded-xl border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-violet-400/50 resize-none", connectedPrompt && "bg-pink-500/5 border-pink-500/20")}
            />
          </div>

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={!activePrompt.trim() || isGenerating}
            className={cn("w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-40",
              isGenerating ? "bg-muted/50 text-muted-foreground border border-border" : "bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 text-white shadow-sm hover:shadow-md")}>
            {isGenerating ? <><Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><SparklesIcon className="h-3.5 w-3.5" /> Generate Text</>}
          </button>

          <p className="text-[9px] text-muted-foreground/50 text-center">Membutuhkan 1 kredit</p>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1">
              <p className="text-[10px] text-red-400">{error}</p>
            </div>
          )}

          {/* Result preview */}
          {resultText && (
            <div className="rounded-xl bg-muted/20 border border-border p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground font-medium">Output:</span>
                <button onClick={() => setShowFull(!showFull)} className="text-[9px] text-violet-400 hover:text-violet-300">
                  {showFull ? "Tutup" : "Lihat semua"}
                </button>
              </div>
              <p className={cn("text-[10px] text-foreground/70 leading-relaxed whitespace-pre-wrap", !showFull && "line-clamp-4")}>
                {resultText}
              </p>
            </div>
          )}
        </div>
      </NodeShell>
    </div>
  )
}
