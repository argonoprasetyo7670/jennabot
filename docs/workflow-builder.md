# AI Workflow Builder — Node-Based Visual Editor

> Fitur visual node-based workflow editor untuk menyusun alur kerja AI secara drag-and-drop.
> Terinspirasi dari ComfyUI, n8n, dan Make — dirancang untuk kreator & UMKM.

---

## 1. Overview

Workflow Builder memungkinkan user membuat **alur kerja AI otomatis** dengan menghubungkan node-node di canvas visual. Output dari satu node menjadi input node berikutnya, sehingga user tidak perlu bolak-balik antar halaman.

### Kenapa "Workflow" (bukan "Pipeline")?
- **Target user** adalah kreator/UMKM, bukan engineer — "Workflow" lebih approachable
- **Industry standard** — ComfyUI, n8n, Zapier, Make semua pakai "Workflow"
- **Scope lebih luas** — mendukung branching & looping di masa depan (pipeline = linear only)

### Contoh Workflow:
```
[Prompt] → [Image Generate] → [Video Generate] → [Save to Gallery]
```

### Library: `@xyflow/react` (React Flow v12+)
- Docs: https://reactflow.dev
- Sudah di-install via `yarn add @xyflow/react`

---

## 2. Halaman & Routing

| Path | Deskripsi |
|------|-----------|
| `/dashboard/workflow` | **Workflow List** — pilih, buat baru, atau hapus workflow |
| `/dashboard/workflow/[id]` | **Workflow Editor** — canvas editor untuk workflow tertentu |
| `/dashboard/workflow/new` | Redirect → buat workflow baru, redirect ke `/workflow/[newId]` |

### Workflow Management Rules
- Setiap user **maksimal 3 workflow** (limit bisa diubah di settings/config)
- Setiap workflow punya **id** (nanoid/cuid) dan **name** (user-defined)
- Workflow baru dibuat dari blank canvas atau dari template
- Workflow bisa di-rename, duplicate (jika slot tersedia), dan delete

### Sidebar Entry
Tambahkan di `components/app-sidebar.tsx` sebagai item baru:
```tsx
{
  title: "Workflow Builder",
  url: "/dashboard/workflow",
  icon: <GitMergeIcon className="h-4 w-4" />,
  type: "link",
},
```
Letakkan setelah "Gallery" dan sebelum "Admin Panel".

---

## 3. Arsitektur & File Structure

```
app/dashboard/workflow/
├── page.tsx                    # Workflow List page (pilih/buat/hapus)
├── [id]/
│   └── page.tsx                # Workflow Editor (canvas + sidebar)
├── new/
│   └── page.tsx                # Create new workflow → redirect ke /[id]
└── _components/
    ├── workflow-list.tsx        # Grid card list of user's workflows
    ├── workflow-card.tsx        # Single workflow card (name, preview, actions)
    ├── workflow-canvas.tsx      # ReactFlow canvas wrapper
    ├── workflow-sidebar.tsx     # Node palette (drag source)
    ├── workflow-toolbar.tsx     # Top toolbar (run, save, clear, dll)
    ├── workflow-runner.tsx      # Execution engine
    ├── workflow-store.ts        # localStorage CRUD for workflows
    └── nodes/
        ├── prompt-node.tsx      # Text input node
        ├── image-gen-node.tsx   # Image generation node
        ├── video-gen-node.tsx   # Video generation node
        ├── gallery-node.tsx     # Save to gallery node
        ├── output-node.tsx      # Preview/output node
        └── index.ts             # Node type registry
```

---

## 4. Node Types

### 4.1 Prompt Node
- **Tipe:** `promptNode`
- **Input Ports:** Tidak ada
- **Output Ports:** `prompt` (string)
- **UI:** Textarea untuk menulis prompt + character counter
- **Fungsi:** Menyediakan teks prompt sebagai input workflow
- **Behavior:** Editable saat workflow idle, locked saat running

### 4.2 Image Generate Node
- **Tipe:** `imageGenNode`
- **Input Ports:** `prompt` (string), `references` (string[] | optional)
- **Output Ports:** `images` (string[]), `selectedImage` (string)
- **UI:** Model selector, aspect ratio, count, thumbnail preview saat done
- **Fungsi:** Memanggil `/api/ai/image-generate` via `generateImages()`
- **Credit Cost:** 5 per gambar
- **Available Models:**

