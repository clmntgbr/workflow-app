import { keyValuePairsToRecord } from "@/lib/endpoint/utils"
import { UpdateWorkflowStepInput } from "@/lib/workflow/types"
import * as z from "zod"

const keyValuePairSchema = z.object({
  key: z.string(),
  value: z.string(),
})

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export const stepFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  description: z.string().max(2000).optional(),
  endpointId: z.string().optional(),
  url: z.string().url("URL must be valid").max(2048),
  method: z.enum([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ]),
  body: z
    .string()
    .min(1, "Body is required")
    .refine(isValidJson, "Body must be valid JSON"),
  headers: z.array(keyValuePairSchema),
  query: z.array(keyValuePairSchema),
  timeout: z
    .number()
    .int()
    .min(1, "Timeout must be at least 1 ms")
    .max(300000, "Timeout must be at most 300000 ms"),
  retryOnFailure: z.boolean(),
  retryCount: z.number().int().min(0).max(10),
  retryDelay: z
    .number()
    .int()
    .min(1, "Retry delay must be at least 1 ms")
    .max(60000, "Retry delay must be at most 60000 ms"),
})

export type StepFormValues = z.infer<typeof stepFormSchema>

export function toUpdateWorkflowStepPayload(
  values: StepFormValues
): UpdateWorkflowStepInput {
  return {
    name: values.name,
    description: values.description ?? "",
    url: values.url,
    method: values.method,
    body: JSON.parse(values.body) as Record<string, unknown>,
    headers: keyValuePairsToRecord(values.headers),
    query: keyValuePairsToRecord(values.query),
    timeout: values.timeout,
    retryOnFailure: values.retryOnFailure,
    retryCount: values.retryCount,
    retryDelay: values.retryDelay,
  }
}
