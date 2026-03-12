"use client"

import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"

export interface TableState {
  page: number
  limit: number
  search: string
  sortColumn: string | null
  sortAsc: boolean
  filters: Record<string, string>
}

export function useTableState(initialLimit = 10) {
  const [state, setState] = useState<TableState>({
    page: 1,
    limit: initialLimit,
    search: "",
    sortColumn: null,
    sortAsc: true,
    filters: {},
  })

  const setPage = useCallback((page: number) => {
    setState((s) => ({ ...s, page }))
  }, [])

  const setLimit = useCallback((limit: number) => {
    setState((s) => ({ ...s, limit, page: 1 }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setState((s) => ({ ...s, search, page: 1 }))
  }, [])

  const setSort = useCallback((column: string | null, asc: boolean) => {
    setState((s) => ({ ...s, sortColumn: column, sortAsc: asc, page: 1 }))
  }, [])

  const setFilter = useCallback((key: string, value: string) => {
    setState((s) => ({
      ...s,
      filters: { ...s.filters, [key]: value },
      page: 1,
    }))
  }, [])

  const buildUrl = useCallback(
    (base: string, extraParams?: Record<string, string>) => {
      const params = new URLSearchParams()
      params.set("page", String(state.page))
      params.set("limit", String(state.limit))
      if (state.search) params.set("search", state.search)
      if (state.sortColumn) {
        params.set("sort", `${state.sortColumn}:${state.sortAsc ? "asc" : "desc"}`)
      }
      Object.entries(state.filters).forEach(([k, v]) => {
        if (v && v !== "all") params.set(k, v)
      })
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => {
          if (v) params.set(k, v)
        })
      }
      return `${base}?${params.toString()}`
    },
    [state]
  )

  return {
    state,
    setPage,
    setLimit,
    setSearch,
    setSort,
    setFilter,
    buildUrl,
  }
}
