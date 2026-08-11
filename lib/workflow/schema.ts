import * as z from "zod"
import { hasNotificationTarget } from "./utils"

export const workflowSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters"),
    description: z.string().max(255, "Description must be at most 255 characters").optional(),
    notificationsEnabled: z.boolean(),
    notifyOnSuccess: z.boolean(),
    notifyOnFailure: z.boolean(),
    notifyOnCancel: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.notificationsEnabled && !hasNotificationTarget(data)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Select at least one notification event when notifications are enabled",
        path: ["notificationsEnabled"],
      })
    }
  })
