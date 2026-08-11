export interface Paginate<TData> {
  members: TData[]
  page: number
  limit: number
  totalPages: number
  total: number
}

export interface PaginateQuery {
  page?: number
  limit?: number
  sortBy?: string
  orderBy?: string
  search?: string
}

export const initPaginate = <TData>(): Paginate<TData> => ({
  members: [],
  page: 1,
  limit: 20,
  totalPages: 0,
  total: 0,
})
