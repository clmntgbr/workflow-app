import {
  keyValuePairsToQueryRecord,
  keyValuePairsToRecord,
  secondsToMilliseconds,
} from "@/lib/endpoint/utils"
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
    .min(30, "Timeout must be at least 30 seconds")
    .max(300, "Timeout must be at most 300 seconds"),
  retryOnFailure: z.boolean(),
  retryCount: z.number().int().min(0).max(10),
  retryDelay: z
    .number()
    .int()
    .min(10, "Retry delay must be at least 10 seconds")
    .max(60, "Retry delay must be at most 60 seconds"),
})

export type StepFormValues = z.infer<typeof stepFormSchema>

export function toUpdateWorkflowStepPayload(
  values: StepFormValues
): UpdateWorkflowStepInput {
  const body = JSON.parse(values.body) as Record<string, unknown>
  const headers = keyValuePairsToRecord(values.headers)
  const query = keyValuePairsToQueryRecord(values.query)

  return {
    name: values.name,
    description: values.description ?? "",
    url: values.url,
    method: values.method,
    body,
    headers,
    query,
    timeout: secondsToMilliseconds(values.timeout),
    retryOnFailure: values.retryOnFailure,
    retryCount: values.retryCount,
    retryDelay: secondsToMilliseconds(values.retryDelay),
  }
}
