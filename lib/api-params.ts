import { NextRequest } from "next/server"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

export function parseTableParams(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10))
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)))
  const search = searchParams.get("search")?.trim() || ""
  const sortRaw = searchParams.get("sort") || ""
  const [sortColumn, sortDir] = sortRaw.includes(":") ? sortRaw.split(":") : [sortRaw || null, "asc"]
  const sortAsc = sortDir?.toLowerCase() !== "desc"

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search,
    sortColumn: sortColumn || null,
    sortAsc,
  }
}

export type TableParams = ReturnType<typeof parseTableParams>
