import * as z from "zod"
import { OPENAPI_MAX_FILE_BYTES } from "./openapi"
import {
  keyValuePairsToQueryRecord,
  keyValuePairsToRecord,
  secondsToMilliseconds,
} from "./utils"

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
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
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

export const createEndpointSchema = endpointBaseSchema

export const updateEndpointSchema = endpointBaseSchema.extend({
  status: z.enum(["active", "inactive"]),
})

export const endpointFormSchema = endpointBaseSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
})

export const importEndpointSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, {
      message: "A JSON file is required",
    })
    .refine((file) => file.size <= OPENAPI_MAX_FILE_BYTES, {
      message: "File must be at most 8 MB",
    }),
  baseURL: z.string().url("URL must be valid").max(2048),
  status: z.enum(["active", "inactive"]),
  body: endpointBaseSchema.shape.body,
  headers: endpointBaseSchema.shape.headers,
  query: endpointBaseSchema.shape.query,
  timeout: endpointBaseSchema.shape.timeout,
  retryOnFailure: endpointBaseSchema.shape.retryOnFailure,
  retryCount: endpointBaseSchema.shape.retryCount,
  retryDelay: endpointBaseSchema.shape.retryDelay,
})

export type CreateEndpointFormValues = z.infer<typeof createEndpointSchema>
export type UpdateEndpointFormValues = z.infer<typeof updateEndpointSchema>
export type EndpointFormValues = z.infer<typeof endpointFormSchema>
export type ImportEndpointFormValues = z.infer<typeof importEndpointSchema>

export function toCreateEndpointPayload(values: CreateEndpointFormValues) {
  return {
    name: values.name,
    description: values.description ?? "",
    url: values.url,
    method: values.method,
    body: JSON.parse(values.body),
    headers: keyValuePairsToRecord(values.headers),
    query: keyValuePairsToQueryRecord(values.query),
    timeout: secondsToMilliseconds(values.timeout),
    retryOnFailure: values.retryOnFailure,
    retryCount: values.retryCount,
    retryDelay: secondsToMilliseconds(values.retryDelay),
  }
}

export function toUpdateEndpointPayload(values: UpdateEndpointFormValues) {
  return {
    ...toCreateEndpointPayload(values),
    status: values.status,
  }
}

export function toImportEndpointsPayload(values: ImportEndpointFormValues) {
  return {
    baseURL: values.baseURL,
    status: values.status,
    headers: keyValuePairsToRecord(values.headers),
    query: keyValuePairsToQueryRecord(values.query),
    body: JSON.parse(values.body),
    timeout: secondsToMilliseconds(values.timeout),
    retryOnFailure: values.retryOnFailure,
    retryCount: values.retryCount,
    retryDelay: secondsToMilliseconds(values.retryDelay),
  }
}
