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
  let value = (sourceNode.data as Record<string, unknown>)[key] ?? null

  // Intercept indexed image handles (e.g., from Image Gen's multi-outputs)
  const match = incomingEdge.sourceHandle?.match(/^image_(\d+)$/)
  const isSelectedImageHandle = incomingEdge.sourceHandle === "selectedImage"
  
  if (match || isSelectedImageHandle) {
    const idx = isSelectedImageHandle ? 0 : Number(match![1])
    const data = sourceNode.data as Record<string, unknown>
    if (key === "_selectedMediaId" || key === "mediaGenerationId") {
      const arr = data.mediaIds as string[]
      if (arr && arr[idx] !== undefined) value = arr[idx]
    } else if (key === "selectedImage" || key === "image") {
      const arr = data.images as string[]
      if (arr && arr[idx] !== undefined) value = arr[idx]
    } else if (key === "_selectedEmail" || key === "email") {
      const arr = data.emails as string[]
      if (arr && arr[idx] !== undefined) value = arr[idx]
    }
  }

  return value
}

/**
 * Collect values from ALL edges connected to a given targetHandle.
 * Used for multi-reference inputs where multiple Upload nodes wire into one handle.
 * Returns an array of { nodeId, value } objects — one per connected upstream node.
 */
export function useAllConnectedValues(
  targetHandle: string,
  sourceHandle?: string
): { nodeId: string; value: unknown; _uploadEmail?: unknown }[] {
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
      
      let value = (sourceNode.data as Record<string, unknown>)[key] ?? null
      let uploadEmail = sourceNode.data["_uploadEmail"] ?? null

      const match = e.sourceHandle?.match(/^image_(\d+)$/)
      const isSelectedImageHandle = e.sourceHandle === "selectedImage"
      
      if (match || isSelectedImageHandle) {
        const idx = isSelectedImageHandle ? 0 : Number(match![1])
        const data = sourceNode.data as Record<string, unknown>
        if (key === "_selectedMediaId" || key === "mediaGenerationId") {
          const arr = data.mediaIds as string[]
          if (arr && arr[idx] !== undefined) value = arr[idx]
        } else if (key === "selectedImage" || key === "image") {
          const arr = data.images as string[]
          if (arr && arr[idx] !== undefined) value = arr[idx]
        }
        const emailArr = data.emails as string[]
        if (emailArr && emailArr[idx] !== undefined) uploadEmail = emailArr[idx]
      }

      return { nodeId: e.source, value, _uploadEmail: uploadEmail }
    })
    .filter(Boolean) as { nodeId: string; value: unknown; _uploadEmail?: unknown }[]
}

/** Shorthand: read the "prompt" input from a connected Prompt node */
export function useConnectedPrompt(): string | null {
  return useConnectedValue("prompt") as string | null
}

