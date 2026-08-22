import * as z from "zod"

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(255, "Project name must be 255 characters or less"),
})

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>
