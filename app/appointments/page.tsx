"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabaseContext";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableContainer } from "@/components/ui/table-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Search,
  LayoutGrid,
  List,
  XCircle,
  CheckCircle,
  UserX,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { useTableState } from "@/lib/use-table-data";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";

type AppointmentRow = {
  id: string;
  patient_id: string;
  staff_id: string;
  clinic_location_id: string;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  staff?: { name?: string };
  clinic_location?: { name?: string };
  service?: { name?: string; duration?: number };
};

export default function AppointmentsPage() {
  const supabase = useSupabase();
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const [dateOffset, setDateOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const { state, setPage, setLimit, setSearch, setSort, setFilter, buildUrl } =
    useTableState(100);
  const [searchInput, setSearchInput] = useState("");
  const statusFilter = state.filters.status ?? "all";
  const clinicFilter = state.filters.clinic_id ?? "all";
  const staffFilter = state.filters.staff_id ?? "all";
  const serviceFilter = state.filters.service_id ?? "all";

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesApt, setNotesApt] = useState<{
    id: string;
    notes: string;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<AppointmentRow | null>(null);
  const [editForm, setEditForm] = useState<{
    date: string;
    time: string;
    staff_id: string;
    service_id: string;
    notes: string;
  } | null>(null);
  const [scheduleError, setScheduleError] = useState("");

  const [scheduleForm, setScheduleForm] = useState({
    patient_id: "",
    staff_id: "",
    clinic_location_id: "",
    service_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    notes: "",
  });

  const viewDate = addDays(new Date(), dateOffset);
  const dateStr = format(viewDate, "yyyy-MM-dd");
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(viewDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const { data: clinics } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from("clinic_locations")
        .select("id, name, archived")
        .order("name");
      return (data || []).filter((c: { archived?: boolean }) => !c.archived);
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const res = await fetch("/api/patients?limit=200", {
        credentials: "include",
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: staffList } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from("staff")
        .select("id, name, clinic_location_id")
        .eq("status", "active");
      return data || [];
    },
  });

  const { data: servicesList } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from("services")
        .select("id, name, duration")
        .order("name");
      return data || [];
    },
  });

  const extraParams: Record<string, string> =
    viewMode === "weekly"
      ? { start_date: weekStartStr, end_date: weekEndStr }
      : { start_date: dateStr, end_date: dateStr };

  const { data: appointmentsResult, isLoading } = useQuery({
    queryKey: ["appointments", state, dateStr, weekStartStr, viewMode],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/appointments", extraParams), {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch");
      }
      return res.json();
    },
  });

  const appointments: AppointmentRow[] = appointmentsResult?.data ?? [];
  const totalAppointments = appointmentsResult?.total ?? 0;
  const totalPages = appointmentsResult?.totalPages ?? 0;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] } as {
        queryKey: string[];
      });
      setDrawerOpen(false);
      setSelectedApt(null);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] } as {
        queryKey: string[];
      });
      setNotesOpen(false);
      setNotesApt(null);
      if (selectedApt)
        setSelectedApt((a) =>
          a ? { ...a, notes: notesApt?.notes ?? "" } : null,
        );
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      date?: string;
      start_time?: string;
      staff_id?: string;
      service_id?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] } as {
        queryKey: string[];
      });
      setEditForm(null);
      if (selectedApt) {
        queryClient.invalidateQueries({ queryKey: ["appointments"] } as {
          queryKey: string[];
        });
      }
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      setScheduleError("");
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: scheduleForm.patient_id,
          staff_id: scheduleForm.staff_id,
          clinic_location_id: scheduleForm.clinic_location_id,
          service_id: scheduleForm.service_id || null,
          date: scheduleForm.date,
          start_time: scheduleForm.time,
          notes: scheduleForm.notes || null,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setScheduleError(json.error || "Failed to schedule");
        throw new Error(json.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] } as {
        queryKey: string[];
      });
      setScheduleOpen(false);
      setScheduleForm({
        patient_id: "",
        staff_id: "",
        clinic_location_id: "",
        service_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "09:00",
        notes: "",
      });
    },
  });

  const canSchedule =
    appUser?.role === "ADMIN" || appUser?.role === "CLINIC_MANAGER";
  const canUpdateStatus =
    appUser?.role === "ADMIN" ||
    appUser?.role === "CLINIC_MANAGER" ||
    appUser?.role === "STAFF";
  const canEdit =
    appUser?.role === "ADMIN" || appUser?.role === "CLINIC_MANAGER";

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "scheduled":
        return "default";
      case "cancelled":
        return "destructive";
      case "no_show":
        return "warning";
      default:
        return "secondary";
    }
  };

  const openDrawer = (apt: AppointmentRow) => {
    setSelectedApt(apt);
    setEditForm(null);
    setDrawerOpen(true);
  };

  const startEdit = (apt: AppointmentRow) => {
    const start = new Date(apt.start_time);
    setEditForm({
      date: format(start, "yyyy-MM-dd"),
      time: format(start, "HH:mm"),
      staff_id: apt.staff_id,
      service_id: apt.service_id || "",
      notes: apt.notes || "",
    });
  };

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    return appointments.filter((apt) => {
      const start = new Date(apt.start_time);
      return (
        start >= slotStart &&
        start < slotEnd &&
        apt.status !== "cancelled" &&
        format(start, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      );
    });
  };

  if (isLoading && !appointmentsResult) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
              New Appointment
            </Button>
          )}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === "daily" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("daily")}
            >
              <List className="mr-2 h-4 w-4" />
              Daily
            </Button>
            <Button
              variant={viewMode === "weekly" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("weekly")}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Weekly
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <button
              onClick={() =>
                setDateOffset((d) => (viewMode === "weekly" ? d - 7 : d - 1))
              }
              className="rounded p-1 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[180px] text-center font-medium">
              {viewMode === "daily"
                ? format(viewDate, "EEEE, MMM d")
                : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`}
            </span>
            <button
              onClick={() =>
                setDateOffset((d) => (viewMode === "weekly" ? d + 7 : d + 1))
              }
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
          <Select
            value={statusFilter}
            onValueChange={(v) => setFilter("status", v)}
          >
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
          <Select
            value={clinicFilter}
            onValueChange={(v) => setFilter("clinic_id", v)}
          >
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
          {(appUser?.role === "ADMIN" ||
            appUser?.role === "CLINIC_MANAGER") && (
            <>
              <Select
                value={staffFilter}
                onValueChange={(v) => setFilter("staff_id", v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staffList?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={serviceFilter}
                onValueChange={(v) => setFilter("service_id", v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {servicesList?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {totalAppointments} appointments
            {viewMode === "daily"
              ? ` on ${format(viewDate, "MMM d")}`
              : ` this week`}
          </p>
        </CardHeader>
        <CardContent>
          {viewMode === "daily" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Daily view
                </p>
                <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                  {hours.map((hour) => {
                    const slotApts = getAppointmentsForSlot(viewDate, hour);
                    return (
                      <div key={hour} className="flex border-b last:border-b-0">
                        <div className="w-16 shrink-0 border-r bg-muted/30 px-2 py-2 text-sm font-medium">
                          {hour}:00
                        </div>
                        <div className="min-h-[60px] flex-1 p-2">
                          {slotApts.map((apt) => (
                            <button
                              key={apt.id}
                              onClick={() => openDrawer(apt)}
                              className="mb-2 w-full rounded-lg border border-primary/30 bg-primary/5 p-3 text-left transition hover:bg-primary/10"
                            >
                              <p className="font-medium">
                                {apt.patient
                                  ? `${apt.patient.first_name} ${apt.patient.last_name}`
                                  : "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(apt.service as { name?: string })?.name ||
                                  "—"}{" "}
                                •{" "}
                                {(apt.staff as { name?: string })?.name || "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(apt.start_time), "h:mm a")} –{" "}
                                {format(new Date(apt.end_time), "h:mm a")}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  List view
                </p>
                <TableContainer>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments
                        .filter((a) => a.status !== "cancelled")
                        .sort(
                          (a, b) =>
                            new Date(a.start_time).getTime() -
                            new Date(b.start_time).getTime(),
                        )
                        .map((apt) => (
                          <TableRow
                            key={apt.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openDrawer(apt)}
                          >
                            <TableCell className="font-medium">
                              {format(new Date(apt.start_time), "h:mm a")}
                            </TableCell>
                            <TableCell>
                              {apt.patient
                                ? `${apt.patient.first_name} ${apt.patient.last_name}`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {(apt.staff as { name?: string })?.name || "—"}
                            </TableCell>
                            <TableCell>
                              {(apt.service as { name?: string })?.name || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(apt.status)}>
                                {apt.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      {appointments.filter((a) => a.status !== "cancelled")
                        .length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-12 text-muted-foreground"
                          >
                            No appointments for this day
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="w-16 p-2 text-left text-sm font-medium text-muted-foreground">
                      Time
                    </th>
                    {weekDays.map((d) => (
                      <th
                        key={d.toISOString()}
                        className="min-w-[140px] p-2 text-center text-sm font-medium"
                      >
                        {format(d, "EEE M/d")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map((hour) => (
                    <tr key={hour} className="border-b">
                      <td className="w-16 shrink-0 border-r bg-muted/30 p-2 text-sm font-medium">
                        {hour}:00
                      </td>
                      {weekDays.map((day) => {
                        const slotApts = getAppointmentsForSlot(day, hour);
                        return (
                          <td
                            key={day.toISOString()}
                            className="min-w-[140px] align-top p-2"
                          >
                            {slotApts.map((apt) => (
                              <button
                                key={apt.id}
                                onClick={() => openDrawer(apt)}
                                className="mb-2 w-full rounded border border-primary/30 bg-primary/5 p-2 text-left text-xs transition hover:bg-primary/10"
                              >
                                <p className="font-medium truncate">
                                  {apt.patient
                                    ? `${apt.patient.first_name} ${apt.patient.last_name}`
                                    : "—"}
                                </p>
                                <p className="truncate text-muted-foreground">
                                  {(apt.service as { name?: string })?.name ||
                                    "—"}
                                </p>
                                <p className="truncate text-muted-foreground">
                                  {(apt.staff as { name?: string })?.name ||
                                    "—"}
                                </p>
                              </button>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Appointment Details</SheetTitle>
            <SheetDescription>
              {selectedApt ? formatDateTime(selectedApt.start_time) : "—"}
            </SheetDescription>
          </SheetHeader>
          {selectedApt && (
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Patient
                </h4>
                <Link
                  href={`/patients/${selectedApt.patient_id}`}
                  className="text-primary hover:underline"
                >
                  {selectedApt.patient
                    ? `${selectedApt.patient.first_name} ${selectedApt.patient.last_name}`
                    : "—"}
                </Link>
                {selectedApt.patient?.email && (
                  <p className="text-sm text-muted-foreground">
                    {selectedApt.patient.email}
                  </p>
                )}
                {selectedApt.patient?.phone && (
                  <p className="text-sm text-muted-foreground">
                    {selectedApt.patient.phone}
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Appointment
                </h4>
                <p>{(selectedApt.service as { name?: string })?.name || "—"}</p>
                <p>{(selectedApt.staff as { name?: string })?.name || "—"}</p>
                <p>
                  {(selectedApt.clinic_location as { name?: string })?.name ||
                    "—"}
                </p>
                <Badge variant={statusVariant(selectedApt.status)}>
                  {selectedApt.status}
                </Badge>
              </div>
              {selectedApt.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Notes
                  </h4>
                  <p className="text-sm">{selectedApt.notes}</p>
                </div>
              )}

              {editForm ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Edit Appointment</h4>
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, date: e.target.value } : null,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={editForm.time}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, time: e.target.value } : null,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Staff</Label>
                    <Select
                      value={editForm.staff_id}
                      onValueChange={(v) =>
                        setEditForm((f) => (f ? { ...f, staff_id: v } : null))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList
                          ?.filter(
                            (s) =>
                              !selectedApt.clinic_location_id ||
                              s.clinic_location_id ===
                                selectedApt.clinic_location_id,
                          )
                          ?.map((s) => (
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
                      value={editForm.service_id}
                      onValueChange={(v) =>
                        setEditForm((f) => (f ? { ...f, service_id: v } : null))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {servicesList?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Input
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, notes: e.target.value } : null,
                        )
                      }
                      placeholder="Notes..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        updateAppointmentMutation.mutate({
                          id: selectedApt.id,
                          date: editForm.date,
                          start_time: editForm.time,
                          staff_id: editForm.staff_id,
                          service_id: editForm.service_id || undefined,
                          notes: editForm.notes,
                        })
                      }
                      disabled={updateAppointmentMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditForm(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {canEdit && selectedApt.status === "scheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(selectedApt)}
                    >
                      Edit
                    </Button>
                  )}
                  {canUpdateStatus && selectedApt.status === "scheduled" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedApt.id,
                            status: "completed",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Completed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedApt.id,
                            status: "no_show",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Mark No Show
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedApt.id,
                            status: "cancelled",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotesApt({
                        id: selectedApt.id,
                        notes: selectedApt.notes || "",
                      });
                      setNotesOpen(true);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Add Notes
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>Schedule a new appointment</DialogDescription>
          </DialogHeader>
          {scheduleError && (
            <p className="text-sm text-destructive">{scheduleError}</p>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Patient</Label>
              <Select
                value={scheduleForm.patient_id}
                onValueChange={(v) =>
                  setScheduleForm((f) => ({ ...f, patient_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map(
                    (p: {
                      id: string;
                      first_name: string;
                      last_name: string;
                    }) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Clinic</Label>
              <Select
                value={scheduleForm.clinic_location_id}
                onValueChange={(v) =>
                  setScheduleForm((f) => ({
                    ...f,
                    clinic_location_id: v,
                    staff_id: "",
                  }))
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
                onValueChange={(v) =>
                  setScheduleForm((f) => ({ ...f, staff_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {(scheduleForm.clinic_location_id
                    ? staffList?.filter(
                        (s) =>
                          s.clinic_location_id ===
                          scheduleForm.clinic_location_id,
                      )
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
                onValueChange={(v) =>
                  setScheduleForm((f) => ({ ...f, service_id: v }))
                }
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
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, time: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes (optional)</Label>
              <Input
                value={scheduleForm.notes}
                onChange={(e) =>
                  setScheduleForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
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
            <DialogDescription>
              Add or update notes for this appointment
            </DialogDescription>
          </DialogHeader>
          {notesApt && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input
                  value={notesApt.notes}
                  onChange={(e) =>
                    setNotesApt((n) =>
                      n ? { ...n, notes: e.target.value } : null,
                    )
                  }
                  placeholder="Clinical notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                notesApt &&
                updateNotesMutation.mutate({
                  id: notesApt.id,
                  notes: notesApt.notes,
                })
              }
              disabled={!notesApt || updateNotesMutation.isPending}
            >
              {updateNotesMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
