"use client"

import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { FileTextIcon } from "lucide-react"
import { NodeShell, NodeCloseBtn, HandleIcon, getPortColor } from "../node-shell"

export function PromptNodeComponent({ data, id: nodeId }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const nodeData = data as Record<string, unknown>
  const promptText = (nodeData.prompt as string) || ""
  return (
    <div className="relative">
      <NodeCloseBtn onClick={() => deleteElements({ nodes: [{ id: nodeId }] })} />
      <NodeShell label="Prompt" icon="📝" nodeType="promptNode" status={(nodeData._runStatus || nodeData.status) as string} nodeId={nodeId}>
        <textarea
          value={promptText}
          onChange={e => updateNodeData(nodeId, { prompt: e.target.value })}
          placeholder='Try &quot;A beautiful female animated character with a happy vibe.&quot;'
          rows={4}
          maxLength={10000}
          className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground/50">{promptText.length}/10000</span>
        </div>
        <HandleIcon icon={FileTextIcon} side="right" title="Output: Prompt text" />
        <Handle type="source" position={Position.Right} id="prompt"
          style={{ background: getPortColor("prompt"), width: 10, height: 10, border: "2px solid var(--background)" }} />
      </NodeShell>
    </div>
  )
}
