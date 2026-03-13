"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Mail, Phone, Calendar, FileText } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/utils"

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const patientId = params.id as string

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase not configured")
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!patientId,
  })

  const { data: appointments } = useQuery({
    queryKey: ["patient-appointments", patientId],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from("appointments")
        .select("*, staff:staff(name), clinic_location:clinic_locations(name), service:services(name)")
        .eq("patient_id", patientId)
        .order("start_time", { ascending: false })
        .limit(20)
      return data ?? []
    },
    enabled: !!patientId,
  })

  if (isLoading || !patient) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success"
      case "scheduled": return "default"
      case "cancelled": return "destructive"
      case "no_show": return "warning"
      default: return "secondary"
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="text-muted-foreground">Patient profile</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{patient.email || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{patient.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{patient.date_of_birth ? formatDate(patient.date_of_birth) : "—"}</span>
            </div>
            {patient.notes && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Notes</p>
                <p className="text-muted-foreground">{patient.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit History</CardTitle>
            <p className="text-sm text-muted-foreground">
              {appointments?.length ?? 0} appointments
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments?.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell>{formatDateTime(apt.start_time)}</TableCell>
                    <TableCell>{(apt.clinic_location as { name?: string })?.name ?? "—"}</TableCell>
                    <TableCell>{(apt.staff as { name?: string })?.name ?? "—"}</TableCell>
                    <TableCell>{(apt.service as { name?: string })?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!appointments || appointments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No appointments yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
