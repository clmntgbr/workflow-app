"use client"

import { Button } from "@/components/ui/button"
import { JsonValue } from "@/lib/param"
import { cn } from "@/lib/utils"
import { MinimalVariable } from "@/lib/variable/types"
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListChevronsDownUpIcon,
  ListChevronsUpDownIcon,
  WandSparkles,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from "react"

interface JsonNodeProps {
  value: JsonValue
  keyName?: string
  depth: number
  isLast: boolean
  lineStart: number
  collapsedPaths: Set<string>
  onToggle: (path: string) => void
  path: string
}

function getType(value: JsonValue): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

const TYPE_COLORS: Record<string, string> = {
  string: "text-emerald-400",
  number: "text-sky-400",
  boolean: "text-amber-400",
  null: "text-rose-400",
  key: "text-red-400",
  bracket: "text-slate-300",
  punctuation: "text-slate-400",
  lineNumber: "text-slate-600",
  collapse: "text-slate-500",
}

function LineNumber({ n }: { n: number }) {
  return (
    <span
      className={`inline-block w-10 shrink-0 pr-4 text-right select-none ${TYPE_COLORS.lineNumber} text-xs`}
    >
      {n}
    </span>
  )
}

function getVisibleLineCount(
  value: JsonValue,
  path: string,
  collapsedPaths: Set<string>
): number {
  const type = getType(value)
  const isCollapsible = type === "object" || type === "array"

  if (!isCollapsible) return 1
  if (collapsedPaths.has(path)) return 1

  const entries =
    type === "array"
      ? (value as JsonValue[]).map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, JsonValue>)

  return (
    2 +
    entries.reduce(
      (sum, [k, v]) =>
        sum + getVisibleLineCount(v, `${path}.${k}`, collapsedPaths),
      0
    )
  )
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function highlightJsonText(text: string): string {
  const escaped = escapeHtml(text)

  return escaped
    .replace(
      /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
      '<span class="font-bold text-green-400">{{$1}}</span>'
    )
    .replace(
      /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
      (match, quoted, keySuffix, primitive) => {
        if (quoted !== undefined) {
          if (keySuffix) {
            return `<span class="text-red-400">${quoted}</span>${keySuffix}`
          }
          return `<span class="text-emerald-400">${quoted}</span>`
        }
        if (primitive !== undefined) {
          if (primitive === "true" || primitive === "false") {
            return `<span class="text-amber-400">${match}</span>`
          }
          if (primitive === "null") {
            return `<span class="text-rose-400">${match}</span>`
          }
        }
        return `<span class="text-sky-400">${match}</span>`
      }
    )
}

