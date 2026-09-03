export interface HeaderSuggestion {
  key: string
  value: string
  count: number
}

export interface HeaderSuggestQuery {
  search?: string
  page?: number
  limit?: number
}

export interface HeaderSuggestResponse {
  members: HeaderSuggestion[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface HeaderValueSuggestion {
  key: string
  value: string
  count: number
}

export interface HeaderValueSuggestQuery {
  search?: string
  page?: number
  limit?: number
}

export interface HeaderValueSuggestResponse {
  members: HeaderValueSuggestion[]
  page: number
  limit: number
  total: number
  totalPages: number
}
