import { RunStatus, StepRun } from "./workflow-run/types"

export function StepCounts(steps: StepRun[]) {
  return {
    success: steps.filter((s) => s.status === "success").length,
    failed: steps.filter((s) => s.status === "failed").length,
    running: steps.filter((s) => s.status === "running").length,
    pending: steps.filter((s) => s.status === "pending").length,
    skipped: steps.filter((s) => s.status === "skipped").length,
    cancelled: steps.filter((s) => s.status === "cancelled").length,
  }
}

export function GetStepSummary(steps: StepRun[]) {
  const { success, failed, running, pending, skipped, cancelled } =
    StepCounts(steps)

  return {
    success: success > 0 && `${success} completed`,
    failed: failed > 0 && `${failed} failed`,
    running: running > 0 && `${running} running`,
    pending: pending > 0 && `${pending} pending`,
    skipped: skipped > 0 && `${skipped} skipped`,
    cancelled: cancelled > 0 && `${cancelled} cancelled`,
  }
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

export function GetRunDuration(
  started: string | null,
  ended: string | null
): string {
  if (!started || !ended) return ""
  const ms = new Date(ended).getTime() - new Date(started).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
