import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseTableParams } from "@/lib/api-params"

const SORT_COLUMNS = ["last_name", "first_name", "created_at", "date_of_birth"] as const

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { page, limit, offset, search, sortColumn, sortAsc } = parseTableParams(req)
  const col = sortColumn && SORT_COLUMNS.includes(sortColumn as (typeof SORT_COLUMNS)[number])
    ? sortColumn
    : "last_name"

  let query = supabase
    .from("patients")
    .select("*", { count: "exact" })
    .order(col, { ascending: sortAsc })
    .range(offset, offset + limit - 1)

  if (search) {
    const terms = search.trim().split(/\s+/).filter(Boolean)
    const orParts: string[] = []
    for (const term of terms) {
      orParts.push(
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `email.ilike.%${term}%`,
        `phone.ilike.%${term}%`
      )
    }
    if (orParts.length > 0) {
      query = query.or(orParts.join(","))
    }
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
