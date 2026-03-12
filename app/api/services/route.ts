import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseTableParams } from "@/lib/api-params"

const SORT_COLUMNS = ["name", "duration", "price", "created_at"] as const

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const { page, limit, offset, search, sortColumn, sortAsc } = parseTableParams(req)

  const col = sortColumn && SORT_COLUMNS.includes(sortColumn as (typeof SORT_COLUMNS)[number])
    ? sortColumn
    : "name"

  let query = supabase
    .from("services")
    .select("*", { count: "exact" })
    .order(col, { ascending: sortAsc })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
