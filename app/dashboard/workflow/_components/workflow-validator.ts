/**
 * Workflow Validator — Pre-run validation
 * 
 * Checks for common issues before executing a workflow:
 * - Circular dependencies
 * - Missing required inputs
 * - Orphan nodes (no connections)
 * - Empty prompts
 */

import type { Node, Edge } from "@xyflow/react"

export interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

/* ─── Detect cycles using DFS ─── */

function hasCycle(nodes: Node[], edges: Edge[]): boolean {
  const nodeIds = new Set(nodes.map(n => n.id))
  const adjList = new Map<string, string[]>()

  for (const id of nodeIds) {
    adjList.set(id, [])
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjList.get(edge.source)!.push(edge.target)
    }
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    inStack.add(nodeId)

    for (const neighbor of adjList.get(nodeId) || []) {
      if (inStack.has(neighbor)) return true // Cycle found
      if (!visited.has(neighbor) && dfs(neighbor)) return true
    }

    inStack.delete(nodeId)
    return false
  }

  for (const id of nodeIds) {
    if (!visited.has(id) && dfs(id)) return true
  }

  return false
}

/* ─── Node type requirements ─── */

const REQUIRED_INPUTS: Record<string, string[]> = {
  imageGenNode: ["prompt"], // Prompt can come from connection OR local
  videoGenNode: ["prompt"],
  galleryNode: ["media"],
  extendVideoNode: ["video"],
  extractFrameNode: ["video"],
}

const NODES_WITH_PROMPT: string[] = ["imageGenNode", "videoGenNode"]

/* ─── Main Validator ─── */

export function validateWorkflow(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  if (nodes.length === 0) {
    errors.push("Workflow kosong — tambahkan node terlebih dahulu")
    return { valid: false, warnings, errors }
  }

  // 1. Check for circular dependencies
  if (hasCycle(nodes, edges)) {
    errors.push("Workflow memiliki circular dependency (loop). Hapus koneksi yang membentuk siklus.")
    return { valid: false, warnings, errors }
  }

  // 2. Check each node
  for (const node of nodes) {
    const nd = node.data as Record<string, unknown>
    const nodeType = node.type || ""
    const nodeLabel = nodeType.replace("Node", "").replace(/([A-Z])/g, " $1").trim()

    // Check if node has incoming edges
    const incomingEdges = edges.filter(e => e.target === node.id)
    const outgoingEdges = edges.filter(e => e.source === node.id)
    const isOrphan = incomingEdges.length === 0 && outgoingEdges.length === 0
    
    if (isOrphan && nodeType !== "promptNode" && nodeType !== "uploadNode") {
      warnings.push(`"${nodeLabel}" (${node.id}) tidak terhubung ke node lain`)
    }

    // Check for required inputs
    const requiredInputs = REQUIRED_INPUTS[nodeType] || []
    for (const input of requiredInputs) {
      const hasConnection = incomingEdges.some(e => e.targetHandle === input)
      
      // For prompt: check if local prompt exists when no connection
      if (input === "prompt" && !hasConnection) {
        const localPrompt = (nd._localPrompt as string) || (nd.prompt as string) || ""
        if (!localPrompt.trim()) {
          errors.push(`"${nodeLabel}" membutuhkan prompt — hubungkan Prompt Node atau isi prompt manual`)
        }
      } else if (input !== "prompt" && !hasConnection) {
        // For non-prompt inputs, connection is required
        // Only error for gallery/extend if they're supposed to receive data
        if (nodeType === "galleryNode" || nodeType === "extendVideoNode" || nodeType === "extractFrameNode") {
          errors.push(`"${nodeLabel}" membutuhkan input "${input}" — hubungkan ke node yang sesuai`)
        }
      }
    }

    // Check for empty prompts on prompt nodes
    if (nodeType === "promptNode") {
      const prompt = (nd.prompt as string) || ""
      if (!prompt.trim()) {
        // Only warn if this prompt node is connected to something
        if (outgoingEdges.length > 0) {
          warnings.push(`Prompt Node (${node.id}) kosong — pastikan diisi sebelum run`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}
