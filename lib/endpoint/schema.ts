import * as z from "zod"
import { keyValuePairsToRecord } from "./utils"

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

const endpointBaseSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  description: z.string().max(2000).optional(),
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
    .min(0, "Timeout must be at least 0 ms")
    .max(300000, "Timeout must be at most 300000 ms"),
  retryOnFailure: z.boolean(),
  retryCount: z.number().int().min(0).max(10),
  retryDelay: z
    .number()
    .int()
    .min(0, "Retry delay must be at least 0 ms")
    .max(60000, "Retry delay must be at most 60000 ms"),
})

export const createEndpointSchema = endpointBaseSchema

export const updateEndpointSchema = endpointBaseSchema.extend({
  status: z.enum(["active", "inactive"]),
})

export const endpointFormSchema = endpointBaseSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
})

export type CreateEndpointFormValues = z.infer<typeof createEndpointSchema>
export type UpdateEndpointFormValues = z.infer<typeof updateEndpointSchema>
export type EndpointFormValues = z.infer<typeof endpointFormSchema>

export function toCreateEndpointPayload(values: CreateEndpointFormValues) {
  return {
    name: values.name,
    description: values.description ?? "",
    url: values.url,
    method: values.method,
    body: JSON.parse(values.body),
    headers: keyValuePairsToRecord(values.headers),
    query: keyValuePairsToRecord(values.query),
    timeout: values.timeout,
    retryOnFailure: values.retryOnFailure,
    retryCount: values.retryCount,
    retryDelay: values.retryDelay,
  }
}

export function toUpdateEndpointPayload(values: UpdateEndpointFormValues) {
  return {
    ...toCreateEndpointPayload(values),
    status: values.status,
  }
}