| Model ID | Name | Max References |
|----------|------|----------------|
| `imagen-4` | Imagen 4 | 3 |
| `nano-banana-2` | Nano Banana 2 | 10 |
| `nano-banana-pro` | Nano Banana Pro | 10 |

### 4.3 Video Generate Node
- **Tipe:** `videoGenNode`
- **Input Ports:** `prompt` (string), `startImage` (string | optional)
- **Output Ports:** `videos` (string[]), `selectedVideo` (string)
- **UI:** Model selector, aspect ratio, duration selector, video preview saat done
- **Fungsi:** Memanggil `/api/ai/video-generate` via async polling
- **Credit Cost:** 20 per video
- **Note:** Async polling — node akan menunjukkan progress bar selama menunggu

### 4.4 Save to Gallery Node
- **Tipe:** `galleryNode`
- **Input Ports:** `media` (string) — URL gambar/video
- **Output Ports:** Tidak ada
- **UI:** Status indicator (saved/pending/error) + link ke gallery
- **Fungsi:** Memanggil `/api/gallery/save`

### 4.5 Output/Preview Node
- **Tipe:** `outputNode`
- **Input Ports:** `media` (string) — URL gambar/video
- **Output Ports:** Tidak ada
- **UI:** Preview gambar/video di dalam node + download button
- **Fungsi:** Menampilkan hasil akhir workflow

---

## 5. Data Flow & Port System

### Port Types
```typescript
type PortType = "string" | "string[]" | "image" | "video" | "media"
```

### Port Compatibility Matrix
| Output Type | Compatible Input Types |
|------------|----------------------|
| `string`   | `string`, `prompt`   |
| `string[]` | `string[]`, `references` |
| `image`    | `media`, `startImage`, `image` |
| `video`    | `media`, `video` |

### Edge Validation
Saat user menghubungkan dua node, validasi:
1. Output port type harus kompatibel dengan input port type
2. Satu input port hanya bisa menerima satu koneksi
3. Tidak boleh ada cycle (DAG only)
4. Visual feedback: edge berwarna hijau (valid) atau merah (invalid) saat dragging

---

## 6. Execution Engine

### 6.1 Topological Sort
Workflow dieksekusi berurutan berdasarkan topological sort:
1. Temukan semua node tanpa input (root nodes)
2. Eksekusi root nodes → hasilkan output
3. Propagate output ke connected nodes
4. Ulangi sampai semua node selesai
5. Jika ada error → stop execution, highlight error node

### 6.2 Execution Flow
```typescript
interface NodeExecution {
  nodeId: string
  status: "pending" | "running" | "done" | "error" | "skipped"
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  error?: string
  startedAt?: number
  completedAt?: number
}

async function executeWorkflow(nodes, edges): Promise<NodeExecution[]> {
  // 1. Pre-flight: check total credit cost
  const totalCost = estimateCreditCost(nodes)
  const balance = await fetchCreditBalance()
  if (balance < totalCost) throw new InsufficientCreditsError(totalCost, balance)

  // 2. Topological sort
  const sorted = topologicalSort(nodes, edges)

  // 3. Execute in order
  const results: Record<string, NodeExecution> = {}

  for (const nodeId of sorted) {
    const node = nodes.find(n => n.id === nodeId)

    // Gather inputs from connected upstream nodes
    const inputs = gatherInputs(nodeId, edges, results)

    // Execute node (with per-node credit deduction)
    results[nodeId] = await executeNode(node, inputs)

    // Stop on error
    if (results[nodeId].status === "error") break
  }

  return Object.values(results)
}
```

### 6.3 Node Executor Registry
```typescript
const executors: Record<string, NodeExecutor> = {
  promptNode: async (node, inputs) => {
    return { prompt: node.data.prompt }
  },

  imageGenNode: async (node, inputs) => {
    const result = await generateImages({
      prompt: inputs.prompt,
      model: node.data.model,
      aspectRatio: node.data.aspectRatio,
      count: node.data.count,
      references: inputs.references,
    })
    return {
      images: result.images.map(i => i.url),
      selectedImage: result.images[0]?.url,
    }
  },

  videoGenNode: async (node, inputs) => {
    const result = await generateVideos({
      prompt: inputs.prompt,
      model: node.data.model,
      startImage: inputs.startImage,
    })
    return {
      videos: result.videos.map(v => v.url),
      selectedVideo: result.videos[0]?.url,
    }
  },

  galleryNode: async (node, inputs) => {
    await fetch("/api/gallery/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: inputs.media }),
    })
    return { saved: true }
  },

  outputNode: async (node, inputs) => {
    return { media: inputs.media }
  },
}
```

