"use client"

import { Handle, Position, useReactFlow } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { MoreHorizontalIcon, CopyIcon, TrashIcon, PencilIcon, UsersIcon, Loader2Icon } from "lucide-react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getPortColor } from "../node-shell"
import { getCharactersAndVoices } from "@/app/dashboard/characters/actions"

/* ─── Types ─── */

interface CharacterItem {
  id: string
  characterRefId: string
  displayName: string
  imageUrl1?: string | null
  imageUrl2?: string | null
}

interface PromptNodeData {
  prompt?: string
  title?: string
  _selectedCharacters?: CharacterItem[]
}

/* ─── Constants ─── */

const MENTION_REGEX = /(\s|^)(@[^ ]*)$/
const MIN_TEXTAREA_HEIGHT = 140
const DEBOUNCE_MS = 300
const PROMPT_PORT_COLOR = getPortColor("prompt")

/** Measure caret pixel position inside a textarea using a mirror div */
function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const mirror = document.createElement("div")
  const style = getComputedStyle(textarea)

  // Copy relevant styles so the mirror matches the textarea's text layout
  const props = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
    "textTransform", "wordSpacing", "lineHeight", "paddingTop", "paddingRight",
    "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth",
    "borderBottomWidth", "borderLeftWidth", "boxSizing", "whiteSpace",
    "wordWrap", "overflowWrap", "tabSize",
  ] as const
  for (const prop of props) {
    mirror.style[prop as unknown as number] = style[prop]
  }
  mirror.style.position = "absolute"
  mirror.style.top = "-9999px"
  mirror.style.left = "-9999px"
  mirror.style.visibility = "hidden"
  mirror.style.overflow = "hidden"
  mirror.style.width = `${textarea.clientWidth}px`
  mirror.style.whiteSpace = "pre-wrap"
  mirror.style.wordBreak = "break-word"

  // Text up to the caret
  const textBefore = textarea.value.slice(0, position)
  const textNode = document.createTextNode(textBefore)
  mirror.appendChild(textNode)

  // Marker span at caret position
  const marker = document.createElement("span")
  marker.textContent = "|"
  mirror.appendChild(marker)

  document.body.appendChild(mirror)
  const top = marker.offsetTop - textarea.scrollTop
  const left = marker.offsetLeft
  document.body.removeChild(mirror)

  return { top, left }
}

/* ─── Component ─── */

