"use client"

import { useQuery } from "@tanstack/react-query"
import { useSupabase } from "@/lib/supabaseContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableContainer } from "@/components/ui/table-container"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { SortableHeader } from "@/components/ui/sortable-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, FileText } from "lucide-react"
import { useTableState } from "@/lib/use-table-data"

export default function ReportsPage() {
  const supabase = useSupabase()
  const { state, setPage, setLimit, setSort, setFilter, buildUrl } = useTableState(10)
  const clinicFilter = state.filters.clinic_id ?? "all"

  const { data: clinics } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from("clinic_locations").select("id, name").order("name")
      return data || []
    },
  })

  const { data: result, isLoading } = useQuery({
    queryKey: ["weekly-reports", state],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/reports"), { credentials: "include" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to fetch")
      }
      return res.json()
    },
  })

  const reports = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 0

  const chartData = (reports || []).reduce(
    (
      acc: Record<string, { week: string; revenue: number; appointments: number; utilizationSum: number; utilizationCount: number }>,
      r: { created_at: string; total_revenue: number; appointment_count: number; staff_utilization: number }
    ) => {
      const week = new Date(r.created_at).toISOString().slice(0, 10)
      if (!acc[week]) {
        acc[week] = { week, revenue: 0, appointments: 0, utilizationSum: 0, utilizationCount: 0 }
      }
      acc[week].revenue += Number(r.total_revenue || 0)
      acc[week].appointments += r.appointment_count || 0
      acc[week].utilizationSum += Number(r.staff_utilization || 0)
      acc[week].utilizationCount += 1
      return acc
    },
    {} as Record<string, { week: string; revenue: number; appointments: number; utilizationSum: number; utilizationCount: number }>
  )
  type ChartEntry = { week: string; revenue: number; appointments: number; utilizationSum: number; utilizationCount: number }
  const chartDataArray = (Object.values(chartData) as ChartEntry[])
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12)
    .map((d) => ({
      week: d.week,
      revenue: d.revenue,
      appointments: d.appointments,
      utilization: d.utilizationCount > 0 ? Math.round(d.utilizationSum / d.utilizationCount) : 0,
    }))

  if (isLoading && !result) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Weekly performance summaries and analytics
          </p>
        </div>
        <Select value={clinicFilter} onValueChange={(v) => setFilter("clinic_id", v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by clinic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clinics</SelectItem>
            {clinics?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly revenue across clinics
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDataArray} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointments & Utilization</CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly appointment count and staff utilization
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDataArray} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(label) => formatDate(label)} />
                <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Appointments" />
                <Bar dataKey="utilization" fill="hsl(var(--chart-2, 142 76% 36%))" radius={[4, 4, 0, 0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Weekly Report History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} reports
          </p>
        </CardHeader>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Week"
                    column="created_at"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                  <TableHead>Clinic</TableHead>
                  <SortableHeader
                    label="Revenue"
                    column="total_revenue"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Appointments"
                    column="appointment_count"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                  <TableHead>Cancellations</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((r: { id: string; created_at: string; total_revenue: number; appointment_count: number; cancellation_count: number; staff_utilization: number; clinic_location?: { name?: string } }) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                      <TableCell>{r.clinic_location?.name || "—"}</TableCell>
                      <TableCell>{formatCurrency(Number(r.total_revenue))}</TableCell>
                      <TableCell>{r.appointment_count}</TableCell>
                      <TableCell>{r.cancellation_count}</TableCell>
                      <TableCell>{Number(r.staff_utilization).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <DataTablePagination
            page={state.page}
            limit={state.limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
