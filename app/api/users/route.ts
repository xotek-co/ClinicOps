import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseTableParams } from "@/lib/api-params"

const SORT_COLUMNS = ["name", "email", "role", "created_at", "is_active"] as const

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!appUser?.organization_id || appUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const { page, limit, offset, search, sortColumn, sortAsc } = parseTableParams(req)
  const role = searchParams.get("role") || ""
  const clinicId = searchParams.get("clinic_id") || ""
  const isActive = searchParams.get("is_active") || ""

  const col = sortColumn && SORT_COLUMNS.includes(sortColumn as (typeof SORT_COLUMNS)[number])
    ? sortColumn
    : "created_at"

  let query = supabase
    .from("users")
    .select("*, clinic_location:clinic_locations(name)", { count: "exact" })
    .eq("organization_id", appUser.organization_id)
    .order(col, { ascending: sortAsc })
    .range(offset, offset + limit - 1)

  if (role) query = query.eq("role", role)
  if (clinicId) query = query.eq("clinic_location_id", clinicId)
  if (isActive === "true") query = query.eq("is_active", true)
  if (isActive === "false") query = query.eq("is_active", false)
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
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
