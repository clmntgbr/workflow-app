export interface HeaderSuggestion {
  key: string
  count: number
}

export interface HeaderSuggestQuery {
  search?: string
  page?: number
  limit?: number
}

export interface HeaderSuggestResponse {
  items: HeaderSuggestion[]
  page: number
  limit: number
  total: number
}

export interface HeaderValueSuggestion {
  value: string
  count: number
}

export interface HeaderValueSuggestQuery {
  search?: string
  page?: number
  limit?: number
}

export interface HeaderValueSuggestResponse {
  items: HeaderValueSuggestion[]
  page: number
  limit: number
  total: number
}
