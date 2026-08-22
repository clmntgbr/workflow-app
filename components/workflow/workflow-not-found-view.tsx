import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

export function WorkflowNotFoundView() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">Workflow not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This workflow does not exist or is not available in your active
          project.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/">
          <ArrowLeftIcon className="size-4" />
          Back to workflows
        </Link>
      </Button>
    </div>
  )
}
