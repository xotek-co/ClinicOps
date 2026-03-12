"use client"

import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSupabase } from "@/lib/supabaseContext"
import { useAuth } from "@/lib/auth-context"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateTime } from "@/lib/utils"
import { Calendar, ChevronLeft, ChevronRight, Plus, FileText, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { format, addDays, addMinutes } from "date-fns"
import { useTableState } from "@/lib/use-table-data"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { SortableHeader } from "@/components/ui/sortable-header"

export default function AppointmentsPage() {
  const supabase = useSupabase()
  const { appUser } = useAuth()
  const queryClient = useQueryClient()
  const [dateOffset, setDateOffset] = useState(0)
  const { state, setPage, setLimit, setSearch, setSort, setFilter, buildUrl } = useTableState(10)
  const [searchInput, setSearchInput] = useState("")
  const statusFilter = state.filters.status ?? "all"
  const clinicFilter = state.filters.clinic_id ?? "all"

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput, setSearch])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesApt, setNotesApt] = useState<{ id: string; notes: string } | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    patient_id: "",
    staff_id: "",
    clinic_location_id: "",
    service_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
  })

  const viewDate = addDays(new Date(), dateOffset)
  const dateStr = format(viewDate, "yyyy-MM-dd")

  const { data: clinics } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from("clinic_locations").select("id, name").eq("archived", false).order("name")
      return data || []
    },
  })

  const { data: patients } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const res = await fetch("/api/patients?limit=200", { credentials: "include" })
      if (!res.ok) return []
      const json = await res.json()
      return json.data ?? []
    },
  })

  const { data: staffList } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from("staff").select("id, name, clinic_location_id").eq("status", "active")
      return data || []
    },
  })

  const { data: servicesList } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from("services").select("id, name, duration").order("name")
      return data || []
    },
  })

  const { data: appointmentsResult, isLoading } = useQuery({
    queryKey: ["appointments", state, dateStr],
    queryFn: async () => {
      const extra: Record<string, string> = { start_date: dateStr, end_date: dateStr }
      const res = await fetch(buildUrl("/api/appointments", extra), { credentials: "include" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to fetch")
      }
      return res.json()
    },
  })

  const appointments = appointmentsResult?.data ?? []
  const totalAppointments = appointmentsResult?.total ?? 0
  const totalPages = appointmentsResult?.totalPages ?? 0

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!supabase) throw new Error("Supabase not configured")
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] } as { queryKey: string[] }),
  })

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      if (!supabase) throw new Error("Supabase not configured")
      const { error } = await supabase.from("appointments").update({ notes }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] } as { queryKey: string[] })
      setNotesOpen(false)
      setNotesApt(null)
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase not configured")
      const start = new Date(`${scheduleForm.date}T${scheduleForm.time}`)
      const service = servicesList?.find((s) => s.id === scheduleForm.service_id)
      const duration = service?.duration ?? 30
      const end = addMinutes(start, duration)
      const { error } = await supabase.from("appointments").insert({
        patient_id: scheduleForm.patient_id,
        staff_id: scheduleForm.staff_id,
        clinic_location_id: scheduleForm.clinic_location_id,
        service_id: scheduleForm.service_id || null,
        status: "scheduled",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] } as { queryKey: string[] })
      setScheduleOpen(false)
      setScheduleForm({
        patient_id: "",
        staff_id: "",
        clinic_location_id: "",
        service_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00",
      })
    },
  })

  const canSchedule = appUser?.role === "ADMIN" || appUser?.role === "CLINIC_MANAGER"
  const canUpdateStatus = appUser?.role === "ADMIN" || appUser?.role === "CLINIC_MANAGER" || appUser?.role === "STAFF"

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success"
      case "scheduled":
        return "default"
      case "cancelled":
        return "destructive"
      case "no_show":
        return "warning"
      default:
        return "secondary"
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            View and manage appointments across clinics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSchedule && (
            <Button onClick={() => setScheduleOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          )}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <button
              onClick={() => setDateOffset((d) => d - 1)}
              className="rounded p-1 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center font-medium">
              {format(viewDate, "EEEE, MMM d")}
            </span>
            <button
              onClick={() => setDateOffset((d) => d + 1)}
              className="rounded p-1 hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patient..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clinicFilter} onValueChange={(v) => setFilter("clinic_id", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Clinic" />
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {totalAppointments} appointments on {format(viewDate, "MMM d")}
          </p>
        </CardHeader>
        <CardContent>
          <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  label="Time"
                  column="start_time"
                  currentSort={state.sortColumn}
                  ascending={state.sortAsc}
                  onSort={setSort}
                />
                <TableHead>Patient</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Clinic</TableHead>
                <TableHead>Status</TableHead>
                {(canUpdateStatus || canSchedule) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No appointments for this day
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((apt: { id: string; patient_id: string; start_time: string; patient: { first_name: string; last_name: string } | null; staff: { name?: string } | null; service: { name?: string } | null; clinic_location: { name?: string } | null; status: string; notes?: string }) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium">
                      {formatDateTime(apt.start_time)}
                    </TableCell>
                    <TableCell>
                      {apt.patient ? (
                        <Link
                          href={`/patients/${apt.patient_id}`}
                          className="hover:underline text-primary"
                        >
                          {(apt.patient as { first_name: string; last_name: string }).first_name}{" "}
                          {(apt.patient as { first_name: string; last_name: string }).last_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{(apt.staff as { name?: string })?.name || "—"}</TableCell>
                    <TableCell>{(apt.service as { name?: string })?.name || "—"}</TableCell>
                    <TableCell>{(apt.clinic_location as { name?: string })?.name || "—"}</TableCell>
                    <TableCell>
                      {canUpdateStatus && apt.status === "scheduled" ? (
                        <Select
                          value={apt.status}
                          onValueChange={(v) => updateStatusMutation.mutate({ id: apt.id, status: v })}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="no_show">No Show</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                      )}
                    </TableCell>
                    {(canUpdateStatus || canSchedule) && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNotesApt({ id: apt.id, notes: apt.notes || "" })
                            setNotesOpen(true)
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </TableContainer>
          <DataTablePagination
            page={state.page}
            limit={state.limit}
            total={totalAppointments}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>Create a new appointment</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Patient</Label>
              <Select
                value={scheduleForm.patient_id}
                onValueChange={(v) => setScheduleForm((f) => ({ ...f, patient_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p: { id: string; first_name: string; last_name: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Clinic</Label>
              <Select
                value={scheduleForm.clinic_location_id}
                onValueChange={(v) =>
                  setScheduleForm((f) => ({ ...f, clinic_location_id: v, staff_id: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Staff</Label>
              <Select
                value={scheduleForm.staff_id}
                onValueChange={(v) => setScheduleForm((f) => ({ ...f, staff_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {(scheduleForm.clinic_location_id
                    ? staffList?.filter((s) => s.clinic_location_id === scheduleForm.clinic_location_id)
                    : staffList
                  )?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Service</Label>
              <Select
                value={scheduleForm.service_id}
                onValueChange={(v) => setScheduleForm((f) => ({ ...f, service_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {servicesList?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              onClick={() => scheduleMutation.mutate()}
              disabled={
                !scheduleForm.patient_id ||
                !scheduleForm.staff_id ||
                !scheduleForm.clinic_location_id ||
                scheduleMutation.isPending
              }
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Notes</DialogTitle>
            <DialogDescription>Add or update notes for this appointment</DialogDescription>
          </DialogHeader>
          {notesApt && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input
                  value={notesApt.notes}
                  onChange={(e) =>
                    setNotesApt((n) => (n ? { ...n, notes: e.target.value } : null))
                  }
                  placeholder="Clinical notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                notesApt &&
                updateNotesMutation.mutate({ id: notesApt.id, notes: notesApt.notes })
              }
              disabled={!notesApt || updateNotesMutation.isPending}
            >
              {updateNotesMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
