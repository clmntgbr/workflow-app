import { RunStatus, StepRun, StepRunStatus } from "./workflow-run/types"

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

export const statusStyles: Record<
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

export function getStatusStyle(status: string) {
  return statusStyles[status as StepRunStatus] ?? statusStyles.pending
}
