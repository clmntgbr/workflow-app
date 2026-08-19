interface TitleProps {
  icon?: React.ReactNode
  title: string
  description?: string
}

export function Title({ icon, title, description }: TitleProps) {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        {icon}
        {title}
      </h1>
      {description && (
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      )}
    </div>
  )
}
