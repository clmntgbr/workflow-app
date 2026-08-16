import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface EmptyProps {
  title: string
  description: string
  icon: React.ReactNode
}
export function EmptyComponent({ title, description, icon }: EmptyProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-10 rounded-full bg-muted p-2"
        >
          {icon}
        </EmptyMedia>
        <EmptyTitle className="text-lg font-bold">{title}</EmptyTitle>
        <EmptyDescription className="text-sm font-light text-muted-foreground">
          {description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
