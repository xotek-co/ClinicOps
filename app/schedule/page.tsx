"use client"

import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateTime } from "@/lib/utils"
import {
  Calendar,
  CheckCircle,
  UserX,
  FileText,
  Clock,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { format, startOfDay, endOfDay } from "date-fns"

type AppointmentRow = {
  id: string
  patient_id: string
  staff_id: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  patient?: { first_name: string; last_name: string; email?: string; phone?: string }
  staff?: { name?: string }
  clinic_location?: { name?: string }
  service?: { name?: string }
}

export default function MySchedulePage() {
  const { appUser } = useAuth()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedApt, setSelectedApt] = useState<AppointmentRow | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesApt, setNotesApt] = useState<{ id: string; notes: string } | null>(null)

  const todayStart = format(startOfDay(new Date()), "yyyy-MM-dd")
  const todayEnd = format(endOfDay(new Date()), "yyyy-MM-dd")

  const { data: appointmentsResult, isLoading } = useQuery({
    queryKey: ["my-schedule", appUser?.clinic_location_id, appUser?.staff_id],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: todayStart,
        end_date: todayEnd,
        limit: "50",
      })
      if ((appUser as { staff_id?: string })?.staff_id)
        params.set("staff_id", (appUser as { staff_id: string }).staff_id)
      else if (appUser?.clinic_location_id)
        params.set("clinic_id", appUser.clinic_location_id)
      const res = await fetch(`/api/appointments?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    enabled: !!appUser?.organization_id,
  })

  const appointments: AppointmentRow[] = appointmentsResult?.data ?? []
  const todayAppointments = appointments
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const upcomingAppointments = todayAppointments.filter(
    (a) => new Date(a.start_time) >= new Date()
  )
  const pastAppointments = todayAppointments.filter(
    (a) => new Date(a.start_time) < new Date()
  )

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-schedule"] } as { queryKey: string[] })
      setDrawerOpen(false)
      setSelectedApt(null)
    },
  })

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-schedule"] } as { queryKey: string[] })
      setNotesOpen(false)
      setNotesApt(null)
    },
  })

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

  if (!appUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Please sign in to view your schedule.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">
          Today&apos;s appointments and quick actions
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Appointments
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {todayAppointments.length} appointments
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-20" />
                  </div>
                ))}
              </div>
            ) : todayAppointments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No appointments for today
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">
                        {format(new Date(apt.start_time), "h:mm a")}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            setSelectedApt(apt)
                            setDrawerOpen(true)
                          }}
                          className="text-left font-medium text-primary hover:underline"
                        >
                          {apt.patient
                            ? `${apt.patient.first_name} ${apt.patient.last_name}`
                            : "—"}
                        </button>
                      </TableCell>
                      <TableCell>
                        {(apt.service as { name?: string })?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {apt.status === "scheduled" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: apt.id, status: "completed" })
                              }
                              disabled={updateStatusMutation.isPending}
                              title="Mark completed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: apt.id, status: "no_show" })
                              }
                              disabled={updateStatusMutation.isPending}
                              title="Mark no show"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNotesApt({ id: apt.id, notes: apt.notes || "" })
                                setNotesOpen(true)
                              }}
                              title="Add notes"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Next {upcomingAppointments.length} appointments today
            </p>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No upcoming appointments
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingAppointments.slice(0, 5).map((apt) => (
                  <li key={apt.id}>
                    <button
                      onClick={() => {
                        setSelectedApt(apt)
                        setDrawerOpen(true)
                      }}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">
                          {apt.patient
                            ? `${apt.patient.first_name} ${apt.patient.last_name}`
                            : "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(apt.start_time), "h:mm a")} •{" "}
                          {(apt.service as { name?: string })?.name || "—"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click an appointment to view details and update status
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border px-4 py-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-sm">Mark Completed</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-4 py-2">
              <UserX className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Mark No Show</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-4 py-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm">Add Notes</span>
            </div>
          </div>
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
                <h4 className="text-sm font-medium text-muted-foreground">Patient</h4>
                <Link
                  href={`/patients/${selectedApt.patient_id}`}
                  className="text-primary hover:underline"
                >
                  {selectedApt.patient
                    ? `${selectedApt.patient.first_name} ${selectedApt.patient.last_name}`
                    : "—"}
                </Link>
                {selectedApt.patient?.email && (
                  <p className="text-sm text-muted-foreground">{selectedApt.patient.email}</p>
                )}
                {selectedApt.patient?.phone && (
                  <p className="text-sm text-muted-foreground">{selectedApt.patient.phone}</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Appointment</h4>
                <p>{(selectedApt.service as { name?: string })?.name || "—"}</p>
                <p>{(selectedApt.staff as { name?: string })?.name || "—"}</p>
                <p>{(selectedApt.clinic_location as { name?: string })?.name || "—"}</p>
                <Badge variant={statusVariant(selectedApt.status)}>{selectedApt.status}</Badge>
              </div>
              {selectedApt.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                  <p className="text-sm">{selectedApt.notes}</p>
                </div>
              )}
              {selectedApt.status === "scheduled" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      updateStatusMutation.mutate({ id: selectedApt.id, status: "completed" })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Completed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateStatusMutation.mutate({ id: selectedApt.id, status: "no_show" })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Mark No Show
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setNotesApt({ id: selectedApt.id, notes: selectedApt.notes || "" })
                      setNotesOpen(true)
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
            <Button variant="outline" onClick={() => setNotesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                notesApt &&
                updateNotesMutation.mutate({ id: notesApt.id, notes: notesApt.notes })
              }
              disabled={!notesApt || updateNotesMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
