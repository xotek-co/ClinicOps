import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseTableParams } from "@/lib/api-params"
import { logActivity, createNotification } from "@/lib/activity"

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
  const staffId = searchParams.get("staff_id") || ""
  const serviceId = searchParams.get("service_id") || ""
  const startDate = searchParams.get("start_date") || ""
  const endDate = searchParams.get("end_date") || ""

  const col = sortColumn && SORT_COLUMNS.includes(sortColumn as (typeof SORT_COLUMNS)[number])
    ? sortColumn
    : "start_time"

  let query = supabase
    .from("appointments")
    .select(
      "*, patient:patients(first_name, last_name, email, phone), staff:staff(name), clinic_location:clinic_locations(name), service:services(name, duration)",
      { count: "exact" }
    )
    .order(col, { ascending: sortAsc })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (clinicId) query = query.eq("clinic_location_id", clinicId)
  if (staffId) query = query.eq("staff_id", staffId)
  if (serviceId) query = query.eq("service_id", serviceId)
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

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    patient_id,
    staff_id,
    clinic_location_id,
    service_id,
    date,
    start_time: startTimeStr,
    notes,
  } = body

  if (!patient_id || !staff_id || !clinic_location_id || !date) {
    return NextResponse.json(
      { error: "Missing required fields: patient_id, staff_id, clinic_location_id, date" },
      { status: 400 }
    )
  }

  const timeStr = startTimeStr || "09:00"
  const startTime = new Date(`${date}T${timeStr}:00`)
  if (isNaN(startTime.getTime())) {
    return NextResponse.json({ error: "Invalid date or time" }, { status: 400 })
  }

  let duration = 30
  if (service_id) {
    const { data: svc } = await supabase.from("services").select("duration").eq("id", service_id).single()
    if (svc?.duration) duration = Number(svc.duration)
  }
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000)

  const { data: clinic } = await supabase
    .from("clinic_locations")
    .select("organization_id")
    .eq("id", clinic_location_id)
    .single()

  if (!clinic?.organization_id) {
    return NextResponse.json({ error: "Invalid clinic" }, { status: 400 })
  }

  const { data: overlapping } = await supabase
    .from("appointments")
    .select("id")
    .eq("staff_id", staff_id)
    .neq("status", "cancelled")
    .lt("start_time", endTime.toISOString())
    .gt("end_time", startTime.toISOString())

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json(
      { error: "Staff has overlapping appointment at this time" },
      { status: 409 }
    )
  }

  const insertData: Record<string, unknown> = {
    patient_id,
    staff_id,
    clinic_location_id,
    service_id: service_id || null,
    status: "scheduled",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
  }

  const { data: inserted, error } = await supabase
    .from("appointments")
    .insert(insertData)
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity(supabase, {
    action: "appointment_created",
    entityType: "appointment",
    entityId: inserted?.id,
    metadata: { patient_id, staff_id, clinic_location_id },
  })

  const { data: orgUsers } = await supabase
    .from("users")
    .select("id")
    .eq("organization_id", clinic.organization_id)
    .limit(5)
  for (const u of orgUsers ?? []) {
    await createNotification(supabase, {
      userId: u.id,
      organizationId: clinic.organization_id,
      type: "appointment_created",
      title: "New appointment scheduled",
      message: `Appointment created for ${date}`,
      entityType: "appointment",
      entityId: inserted?.id,
    })
  }

  return NextResponse.json({ data: inserted, success: true })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { id, status, notes, date, start_time, staff_id, service_id } = body

  if (!id) {
    return NextResponse.json({ error: "Missing appointment id" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (status !== undefined) {
    if (!["scheduled", "completed", "cancelled", "no_show"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    updates.status = status
  }
  if (notes !== undefined) updates.notes = notes

  if (date && start_time) {
    const start = new Date(`${date}T${start_time}:00`)
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid date or time" }, { status: 400 })
    }
    let duration = 30
    if (service_id) {
      const { data: svc } = await supabase.from("services").select("duration").eq("id", service_id).single()
      if (svc?.duration) duration = Number(svc.duration)
    } else {
      const { data: apt } = await supabase.from("appointments").select("service_id").eq("id", id).single()
      if (apt?.service_id) {
        const { data: svc } = await supabase.from("services").select("duration").eq("id", apt.service_id).single()
        if (svc?.duration) duration = Number(svc.duration)
      }
    }
    const end = new Date(start.getTime() + duration * 60 * 1000)
    updates.start_time = start.toISOString()
    updates.end_time = end.toISOString()
  }
  if (staff_id !== undefined) updates.staff_id = staff_id
  if (service_id !== undefined) updates.service_id = service_id

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 })
  }

  if (updates.staff_id || updates.start_time) {
    const { data: existing } = await supabase.from("appointments").select("staff_id, start_time, end_time").eq("id", id).single()
    if (existing) {
      const staffId = (updates.staff_id as string) ?? existing.staff_id
      const start = updates.start_time ? new Date(updates.start_time as string) : new Date(existing.start_time)
      const end = updates.end_time ? new Date(updates.end_time as string) : new Date(existing.end_time)
      const { data: overlapping } = await supabase
        .from("appointments")
        .select("id")
        .eq("staff_id", staffId)
        .neq("id", id)
        .neq("status", "cancelled")
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString())
      if (overlapping && overlapping.length > 0) {
        return NextResponse.json({ error: "Staff has overlapping appointment" }, { status: 409 })
      }
    }
  }

  const { data: updated, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select("id, clinic_location_id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: clinic } = await supabase
    .from("clinic_locations")
    .select("organization_id")
    .eq("id", updated.clinic_location_id)
    .single()

  const notifType = status === "cancelled" ? "appointment_cancelled" : "appointment_updated"
  const notifTitle = status === "cancelled" ? "Appointment cancelled" : "Appointment updated"
  if (clinic?.organization_id) {
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id")
      .eq("organization_id", clinic.organization_id)
      .limit(5)
    for (const u of orgUsers ?? []) {
      await createNotification(supabase, {
        userId: u.id,
        organizationId: clinic.organization_id,
        type: notifType,
        title: notifTitle,
        entityType: "appointment",
        entityId: id,
      })
    }
  }

  await logActivity(supabase, {
    action: "appointment_updated",
    entityType: "appointment",
    entityId: id,
    metadata: updates,
  })

  return NextResponse.json({ data: updated, success: true })
}