export function PromptNodeComponent({ data, id: nodeId, selected }: NodeProps) {
  const { updateNodeData, deleteElements, getNodes, setNodes } = useReactFlow()
  const nodeData = data as PromptNodeData
  const promptText = nodeData.prompt ?? ""
  const title = nodeData.title ?? "Prompt"
  const selectedCharacters = nodeData._selectedCharacters ?? []

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [localPrompt, setLocalPrompt] = useState(promptText)
  const menuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLocalChange = useRef(false)

  // Sync external changes (e.g. undo, workflow load) — skip if we initiated the change
  useEffect(() => {
    if (isLocalChange.current) {
      isLocalChange.current = false
      return
    }
    if (promptText !== localPrompt) {
      setLocalPrompt(promptText)
    }
    // Only react to external promptText changes, NOT localPrompt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptText])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const [mentionSearch, setMentionSearch] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [characterList, setCharacterList] = useState<CharacterItem[]>([])
  const [characterLoading, setCharacterLoading] = useState(false)
  const charactersFetched = useRef(false)

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

  const filteredCharacters = useMemo(() => {
    if (mentionSearch === null) return []
    return characterList.filter(c =>
      c.displayName.toLowerCase().includes(mentionSearch)
    )
  }, [mentionSearch, characterList])

  /** Flush local prompt to React Flow (debounced for normal typing, immediate for mentions) */
  const flushToNode = useCallback((newPrompt: string, chars: CharacterItem[], immediate = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const doUpdate = () => {
      isLocalChange.current = true
      updateNodeData(nodeId, { prompt: newPrompt, _selectedCharacters: chars })
    }

    if (immediate) {
      doUpdate()
    } else {
      debounceRef.current = setTimeout(doUpdate, DEBOUNCE_MS)
    }
  }, [updateNodeData, nodeId])

  const selectMention = useCallback((char: CharacterItem) => {
    if (!textareaRef.current) return
    const cursor = textareaRef.current.selectionStart
    const textBeforeCursor = localPrompt.slice(0, cursor)
    const textAfterCursor = localPrompt.slice(cursor)

    const match = textBeforeCursor.match(MENTION_REGEX)
    if (match) {
      const typedMention = match[2]
      const mentionStart = cursor - typedMention.length
      const newPrompt = localPrompt.slice(0, mentionStart) + `@${char.displayName} ` + textAfterCursor

      const newChars = selectedCharacters.some(c => c.characterRefId === char.characterRefId)
        ? selectedCharacters
        : [...selectedCharacters, char]

      setLocalPrompt(newPrompt)
      flushToNode(newPrompt, newChars, true)
    }

    setMentionSearch(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [localPrompt, selectedCharacters, flushToNode])

  // Auto-resize textarea (single reflow per change)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0"
    el.style.height = `${Math.max(MIN_TEXTAREA_HEIGHT, el.scrollHeight)}px`
  }, [localPrompt])

  /** Memoized highlighted prompt text with @mention styling */
  const renderedPromptText = useMemo(() => {
    if (!localPrompt) {
      return <span className="text-muted-foreground/50">Try &quot;A beautiful female animated character with a happy vibe.&quot;</span>
    }

    // Sort by name length descending so longest names match first
    const sortedChars = [...selectedCharacters].sort((a, b) => b.displayName.length - a.displayName.length)
    let result: React.ReactNode[] = [localPrompt]

    for (const char of sortedChars) {
      const mentionStr = `@${char.displayName}`
      const newResult: React.ReactNode[] = []

      for (let chunkIdx = 0; chunkIdx < result.length; chunkIdx++) {
        const chunk = result[chunkIdx]
        if (typeof chunk !== "string") {
          newResult.push(chunk)
          continue
        }
        const parts = chunk.split(mentionStr)
        for (let partIdx = 0; partIdx < parts.length; partIdx++) {
          if (parts[partIdx]) newResult.push(parts[partIdx])
          if (partIdx < parts.length - 1) {
            newResult.push(
              <span
                key={`mention-${char.characterRefId}-${chunkIdx}-${partIdx}`}
                className="relative text-violet-400 font-bold bg-violet-500/10 rounded-sm"
              >
                {mentionStr}
              </span>
            )
          }
        }
      }
      result = newResult
    }

    return result
  }, [localPrompt, selectedCharacters])

  /** Fetch characters once (lazy, on first @mention) */
  const fetchCharactersOnce = useCallback(() => {
    if (charactersFetched.current || characterLoading) return
    charactersFetched.current = true
    setCharacterLoading(true)

    let cancelled = false
    getCharactersAndVoices()
      .then(res => {
        if (!cancelled) {
          setCharacterList(res.characters as CharacterItem[])
        }
      })
      .catch(err => {
        console.warn("[PromptNode] Failed to fetch characters:", err)
        charactersFetched.current = false // allow retry on error
      })
      .finally(() => {
        if (!cancelled) setCharacterLoading(false)
      })

    // Return cleanup so callers could cancel if needed
    return () => { cancelled = true }
  }, [characterLoading])

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setLocalPrompt(val)

    // Keep only characters whose mention is still in the prompt
    const newSelectedCharacters = selectedCharacters.filter(char =>
      val.includes(`@${char.displayName}`)
    )

    // Debounced flush to React Flow
    flushToNode(val, newSelectedCharacters)

    // Check for @mention trigger
    const cursor = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(MENTION_REGEX)

    if (match) {
      setMentionSearch(match[2].slice(1).toLowerCase())
      setMentionIndex(0)
      fetchCharactersOnce()
      // Compute caret position for dropdown placement
      if (textareaRef.current) {
        const coords = getCaretCoordinates(textareaRef.current, cursor)
        setMentionPos(coords)
      }
    } else {
      setMentionSearch(null)
    }
  }, [selectedCharacters, flushToNode, fetchCharactersOnce])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSearch === null || filteredCharacters.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setMentionIndex(i => (i + 1) % filteredCharacters.length)
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setMentionIndex(i => (i - 1 + filteredCharacters.length) % filteredCharacters.length)
      return
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      selectMention(filteredCharacters[mentionIndex])
      return
    }
    if (e.key === "Escape") {
      setMentionSearch(null)
    }
  }, [mentionSearch, filteredCharacters, mentionIndex, selectMention])

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

  // Flush pending debounced update on blur so data is saved before navigating away
  const handleBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      isLocalChange.current = true
      const chars = selectedCharacters.filter(char =>
        localPrompt.includes(`@${char.displayName}`)
      )
      updateNodeData(nodeId, { prompt: localPrompt, _selectedCharacters: chars })
    }
  }, [localPrompt, selectedCharacters, updateNodeData, nodeId])

  return (
    <div className={cn(
      "group relative min-w-[360px] max-w-[420px] rounded-2xl border bg-card transition-all font-sans",
      selected
        ? "border-violet-500/80 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30"
        : "border-border/60 shadow-sm hover:border-border hover:shadow-md"
    )}>
      {/* ─── Right Handle: Prompt ─── */}
      <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex items-center justify-start">
        <span
          className={cn(
            "absolute left-full ml-5 whitespace-nowrap text-[10px] font-medium pointer-events-none select-none transition-opacity duration-200",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          style={{ top: "50%", transform: "translateY(-50%)", color: PROMPT_PORT_COLOR }}
        >
          Prompt
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
        className="!border-[4px]"
        style={{
          background: "var(--card)",
          borderColor: PROMPT_PORT_COLOR,
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
      <div className="mx-2 mb-2 rounded-xl bg-muted/40 p-4 border border-border/50 relative">
        <div className="relative w-full min-h-[140px]">
          {/* Overlay for highlighted @mentions */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none whitespace-pre-wrap break-words text-[13px] leading-relaxed z-0"
            aria-hidden="true"
          >
            {renderedPromptText}
          </div>

          <textarea
            ref={textareaRef}
            value={localPrompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            spellCheck={false}
            className="nodrag block w-full h-full min-h-[140px] bg-transparent text-[13px] leading-relaxed resize-none focus:outline-none overflow-hidden relative z-10"
            style={{ color: "transparent", caretColor: "var(--fg)" }}
          />

          {/* ─── Mention dropdown (positioned near caret) ─── */}
          {mentionSearch !== null && (filteredCharacters.length > 0 || characterLoading) && (
            <div
              className="absolute w-64 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl z-50"
              style={{ top: mentionPos.top + 22, left: Math.min(mentionPos.left, 100) }}
            >
              {characterLoading && filteredCharacters.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                filteredCharacters.map((char, i) => (
                  <button
                    key={char.characterRefId}
                    onMouseDown={(e) => { e.preventDefault(); selectMention(char) }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all",
                      mentionIndex === i ? "bg-violet-500/10 text-violet-400" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {char.imageUrl1 ? (
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md">
                        <Image src={char.imageUrl1} alt={char.displayName} fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
                        <UsersIcon className="h-3 w-3 text-violet-400" />
                      </div>
                    )}
                    <span className="truncate font-medium">{char.displayName}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
