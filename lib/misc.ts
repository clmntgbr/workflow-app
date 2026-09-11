import { RunStatus, StepRun } from "./workflow-run/types"

export function StepCounts(steps: StepRun[]) {
  return {
    success: steps.filter((s) => s.status === "success").length,
    failed: steps.filter((s) => s.status === "failed").length,
    running: steps.filter((s) => s.status === "running").length,
    waiting: steps.filter((s) => s.status === "waiting").length,
    pending: steps.filter((s) => s.status === "pending").length,
    skipped: steps.filter((s) => s.status === "skipped").length,
    cancelled: steps.filter((s) => s.status === "cancelled").length,
  }
}

export function GetStepSummary(steps: StepRun[]) {
  const { success, failed, running, waiting, pending, skipped, cancelled } =
    StepCounts(steps)

  return {
    success: success > 0 && `${success} completed`,
    failed: failed > 0 && `${failed} failed`,
    running: running > 0 && `${running} running`,
    waiting: waiting > 0 && `${waiting} waiting`,
    pending: pending > 0 && `${pending} pending`,
    skipped: skipped > 0 && `${skipped} skipped`,
    cancelled: cancelled > 0 && `${cancelled} cancelled`,
  }
}

export function FormatRunDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function GetRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = Math.max(0, now - d.getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export const StatusStyles: Record<
  RunStatus,
  { bg: string; text: string; dot: string; ring: string; label: string }
> = {
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    label: "Success",
  },
  failed: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    label: "Failed",
  },
  skipped: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    ring: "ring-slate-200",
    label: "Skipped",
  },
  running: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-500",
    ring: "ring-sky-200",
    label: "Running",
  },
  waiting: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-500",
    ring: "ring-violet-200",
    label: "Waiting",
  },
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
    label: "Pending",
  },
  cancelled: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    dot: "bg-gray-500",
    ring: "ring-gray-200",
    label: "Cancelled",
  },
}

export function GetStatusStyle(status: RunStatus) {
  return StatusStyles[status] ?? StatusStyles.pending
}

export function GetRunDuration(durationMs: number | null | undefined): string {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) {
    return ""
  }
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)}s`
  return `${Math.floor(durationMs / 60_000)}m ${Math.floor((durationMs % 60_000) / 1000)}s`
}

export function FormatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return ""
  }
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function FormatActualValue(value: unknown | null | undefined): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean")
    return String(value)
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value, null, 2)
      return json.length > 200 ? json.slice(0, 200) + "..." : json
    } catch {
      return String(value)
    }
  }
  return String(value)
}