### 6.4 Credit Estimation
```typescript
function estimateCreditCost(nodes: Node[]): number {
  let total = 0
  for (const node of nodes) {
    if (node.type === "imageGenNode") total += 5 * (node.data.count || 1)
    if (node.type === "videoGenNode") total += 20
  }
  return total
}
```
Tampilkan estimasi di toolbar sebelum user klik Run: `"Estimasi: 25 kredit"`

---

## 7. Workflow Management & Serialization

### 7.1 Workflow Data Model
```typescript
interface WorkflowData {
  id: string              // nanoid, e.g. "wf_a1b2c3d4"
  name: string            // user-defined, e.g. "Product Review Flow"
  description?: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  viewport: { x: number; y: number; zoom: number }
  createdAt: string       // ISO timestamp
  updatedAt: string       // ISO timestamp
}

interface SerializedNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>  // node-specific config
}

interface SerializedEdge {
  id: string
  source: string
  target: string
  sourceHandle: string  // output port name
  targetHandle: string  // input port name
}
```

### 7.2 Workflow Store (`_components/workflow-store.ts`)
```typescript
const STORAGE_KEY = "jenna_workflows"
const MAX_WORKFLOWS = 3

function getWorkflows(): WorkflowData[]
function getWorkflow(id: string): WorkflowData | null
function createWorkflow(name: string, template?: string): WorkflowData  // throws if >= MAX
function updateWorkflow(id: string, data: Partial<WorkflowData>): void
function deleteWorkflow(id: string): void
function duplicateWorkflow(id: string): WorkflowData  // throws if >= MAX
function canCreateWorkflow(): boolean  // getWorkflows().length < MAX
function getWorkflowCount(): number
```

### 7.3 Workflow List Page (`/dashboard/workflow`)
User melihat grid of workflow cards + tombol "Buat Workflow Baru".

**State:**
- Jika 0 workflow → empty state dengan CTA "Buat Workflow Pertama" + template suggestions
- Jika 1-2 workflow → grid cards + tombol "+ Buat Baru"
- Jika 3 workflow → grid cards, tombol "+ Buat Baru" disabled dengan tooltip "Maksimal 3 workflow"

**Workflow Card UI:**
```
┌─────────────────────────┐
│ 🔗 Product Review Flow  │  ← nama workflow (editable on click)
│                         │
│  [Prompt]→[Image]→[Vid] │  ← mini preview (simplified node graph)
│                         │
│ Diubah 2 jam lalu       │  ← relative timestamp
│                         │
│ [✏️ Edit] [📋 Duplikat] [🗑️] │  ← action buttons
└─────────────────────────┘
```

### 7.4 Buat Workflow Baru
Saat klik "+ Buat Baru":
1. Dialog muncul: input nama + pilih template (atau "Kosong")
2. `createWorkflow(name, template)` → generate ID
3. Redirect ke `/dashboard/workflow/[newId]`

Template options:
- **Kosong** — canvas kosong
- **Image to Video** — Prompt → Image → Video → Output
- **Product Review** — Prompt → Image (x4) → Video → Gallery → Output

### 7.5 Storage
- **Phase 1:** `localStorage` key `jenna_workflows` (JSON array of `WorkflowData[]`)
- **Phase 2:** Database table `workflows` (userId, name, config JSON, max 3 per user enforced server-side)

---

## 8. UI/UX Design

