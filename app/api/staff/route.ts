import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseTableParams } from "@/lib/api-params"

const SORT_COLUMNS = ["name", "role", "status", "created_at"] as const

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const { page, limit, offset, search, sortColumn, sortAsc } = parseTableParams(req)
  const clinicId = searchParams.get("clinic_id") || ""
  const status = searchParams.get("status") || ""

  const col = sortColumn && SORT_COLUMNS.includes(sortColumn as (typeof SORT_COLUMNS)[number])
    ? sortColumn
    : "name"

  let query = supabase
    .from("staff")
    .select("*, clinic_location:clinic_locations(name)", { count: "exact" })
    .order(col, { ascending: sortAsc })
    .range(offset, offset + limit - 1)

  if (clinicId) query = query.eq("clinic_location_id", clinicId)
  if (status) query = query.eq("status", status)
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
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