function JsonNode({
  value,
  keyName,
  depth,
  isLast,
  lineStart,
  collapsedPaths,
  onToggle,
  path,
}: JsonNodeProps) {
  const type = getType(value)
  const isCollapsible = type === "object" || type === "array"
  const isCollapsed = collapsedPaths.has(path)
  const indent = depth * 16

  const comma = isLast ? "" : ","

  if (!isCollapsible) {
    const lineNum = lineStart
    let displayValue: string
    let colorClass: string

    if (type === "string") {
      displayValue = `"${value as string}"`
      colorClass = TYPE_COLORS.string
    } else if (type === "null") {
      displayValue = "null"
      colorClass = TYPE_COLORS.null
    } else if (type === "boolean") {
      displayValue = String(value)
      colorClass = TYPE_COLORS.boolean
    } else {
      displayValue = String(value)
      colorClass = TYPE_COLORS.number
    }

    return (
      <div className="group flex items-start leading-6 hover:bg-slate-800/40">
        <LineNumber n={lineNum} />
        <span style={{ paddingLeft: indent }}>
          {keyName !== undefined && (
            <>
              <span className={TYPE_COLORS.key}>&quot;{keyName}&quot;</span>
              <span className={TYPE_COLORS.punctuation}>: </span>
            </>
          )}
          <span className={colorClass}>{displayValue}</span>
          <span className={TYPE_COLORS.punctuation}>{comma}</span>
        </span>
      </div>
    )
  }

  const isArray = type === "array"
  const entries = isArray
    ? (value as JsonValue[]).map(
        (v, i) => [String(i), v] as [string, JsonValue]
      )
    : Object.entries(value as Record<string, JsonValue>)

  const openBracket = isArray ? "[" : "{"
  const closeBracket = isArray ? "]" : "}"
  const count = entries.length

  if (isCollapsed) {
    const lineNum = lineStart
    return (
      <div
        className="group flex cursor-pointer items-start leading-6 hover:bg-slate-800/40"
        onClick={() => onToggle(path)}
      >
        <LineNumber n={lineNum} />
        <span
          style={{ paddingLeft: indent }}
          className="flex items-center gap-1"
        >
          <ChevronRight size={12} className="shrink-0 text-slate-500" />
          {keyName !== undefined && (
            <>
              <span className={TYPE_COLORS.key}>&quot;{keyName}&quot;</span>
              <span className={TYPE_COLORS.punctuation}>: </span>
            </>
          )}
          <span className={TYPE_COLORS.bracket}>{openBracket}</span>
          <span className="rounded bg-slate-700/60 px-1 text-xs text-slate-500">
            {count} {isArray ? "items" : "keys"}
          </span>
          <span className={TYPE_COLORS.bracket}>{closeBracket}</span>
          <span className={TYPE_COLORS.punctuation}>{comma}</span>
        </span>
      </div>
    )
  }

  const openLine = lineStart
  const { nodes: children, nextLine: closeLine } = entries.reduce<{
    nodes: ReactElement[]
    nextLine: number
  }>(
    (acc, [k, v], i) => {
      const childPath = `${path}.${k}`
      const node = (
        <JsonNode
          key={k}
          value={v}
          keyName={isArray ? undefined : k}
          depth={depth + 1}
          isLast={i === entries.length - 1}
          lineStart={acc.nextLine}
          collapsedPaths={collapsedPaths}
          onToggle={onToggle}
          path={childPath}
        />
      )

      return {
        nodes: [...acc.nodes, node],
        nextLine:
          acc.nextLine + getVisibleLineCount(v, childPath, collapsedPaths),
      }
    },
    { nodes: [], nextLine: lineStart + 1 }
  )

  return (
    <>
      <div
        className="group flex cursor-pointer items-start leading-6 hover:bg-slate-800/40"
        onClick={() => onToggle(path)}
      >
        <LineNumber n={openLine} />
        <span
          style={{ paddingLeft: indent }}
          className="flex items-center gap-1"
        >
          <ChevronDown size={12} className="shrink-0 text-slate-500" />
          {keyName !== undefined && (
            <>
              <span className={TYPE_COLORS.key}>&quot;{keyName}&quot;</span>
              <span className={TYPE_COLORS.punctuation}>: </span>
            </>
          )}
          <span className={TYPE_COLORS.bracket}>{openBracket}</span>
        </span>
      </div>
      {children}
      <div className="flex items-start leading-6 hover:bg-slate-800/40">
        <LineNumber n={closeLine} />
        <span style={{ paddingLeft: indent }}>
          <span className={TYPE_COLORS.bracket}>{closeBracket}</span>
          <span className={TYPE_COLORS.punctuation}>{comma}</span>
        </span>
      </div>
    </>
  )
}

function toEditorText(data: unknown): string {
  if (data === undefined) return ""
  if (typeof data === "string") return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return ""
  }
}

interface JsonInputProps {
  data: unknown
  title?: string
  editable?: boolean
  onChange?: (value: JsonValue | undefined) => void
  onTextChange?: (value: string) => void
  onValidityChange?: (isValid: boolean) => void
  variables?: MinimalVariable[]
  editorClassName?: string
  className?: string
}

