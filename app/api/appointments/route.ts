import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseTableParams } from "@/lib/api-params"

const SORT_COLUMNS = ["start_time", "status", "created_at"] as const

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const { page, limit, offset, search, sortColumn, sortAsc } = parseTableParams(req)
  const status = searchParams.get("status") || ""
  const clinicId = searchParams.get("clinic_id") || ""
  const startDate = searchParams.get("start_date") || ""
  const endDate = searchParams.get("end_date") || ""

  const col = sortColumn && SORT_COLUMNS.includes(sortColumn as (typeof SORT_COLUMNS)[number])
    ? sortColumn
    : "start_time"

  let query = supabase
    .from("appointments")
    .select(
      "*, patient:patients(first_name, last_name), staff:staff(name), clinic_location:clinic_locations(name), service:services(name)",
      { count: "exact" }
    )
    .order(col, { ascending: sortAsc })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (clinicId) query = query.eq("clinic_location_id", clinicId)
  if (startDate) query = query.gte("start_time", `${startDate}T00:00:00.000Z`)
  if (endDate) query = query.lte("start_time", `${endDate}T23:59:59.999Z`)

  if (search) {
    const { data: patientIds } = await supabase
      .from("patients")
      .select("id")
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    const ids = (patientIds ?? []).map((p) => p.id)
    if (ids.length > 0) {
      query = query.in("patient_id", ids)
    } else {
      query = query.eq("patient_id", "00000000-0000-0000-0000-000000000000")
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
