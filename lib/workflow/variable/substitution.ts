import { WorkflowVariable } from "./types"

const VAR_PATTERN = /\{\{([a-zA-Z0-9_-]+)\}\}/g

export function parseVariableReferences(text: string): string[] {
  const refs: string[] = []
  let match
  const pattern = new RegExp(VAR_PATTERN.source)
  while ((match = pattern.exec(text)) !== null) {
    refs.push(match[1])
  }
  return refs
}

export function substituteVariableNames(
  text: string,
  idToKeyMap: Map<string, string>
): string {
  return text.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, ref) => {
    const key = idToKeyMap.get(ref)
    return key ? `{{${key}}}` : `{{${ref}}}`
  })
}

export function substituteVariableIds(
  text: string,
  keyToId: Map<string, string>
): string {
  return text.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, ref) => {
    const id = keyToId.get(ref)
    return id ? `{{${id}}}` : `{{${ref}}}`
  })
}

export function buildKeyToIdMap(
  variables: WorkflowVariable[]
): Map<string, string> {
  return new Map(variables.map((v) => [v.key, v.id]))
}

export function buildIdToKeyMap(
  variables: WorkflowVariable[]
): Map<string, string> {
  return new Map(variables.map((v) => [v.id, v.key]))
}

export function substituteInObjectIds(
  obj: Record<string, unknown>,
  keyToIdMap: Map<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = substituteVariableIds(value, keyToIdMap)
    } else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === "string"
            ? substituteVariableIds(item, keyToIdMap)
            : item
        )
      } else {
        result[key] = substituteInObjectIds(
          value as Record<string, unknown>,
          keyToIdMap
        )
      }
    } else {
      result[key] = value
    }
  }

  return result
}

export function substituteInObjectNames(
  obj: Record<string, unknown>,
  idToKeyMap: Map<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = substituteVariableNames(value, idToKeyMap)
    } else if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === "string"
            ? substituteVariableNames(item, idToKeyMap)
            : item
        )
      } else {
        result[key] = substituteInObjectNames(
          value as Record<string, unknown>,
          idToKeyMap
        )
      }
    } else {
      result[key] = value
    }
  }

  return result
}
