import { createClient } from "./supabaseClient"
import type {
  ClinicLocation,
  Staff,
  Patient,
  Service,
  Appointment,
  RevenueRecord,
  WeeklyReport,
} from "./types"

const supabase = createClient()

export async function getOrganizations() {
  const { data, error } = await supabase.from("organizations").select("*")
  if (error) throw error
  return data
}

export async function getClinicLocations(organizationId?: string) {
  let query = supabase.from("clinic_locations").select("*")
  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }
  const { data, error } = await query.order("name")
  if (error) throw error
  return data as ClinicLocation[]
}

export async function getStaff(organizationId?: string, clinicId?: string) {
  let query = supabase.from("staff").select("*")
  if (organizationId) query = query.eq("organization_id", organizationId)
  if (clinicId) query = query.eq("clinic_location_id", clinicId)
  const { data, error } = await query.order("name")
  if (error) throw error
  return data as Staff[]
}

export async function getPatients(organizationId?: string) {
  let query = supabase.from("patients").select("*")
  if (organizationId) query = query.eq("organization_id", organizationId)
  const { data, error } = await query.order("last_name")
  if (error) throw error
  return data as Patient[]
}

export async function getServices(organizationId?: string) {
  let query = supabase.from("services").select("*")
  if (organizationId) query = query.eq("organization_id", organizationId)
  const { data, error } = await query.order("name")
  if (error) throw error
  return data as Service[]
}

export async function getAppointments(filters?: {
  clinicId?: string
  staffId?: string
  patientId?: string
  startDate?: string
  endDate?: string
  status?: string
}) {
  let query = supabase
    .from("appointments")
    .select(
      "*, patient:patients(*), staff:staff(*), clinic_location:clinic_locations(*), service:services(*)"
    )
  if (filters?.clinicId) query = query.eq("clinic_location_id", filters.clinicId)
  if (filters?.staffId) query = query.eq("staff_id", filters.staffId)
  if (filters?.patientId) query = query.eq("patient_id", filters.patientId)
  if (filters?.startDate)
    query = query.gte("start_time", filters.startDate)
  if (filters?.endDate) query = query.lte("start_time", filters.endDate)
  if (filters?.status) query = query.eq("status", filters.status)
  const { data, error } = await query.order("start_time", { ascending: true })
  if (error) throw error
  return data as Appointment[]
}

export async function getRevenueRecords(filters?: {
  clinicId?: string
  startDate?: string
  endDate?: string
}) {
  let query = supabase.from("revenue_records").select("*")
  if (filters?.clinicId)
    query = query.eq("clinic_location_id", filters.clinicId)
  if (filters?.startDate)
    query = query.gte("created_at", filters.startDate)
  if (filters?.endDate) query = query.lte("created_at", filters.endDate)
  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) throw error
  return data as RevenueRecord[]
}

export async function getWeeklyReports(clinicId?: string) {
  let query = supabase
    .from("weekly_reports")
    .select("*, clinic_location:clinic_locations(*)")
  if (clinicId) query = query.eq("clinic_location_id", clinicId)
  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) throw error
  return data as WeeklyReport[]
}

export async function getDashboardStats(organizationId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [clinics, revenue, appointments, weeklyReports] = await Promise.all([
    getClinicLocations(organizationId),
    getRevenueRecords({
      startDate: thirtyDaysAgo.toISOString(),
      endDate: new Date().toISOString(),
    }),
    getAppointments({
      startDate: todayStart.toISOString(),
      endDate: todayEnd.toISOString(),
    }),
    getWeeklyReports(),
  ])

  const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.amount), 0)
  const appointmentsToday = appointments.filter(
    (a) => a.status !== "cancelled"
  ).length
  const allAppointments = await getAppointments({
    startDate: thirtyDaysAgo.toISOString(),
  })
  const noShowCount = allAppointments.filter((a) => a.status === "no_show").length
  const completedCount = allAppointments.filter(
    (a) => a.status === "completed"
  ).length
  const noShowRate =
    completedCount + noShowCount > 0
      ? (noShowCount / (completedCount + noShowCount)) * 100
      : 0

  const revenueByClinic = clinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    total: revenue
      .filter((r) => r.clinic_location_id === clinic.id)
      .reduce((sum, r) => sum + Number(r.amount), 0),
  }))

  return {
    totalRevenue,
    appointmentsToday,
    noShowRate,
    revenueByClinic,
    weeklyReports,
    appointments,
  }
}
