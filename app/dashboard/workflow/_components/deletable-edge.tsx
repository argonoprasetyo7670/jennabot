"use client"

import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import { XIcon } from "lucide-react"

export function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd, style,
  selected,
}: EdgeProps) {
  const { deleteElements } = useReactFlow()

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {/* Clickable wider invisible stroke for easier selection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={12}
        stroke="transparent"
        style={{ cursor: "pointer" }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteElements({ edges: [{ id }] })
            }}
            className={`
              flex h-5 w-5 items-center justify-center rounded-full
              bg-card border border-border/80 shadow-sm
              text-muted-foreground hover:text-red-400 hover:border-red-400/50 hover:bg-red-500/10
              transition-all duration-150
              ${selected ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100"}
            `}
            style={{
              opacity: selected ? 1 : 0,
              transform: selected
                ? "translate(-50%, -50%) scale(1)"
                : "translate(-50%, -50%) scale(0.75)",
              transition: "opacity 0.15s, transform 0.15s",
            }}
            title="Putus koneksi"
          >
            <XIcon className="h-2.5 w-2.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
