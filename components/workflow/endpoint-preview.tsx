import { Endpoint } from "@/lib/endpoint/types"
import { StepPreview } from "./step-preview"

interface EndpointPreviewProps {
  endpoint: Endpoint
  className?: string
  showDescription?: boolean
}

export default function EndpointPreview({
  endpoint,
  className,
  showDescription = true,
}: EndpointPreviewProps) {
  return (
    <StepPreview
      name={endpoint.name}
      method={endpoint.method}
      url={endpoint.url}
      description={showDescription ? endpoint.description : null}
      className={className}
    />
  )
}
