"use client"

import { useNodeId, useNodes, useEdges } from "@xyflow/react"

/** Read the value flowing into a target handle from the connected source node */
export function useConnectedValue(targetHandle: string, sourceHandle?: string): unknown {
  const nodeId = useNodeId()
  const nodes = useNodes()
  const edges = useEdges()
  if (!nodeId) return null
  const incomingEdge = edges.find(e => e.target === nodeId && e.targetHandle === targetHandle)
  if (!incomingEdge) return null
  const sourceNode = nodes.find(n => n.id === incomingEdge.source)
  if (!sourceNode) return null
  const key = sourceHandle || incomingEdge.sourceHandle || targetHandle
  return (sourceNode.data as Record<string, unknown>)[key] ?? null
}

/**
 * Collect values from ALL edges connected to a given targetHandle.
 * Used for multi-reference inputs where multiple Upload nodes wire into one handle.
 * Returns an array of { nodeId, value } objects — one per connected upstream node.
 */
export function useAllConnectedValues(
  targetHandle: string,
  sourceHandle?: string
): { nodeId: string; value: unknown }[] {
  const nodeId = useNodeId()
  const nodes = useNodes()
  const edges = useEdges()
  if (!nodeId) return []

  return edges
    .filter(e => e.target === nodeId && e.targetHandle === targetHandle)
    .map(e => {
      const sourceNode = nodes.find(n => n.id === e.source)
      if (!sourceNode) return null
      const key = sourceHandle || e.sourceHandle || targetHandle
      const value = (sourceNode.data as Record<string, unknown>)[key] ?? null
      return { nodeId: e.source, value }
    })
    .filter(Boolean) as { nodeId: string; value: unknown }[]
}

/** Shorthand: read the "prompt" input from a connected Prompt node */
export function useConnectedPrompt(): string | null {
  return useConnectedValue("prompt") as string | null
}

