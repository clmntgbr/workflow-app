import { Endpoint } from "@/lib/endpoint/types"

interface EndpointPreviewProps {
  endpoint: Endpoint
}

export default function EndpointPreview({ endpoint }: EndpointPreviewProps) {
  return (
    <>
      <div className="method-url">
        <span className="method-badge">{endpoint.method}</span>
        <span className="url-text">{endpoint.url}</span>
      </div>
      {endpoint.description && (
        <p className="description">{endpoint.description}</p>
      )}
    </>
  )
}
