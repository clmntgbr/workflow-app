import { Endpoint } from "@/lib/endpoint/types"

interface EndpointPreviewProps {
  endpoint: Endpoint
}

const methodStyles: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-600",
  POST: "bg-blue-50 text-blue-600",
  PUT: "bg-amber-50 text-amber-600",
  DELETE: "bg-rose-50 text-rose-600",
  PATCH: "bg-orange-50 text-orange-600",
  HEAD: "bg-slate-50 text-slate-600",
  OPTIONS: "bg-indigo-50 text-indigo-600",
  CONNECT: "bg-purple-50 text-purple-600",
  TRACE: "bg-teal-50 text-teal-600",
}

export default function EndpointPreview({ endpoint }: EndpointPreviewProps) {
  const badgeClass = methodStyles[endpoint.method]

  return (
    <>
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
          <span
            className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold ${badgeClass}`}
          >
            {endpoint.method}
          </span>
          <span className="flex-1 truncate text-[11px] font-medium text-slate-600">
            {endpoint.url}
          </span>
        </div>

        <p className="flex min-w-0 items-baseline gap-2 truncate text-xs leading-relaxed">
          <span className="shrink-0 text-slate-800">{endpoint.name}</span>
          {endpoint.description ? (
            <span className="truncate text-slate-500">
              {endpoint.description}
            </span>
          ) : null}
        </p>
      </div>
    </>
  )
}