### 8.1 Workflow List Layout (`/dashboard/workflow`)
```
┌──────────────────────────────────────────────────────┐
│ DashboardHeader (Workflow Builder)                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Workflow Saya (2/3)              [+ Buat Baru]      │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌ ─ ─ ─ ─ ─ ┐         │
│  │ Product  │  │ Image to │  │  + Buat    │         │
│  │ Review   │  │ Video    │  │  Workflow  │         │
│  │ Flow     │  │          │  │  Baru      │         │
│  │          │  │          │  │            │         │
│  │ 2j lalu  │  │ 5h lalu  │  └ ─ ─ ─ ─ ─ ┘         │
│  └──────────┘  └──────────┘                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 8.2 Workflow Editor Layout (`/dashboard/workflow/[id]`)
```
┌──────────────────────────────────────────────────────┐
│ DashboardHeader (Workflow Builder > "Flow Name")     │
├──────────┬───────────────────────────────────────────┤
│ Node     │ Toolbar: [← Back] [▶ Run] [💾 Save] [🗑] │
│ Palette  ├───────────────────────────────────────────┤
│          │                                           │
│ ─────    │          ReactFlow Canvas                 │
│ 📝 Prompt│                                           │
│ 🖼️ Image │  [Prompt] ──→ [Image Gen] ──→ [Output]   │
│ 🎬 Video │                                           │
│ 💾 Save  │                                           │
│ 👁️ Output│                                           │
│          │                                           │
└──────────┴───────────────────────────────────────────┘
```

### 8.2 Node Visual Style
- Background: `var(--surface)` with glassmorphism blur
- Border: gradient border (violet → blue → cyan) via `border-gradient` class
- Port dots: colored by type (violet=string, blue=image, cyan=video)
- Header: node type icon + label, dark header bar
- **States:**
  - `idle` — default style
  - `running` — pulsing violet glow animation
  - `done` — green border + checkmark badge
  - `error` — red border + error message tooltip

### 8.3 Warna Port
| Port Type | Warna | Hex |
|-----------|-------|-----|
| string/prompt | Violet | `#8b5cf6` |
| image | Blue | `#3b82f6` |
| video | Cyan | `#06b6d4` |
| media (any) | Emerald | `#10b981` |

### 8.4 Edge Style
- Default: animated dashed line, warna mengikuti port type
- Running: solid animated flow (marching ants effect)
- Error: merah putus-putus

### 8.5 Interaksi
- **Drag from palette** → drop on canvas → create node
- **Drag from port** → connect to compatible port (with visual validation)
- **Double-click node** → expand/edit settings
- **Right-click node** → context menu (duplicate, delete, disconnect)
- **Scroll** → zoom in/out
- **Drag canvas** → pan
- **Minimap** → bottom-right corner untuk navigasi canvas besar

---

## 9. Integrasi dengan Existing System

### 9.1 GenerationQueue
Workflow Runner menggunakan `GenerationQueue` context untuk tracking job:
- Setiap node yang melakukan generate akan membuat job di queue
- User bisa lihat progress di bell icon (header)
- Job label: `"Workflow: {workflowName} — {nodeName}"`

### 9.2 Credits
- Setiap node yang consume API akan deduct credits secara atomic (server-side)
- Total estimasi credit ditampilkan di toolbar sebelum run
- Credit check dilakukan **sebelum** eksekusi dimulai (pre-flight check)
- Jika credit tidak cukup → tampilkan dialog dengan link ke Buy Credits

### 9.3 Gallery Integration
- Output node bisa langsung save ke gallery via Gallery Node
- Gallery items bisa di-drag ke canvas sebagai input reference (future)

### 9.4 Existing API Reuse
| Fungsi | Source | Dipakai oleh Node |
|--------|--------|--------------------|
| `generateImages()` | `lib/api/google-flow.ts` | ImageGenNode |
| `generateVideos()` | `lib/api/google-flow.ts` | VideoGenNode |
| `/api/gallery/save` | `app/api/gallery/save/` | GalleryNode |
| `/api/credits/balance` | `app/api/credits/balance/` | Pre-flight check |

---

## 10. Implementation Phases

### Phase 1: Core Canvas (MVP)
- [x] Install `@xyflow/react`
- [ ] Buat halaman `/dashboard/workflow`
- [ ] Implement WorkflowCanvas dengan ReactFlow
- [ ] Implement NodePalette (sidebar drag source)
- [ ] Buat PromptNode & OutputNode
- [ ] Basic edge connection & validation
- [ ] Sidebar nav entry
- [ ] Dark/light theme support