export default function JsonInput({
  data,
  title,
  editable = false,
  onChange,
  onTextChange,
  onValidityChange,
  variables = [],
  editorClassName,
  className,
}: JsonInputProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    MinimalVariable[]
  >([])
  const [suggestionPosition, setSuggestionPosition] = useState({
    top: 0,
    left: 0,
  })
  const [cursorPosition, setCursorPosition] = useState(0)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const highlightedRef = useRef<HTMLPreElement | null>(null)
  const previousValidityRef = useRef<boolean | null>(null)
  const [editorText, setEditorText] = useState(() => toEditorText(data))
  const [prevData, setPrevData] = useState(data)

  if (editable && data !== prevData) {
    setPrevData(data)
    setEditorText(toEditorText(data))
  }

  const handleToggle = useCallback((path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const insertVariable = useCallback(
    (variable: MinimalVariable) => {
      if (!editorRef.current) return

      const cursor = cursorPosition
      const textBeforeCursor = editorText.slice(0, cursor)
      const textAfterCursor = editorText.slice(cursor)
      const lastOpenBrace = textBeforeCursor.lastIndexOf("{{")

      if (lastOpenBrace !== -1) {
        const newText =
          editorText.slice(0, lastOpenBrace) +
          `{{${variable.key}}}` +
          textAfterCursor

        setEditorText(newText)
        onTextChange?.(newText)
        setShowSuggestions(false)

        const newCursor = lastOpenBrace + `{{${variable.key}}}`.length
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus()
            editorRef.current.setSelectionRange(newCursor, newCursor)
          }
        }, 0)

        if (onChange) {
          try {
            const parsed = JSON.parse(newText) as JsonValue
            setError(null)
            onChange(parsed)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Invalid JSON"
            setError(message)
          }
        }
      }
    },
    [cursorPosition, editorText, onChange, onTextChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions) return

      if (e.key === "Escape") {
        e.preventDefault()
        setShowSuggestions(false)
      } else if (e.key === "Enter" && filteredSuggestions.length > 0) {
        e.preventDefault()
        insertVariable(filteredSuggestions[0])
      }
    },
    [showSuggestions, filteredSuggestions, insertVariable]
  )

  const handleEditorChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value
      const cursor = e.target.selectionStart
      setEditorText(text)
      setCursorPosition(cursor)
      onTextChange?.(text)

      const textBeforeCursor = text.slice(0, cursor)
      const lastOpenBrace = textBeforeCursor.lastIndexOf("{{")

      if (lastOpenBrace !== -1) {
        const searchText = textBeforeCursor.slice(lastOpenBrace + 2)
        if (!searchText.includes("}}")) {
          const filtered = variables.filter((v) =>
            v.key.toLowerCase().includes(searchText.toLowerCase())
          )
          setFilteredSuggestions(filtered)
          setShowSuggestions(filtered.length > 0)

          if (editorRef.current) {
            const lines = text.slice(0, cursor).split("\n")
            const lineHeight = 24
            const charWidth = 8
            const currentLine = lines.length - 1
            const currentCol = lines[lines.length - 1].length

            setSuggestionPosition({
              top: (currentLine + 1) * lineHeight + 50,
              left: currentCol * charWidth + 20,
            })
          }
        } else {
          setShowSuggestions(false)
        }
      } else {
        setShowSuggestions(false)
      }

      if (!onChange) return
      if (text.trim() === "") {
        setError(null)
        onChange(undefined)
        return
      }

      try {
        const parsed = JSON.parse(text) as JsonValue
        setError(null)
        onChange(parsed)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid JSON"
        setError(message)
      }
    },
    [onChange, onTextChange, variables]
  )

  const handleEditorScroll = useCallback(() => {
    const editor = editorRef.current
    const highlighted = highlightedRef.current
    if (!editor || !highlighted) return
    highlighted.scrollTop = editor.scrollTop
    highlighted.scrollLeft = editor.scrollLeft
  }, [])

  const handleFormat = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (!editable) return

      if (editorText.trim() === "") {
        setError(null)
        return
      }

      try {
        const parsed = JSON.parse(editorText) as JsonValue
        const formatted = JSON.stringify(parsed, null, 2)
        setEditorText(formatted)
        onTextChange?.(formatted)
        setError(null)
        onChange?.(parsed)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid JSON"
        setError(message)
      }
    },
    [editable, editorText, onChange, onTextChange]
  )

  const handleCollapseAll = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (editable) {
      if (editorText.trim() === "") {
        setError(null)
        return
      }
      try {
        const parsed = JSON.parse(editorText) as JsonValue
        const collapsed = JSON.stringify(parsed)
        setEditorText(collapsed)
        onTextChange?.(collapsed)
        setError(null)
        onChange?.(parsed)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid JSON"
        setError(message)
      }
      return
    }

    const paths = new Set<string>()
    function collect(val: unknown, path: string) {
      if (val && typeof val === "object") {
        paths.add(path)
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          collect(v, `${path}.${k}`)
        }
      }
    }
    collect(data, "root")
    paths.delete("root")
    setCollapsedPaths(paths)
  }

  const handleExpandAll = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (editable) {
      if (editorText.trim() === "") {
        setError(null)
        return
      }
      try {
        const parsed = JSON.parse(editorText) as JsonValue
        const expanded = JSON.stringify(parsed, null, 2)
        setEditorText(expanded)
        onTextChange?.(expanded)
        setError(null)
        onChange?.(parsed)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid JSON"
        setError(message)
      }
      return
    }

    setCollapsedPaths(new Set())
  }

  let parsed: JsonValue | null = null
  let parseError: string | null = null

  const sourceData = editable ? editorText : data

  if (typeof sourceData === "string") {
    if (editable && sourceData.trim() === "") {
      parsed = null
      parseError = null
    } else {
      try {
        parsed = JSON.parse(sourceData) as JsonValue
      } catch (e) {
        parseError = e instanceof Error ? e.message : "Invalid JSON"
      }
    }
  } else {
    try {
      JSON.stringify(sourceData)
      parsed = sourceData as JsonValue
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Cannot serialize value"
    }
  }

  useEffect(() => {
    if (!editable || !onValidityChange) return
    const isValid = parseError === null
    if (previousValidityRef.current === isValid) return
    previousValidityRef.current = isValid
    onValidityChange(isValid)
  }, [editable, parseError, onValidityChange])

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-sm shadow-none",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          {title && (
            <span className="ml-3 text-xs text-slate-400">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCollapseAll}
            className="text-white hover:bg-slate-700 hover:text-white"
          >
            <ListChevronsDownUpIcon size={12} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleExpandAll}
            className="text-white hover:bg-slate-700 hover:text-white"
          >
            <ListChevronsUpDownIcon size={12} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFormat}
            className="text-white hover:bg-slate-700 hover:text-white"
          >
            <WandSparkles size={12} />
          </Button>
        </div>
      </div>

      {(parseError || error) && (
        <div className="flex items-start gap-3 border-b border-rose-800/50 bg-rose-950/50 px-4 py-3 text-xs text-rose-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{parseError ?? error}</span>
        </div>
      )}

      <div
        className="overflow-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#334155 transparent",
        }}
      >
        {editable ? (
          <div className="relative">
            <pre
              ref={highlightedRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-auto rounded border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-slate-300"
              dangerouslySetInnerHTML={{
                __html: highlightJsonText(editorText) || " ",
              }}
            />
            <textarea
              ref={editorRef}
              value={editorText}
              onChange={handleEditorChange}
              onKeyDown={handleKeyDown}
              onScroll={handleEditorScroll}
              spellCheck={false}
              placeholder='{"key":"value"}'
              className={cn(
                "relative h-full w-full resize-y overflow-auto rounded border border-transparent bg-transparent px-4 py-3 text-sm leading-6 text-transparent caret-slate-100 outline-none placeholder:text-slate-500",
                editorClassName ?? "min-h-40"
              )}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                className="absolute z-50 w-64 rounded-lg border border-slate-600 bg-slate-800 shadow-lg"
                style={{
                  top: suggestionPosition.top,
                  left: suggestionPosition.left,
                }}
              >
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredSuggestions.map((variable) => (
                    <button
                      key={variable.id}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="w-full cursor-pointer rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                    >
                      <div className="font-medium text-green-400">
                        {variable.key}
                      </div>
                      <div className="text-xs text-slate-300">
                        {variable.name}
                      </div>
                      {variable.description ? (
                        <div className="text-xs text-slate-400">
                          {variable.description}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : parsed !== null && !parseError ? (
          <JsonNode
            value={parsed}
            depth={0}
            isLast
            lineStart={1}
            collapsedPaths={collapsedPaths}
            onToggle={handleToggle}
            path="root"
          />
        ) : (
          !parseError && (
            <div className="flex h-full items-center justify-center text-slate-500">
              No data
            </div>
          )
        )}
      </div>
    </div>
  )
}
