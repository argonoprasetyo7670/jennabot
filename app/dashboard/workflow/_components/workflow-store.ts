/**
 * workflow-store.ts
 * localStorage CRUD for workflow management (max 3 per user).
 *
 * Template data is defined in:
 *   - template-registry.ts  → TEMPLATES catalog + getTemplateData()
 *   - template-builder.ts   → buildTemplate() + makeDualPromptTemplate()
 *   - templates/*.ts        → per-category template constants
 */

// ─── Re-export all public types ───────────────────────────────────────────────

export type { WorkflowData, SerializedNode, SerializedEdge } from "./workflow-types"
export type { TemplateRef, TemplateInfo, DualPromptConfig } from "./workflow-types"
export { STANDARD_REFS, TEMPLATES, getTemplateData, getTemplateCategories } from "./template-registry"

// ─── Internal imports ─────────────────────────────────────────────────────────

import type { WorkflowData } from "./workflow-types"
import { getTemplateData as _getTemplateData } from "./template-registry"

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY   = "jenna_workflows"
const MAX_WORKFLOWS = 3

export { MAX_WORKFLOWS }

// ─── ID Generator ────────────────────────────────────────────────────────────

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = "wf_"
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

function saveAll(workflows: WorkflowData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows))
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getWorkflows(): WorkflowData[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getWorkflow(id: string): WorkflowData | null {
  return getWorkflows().find(w => w.id === id) || null
}

export function canCreateWorkflow(): boolean {
  return getWorkflows().length < MAX_WORKFLOWS
}

export function getWorkflowCount(): number {
  return getWorkflows().length
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createWorkflow(
  name: string,
  template?: string,
  preloadedNodes?: Record<string, Record<string, unknown>>
): WorkflowData {
  const workflows = getWorkflows()
  if (workflows.length >= MAX_WORKFLOWS) {
    throw new Error(`Maksimal ${MAX_WORKFLOWS} workflow`)
  }

  const now = new Date().toISOString()
  const { nodes, edges } = _getTemplateData(template, preloadedNodes)

  const workflow: WorkflowData = {
    id: generateId(),
    name,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  }

  workflows.push(workflow)
  saveAll(workflows)
  return workflow
}

export function updateWorkflow(id: string, data: Partial<WorkflowData>): void {
  const workflows = getWorkflows()
  const idx = workflows.findIndex(w => w.id === id)
  if (idx === -1) throw new Error("Workflow tidak ditemukan")

  workflows[idx] = {
    ...workflows[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  saveAll(workflows)
}

export function deleteWorkflow(id: string): void {
  const workflows = getWorkflows().filter(w => w.id !== id)
  saveAll(workflows)
}

export function duplicateWorkflow(id: string): WorkflowData {
  const workflows = getWorkflows()
  if (workflows.length >= MAX_WORKFLOWS) {
    throw new Error(`Maksimal ${MAX_WORKFLOWS} workflow`)
  }

  const source = workflows.find(w => w.id === id)
  if (!source) throw new Error("Workflow tidak ditemukan")

  const now = new Date().toISOString()
  const duplicate: WorkflowData = {
    ...JSON.parse(JSON.stringify(source)),
    id: generateId(),
    name: `${source.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  }

  workflows.push(duplicate)
  saveAll(workflows)
  return duplicate
}