### Phase 2: AI Nodes
- [ ] Implement ImageGenNode (integrate with existing API)
- [ ] Implement VideoGenNode (integrate with existing API)
- [ ] Implement GalleryNode (save to gallery)
- [ ] Execution engine (topological sort + sequential run)
- [ ] Run button + progress indicators per node
- [ ] Credit estimation & pre-flight check

### Phase 3: Save/Load & Polish
- [ ] Serialize/deserialize workflow ke localStorage
- [ ] Preset templates (Image→Video, Product Review, dll)
- [ ] Error handling & retry per node
- [ ] Minimap & keyboard shortcuts
- [ ] Mobile responsive layout (read-only view on mobile)

### Phase 4: Advanced (Future)
- [ ] Database storage for workflows (`workflows` table)
- [ ] Share workflow via link
- [ ] Conditional branching nodes (if/else)
- [ ] Loop/batch nodes (process multiple items)
- [ ] Custom node builder
- [ ] Webhook trigger nodes
- [ ] Schedule/cron trigger

---

## 11. CSS Classes

Tambahkan di `globals.css`:
```css
/* Workflow Builder */
.workflow-node {
  background: var(--surface);
  border: 1px solid var(--border);
  backdrop-filter: blur(16px);
  border-radius: 12px;
  min-width: 220px;
  transition: all 0.3s ease;
}
.workflow-node:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-card);
}
.workflow-node.running {
  border-color: var(--accent-violet);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  animation: node-pulse 2s ease-in-out infinite;
}
.workflow-node.done {
  border-color: var(--emerald);
}
.workflow-node.error {
  border-color: #ef4444;
}
@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.5); }
}

.port-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg);
  transition: all 0.2s ease;
}
.port-dot:hover {
  transform: scale(1.3);
}
.port-dot.compatible {
  animation: port-glow 1s ease-in-out infinite;
}
@keyframes port-glow {
  0%, 100% { box-shadow: 0 0 4px currentColor; }
  50% { box-shadow: 0 0 12px currentColor; }
}
```

---

## 12. Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@xyflow/react` | latest | Node-based canvas editor |
| Existing: `generateImages` | — | `lib/api/google-flow.ts` |
| Existing: `generateVideos` | — | `lib/api/google-flow.ts` |
| Existing: `GenerationQueue` | — | `contexts/generation-queue.tsx` |

---

## 13. Template Workflows

### 13.1 Image to Video
```json
{
  "name": "Image to Video",
  "description": "Generate gambar lalu buat video dari hasilnya",
  "nodes": [
    { "type": "promptNode", "data": { "prompt": "" } },
    { "type": "imageGenNode", "data": { "model": "imagen-4" } },
    { "type": "videoGenNode", "data": { "model": "veo-3.1-fast" } },
    { "type": "outputNode" }
  ],
  "edges": [
    { "source": "prompt", "target": "imageGen", "sourceHandle": "prompt", "targetHandle": "prompt" },
    { "source": "imageGen", "target": "videoGen", "sourceHandle": "selectedImage", "targetHandle": "startImage" },
    { "source": "prompt", "target": "videoGen", "sourceHandle": "prompt", "targetHandle": "prompt" },
    { "source": "videoGen", "target": "output", "sourceHandle": "selectedVideo", "targetHandle": "media" }
  ]
}
```

### 13.2 Product Review
```json
{
  "name": "Product Review",
  "description": "Buat foto produk profesional lalu jadikan video review",
  "nodes": [
    { "type": "promptNode", "data": { "prompt": "Foto produk profesional..." } },
    { "type": "imageGenNode", "data": { "model": "nano-banana-2", "count": 4 } },
    { "type": "videoGenNode", "data": { "model": "veo-3.1-fast" } },
    { "type": "galleryNode" },
    { "type": "outputNode" }
  ]
}
```

### 13.3 Batch Image Generation (Future)
```json
{
  "name": "Batch Image",
  "description": "Generate multiple gambar dengan variasi prompt",
  "nodes": [
    { "type": "promptNode", "data": { "prompt": "Produk skincare, {angle}" } },
    { "type": "loopNode", "data": { "variable": "angle", "values": ["front", "side", "top"] } },
    { "type": "imageGenNode", "data": { "model": "imagen-4" } },
    { "type": "galleryNode" }
  ]
}
```
