/**
 * useWorkflowHistory — Undo/Redo for workflow canvas
 * 
 * Stores snapshots of { nodes, edges } up to a configurable max.
 * Uses a simple stack approach with a pointer for undo/redo navigation.
 */

import { useState, useCallback, useRef } from "react"
import type { Node, Edge } from "@xyflow/react"

interface HistorySnapshot {
  nodes: Node[]
  edges: Edge[]
}

interface WorkflowHistory {
  pushState: (nodes: Node[], edges: Edge[]) => void
  undo: () => HistorySnapshot | null
  redo: () => HistorySnapshot | null
  canUndo: boolean
  canRedo: boolean
  clear: () => void
}

export function useWorkflowHistory(maxHistory = 30): WorkflowHistory {
  const historyRef = useRef<HistorySnapshot[]>([])
  const pointerRef = useRef(-1)
  const [, forceUpdate] = useState(0)

  const pushState = useCallback((nodes: Node[], edges: Edge[]) => {
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }

    // Discard any future states if we've undone
    const history = historyRef.current
    history.splice(pointerRef.current + 1)

    // Add new state
    history.push(snapshot)

    // Trim if exceeds max
    if (history.length > maxHistory) {
      history.shift()
    }

    pointerRef.current = history.length - 1
    forceUpdate(n => n + 1)
  }, [maxHistory])

  const undo = useCallback((): HistorySnapshot | null => {
    if (pointerRef.current <= 0) return null

    pointerRef.current -= 1
    const snapshot = historyRef.current[pointerRef.current]
    forceUpdate(n => n + 1)

    return snapshot ? {
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
    } : null
  }, [])

  const redo = useCallback((): HistorySnapshot | null => {
    if (pointerRef.current >= historyRef.current.length - 1) return null

    pointerRef.current += 1
    const snapshot = historyRef.current[pointerRef.current]
    forceUpdate(n => n + 1)

    return snapshot ? {
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
    } : null
  }, [])

  const clear = useCallback(() => {
    historyRef.current = []
    pointerRef.current = -1
    forceUpdate(n => n + 1)
  }, [])

  return {
    pushState,
    undo,
    redo,
    canUndo: pointerRef.current > 0,
    canRedo: pointerRef.current < historyRef.current.length - 1,
    clear,
  }
}
