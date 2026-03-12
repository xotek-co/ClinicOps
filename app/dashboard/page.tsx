"use client"

import { useQuery } from "@tanstack/react-query"
import { useSupabase } from "@/lib/supabaseContext"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RevenueByClinicChart } from "@/components/charts/RevenueByClinicChart"
import { WeeklyAppointmentTrendChart } from "@/components/charts/WeeklyAppointmentTrendChart"
import { StaffUtilizationChart } from "@/components/charts/StaffUtilizationChart"
import { formatCurrency } from "@/lib/utils"
import {
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react"

export default function DashboardPage() {
  const supabase = useSupabase()
  const { appUser } = useAuth()

  const orgId = appUser?.organization_id
  const { data: org, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ["organizations", orgId],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase not configured. Add env vars to .env.local")
      if (orgId) return { id: orgId }
      const { data } = await supabase.from("organizations").select("id").limit(1).maybeSingle()
      return data
    },
    enabled: !!supabase,
  })

  const clinicId = appUser?.role === "CLINIC_MANAGER" || appUser?.role === "STAFF"
    ? appUser.clinic_location_id
    : null

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", org?.id, clinicId],
    queryFn: async () => {
      if (!org?.id || !supabase) return null
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      let clinicsQuery = supabase.from("clinic_locations").select("*").eq("organization_id", org.id)
      if (clinicId) clinicsQuery = clinicsQuery.eq("id", clinicId)
      const [clinicsRes, revenueRes, appointmentsRes, allAppointmentsRes] =
        await Promise.all([
          clinicsQuery,
          supabase
            .from("revenue_records")
            .select("amount, clinic_location_id")
            .gte("created_at", thirtyDaysAgo.toISOString()),
          supabase
            .from("appointments")
            .select("id, status")
            .gte("start_time", todayStart.toISOString())
            .lte("start_time", todayEnd.toISOString()),
          supabase
            .from("appointments")
            .select("status")
            .gte("start_time", thirtyDaysAgo.toISOString()),
        ])

      const revenue = revenueRes.data || []
      const appointments = appointmentsRes.data || []
      const allAppointments = allAppointmentsRes.data || []
      const clinicList = clinicsRes.data || []

      const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount), 0)
      const appointmentsToday = appointments.filter((a) => a.status !== "cancelled").length
      const noShowCount = allAppointments.filter((a) => a.status === "no_show").length
      const completedCount = allAppointments.filter((a) => a.status === "completed").length
      const noShowRate =
        completedCount + noShowCount > 0
          ? (noShowCount / (completedCount + noShowCount)) * 100
          : 0

      const revenueByClinic = clinicList.map((c: { id: string; name: string }) => ({
        id: c.id,
        name: c.name,
        total: revenue
          .filter((r: { clinic_location_id: string }) => r.clinic_location_id === c.id)
          .reduce((s: number, r: { amount: string | number }) => s + Number(r.amount), 0),
      }))

      const { data: weeklyReports } = await supabase
        .from("weekly_reports")
        .select("*, clinic_location:clinic_locations(name)")
        .order("created_at", { ascending: false })
        .limit(28)

      let staffQuery = supabase.from("staff").select("id, name, clinic_location_id").eq("organization_id", org.id)
      if (clinicId) staffQuery = staffQuery.eq("clinic_location_id", clinicId)
      const { data: staffData } = await staffQuery

      const { data: appointmentCounts } = await supabase
        .from("appointments")
        .select("staff_id, status")
        .gte("start_time", thirtyDaysAgo.toISOString())

      const staffWithCounts = (staffData || []).map((s: { id: string; name: string; clinic_location_id: string }) => {
        const count = (appointmentCounts || []).filter(
          (a: { staff_id: string; status: string }) =>
            a.staff_id === s.id && a.status === "completed"
        ).length
        return { ...s, appointmentCount: count }
      })

      const maxAppointments = Math.max(...staffWithCounts.map((s) => s.appointmentCount), 1)
      const staffUtilization = staffWithCounts.map((s) => ({
        name: s.name.split(" ")[0],
        utilization: Math.round((s.appointmentCount / maxAppointments) * 100),
        count: s.appointmentCount,
      }))

      const weeklyTrend = (weeklyReports || [])
        .reduce((acc: Record<string, { appointments: number; revenue: number }>, r: { created_at: string; appointment_count: number; total_revenue: number }) => {
          const week = new Date(r.created_at).toISOString().slice(0, 10)
          if (!acc[week]) acc[week] = { appointments: 0, revenue: 0 }
          acc[week].appointments += r.appointment_count || 0
          acc[week].revenue += Number(r.total_revenue || 0)
          return acc
        }, {})
      const weeklyTrendData = Object.entries(weeklyTrend)
        .map(([week, v]) => ({ week, ...(v as { appointments: number; revenue: number }) }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-8)

      return {
        totalRevenue,
        appointmentsToday,
        noShowRate,
        revenueByClinic,
        staffUtilization,
        weeklyTrendData,
      }
    },
    enabled: !!org?.id,
  })

  if (orgError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-semibold">Connection Error</h2>
        <p className="text-center text-muted-foreground max-w-md">
          {orgError instanceof Error ? orgError.message : "Failed to connect to Supabase."}
          {" "}Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
        </p>
      </div>
    )
  }

  if (orgLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-semibold">No organization found</h2>
        <p className="text-center text-muted-foreground max-w-md">
          Run the database migrations and seed script. See README for setup instructions.
        </p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your clinic operations across all locations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments Today</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointmentsToday}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Show Rate</CardTitle>
            <div className="rounded-lg bg-amber-500/10 p-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.noShowRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenueByClinic.length}</div>
            <p className="text-xs text-muted-foreground">Active clinics</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Clinic</CardTitle>
            <p className="text-sm text-muted-foreground">
              Branch comparison for last 30 days
            </p>
          </CardHeader>
          <CardContent>
            <RevenueByClinicChart data={stats.revenueByClinic} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Appointment Trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              Appointments and revenue over time
            </p>
          </CardHeader>
          <CardContent>
            <WeeklyAppointmentTrendChart data={stats.weeklyTrendData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Utilization</CardTitle>
          <p className="text-sm text-muted-foreground">
            Completed appointments per clinician (last 30 days)
          </p>
        </CardHeader>
        <CardContent>
          <StaffUtilizationChart data={stats.staffUtilization} />
        </CardContent>
      </Card>
    </div>
  )
}
