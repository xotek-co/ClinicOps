"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useSupabase } from "@/lib/supabaseContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search as SearchIcon } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default function SearchPage() {
  const supabase = useSupabase()
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => {
      if (!supabase || !debounced || debounced.length < 2) return { patients: [], staff: [], appointments: [] }
      const q = `%${debounced}%`
      const [patientsRes, staffRes, appointmentsRes] = await Promise.all([
        supabase
          .from("patients")
          .select("id, first_name, last_name, email")
          .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`)
          .limit(10),
        supabase
          .from("staff")
          .select("id, name, email")
          .or(`name.ilike.${q},email.ilike.${q}`)
          .limit(10),
        supabase
          .from("appointments")
          .select("id, start_time, status, patient_id, patient:patients(first_name, last_name), staff:staff(name)")
          .gte("start_time", new Date().toISOString())
          .order("start_time")
          .limit(10),
      ])
      return {
        patients: patientsRes.data ?? [],
        staff: staffRes.data ?? [],
        appointments: appointmentsRes.data ?? [],
      }
    },
    enabled: !!supabase && !!debounced && debounced.length >= 2,
  })

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">
          Search patients, staff, and appointments
        </p>
      </div>

      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {debounced.length < 2 && (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
      )}

      {debounced.length >= 2 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Patients</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <ul className="space-y-2">
                  {results?.patients.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/patients/${p.id}`}
                        className="hover:underline text-primary font-medium"
                      >
                        {p.first_name} {p.last_name}
                      </Link>
                      {p.email && (
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      )}
                    </li>
                  ))}
                  {results?.patients.length === 0 && (
                    <p className="text-sm text-muted-foreground">No patients found</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <ul className="space-y-2">
                  {results?.staff.map((s) => (
                    <li key={s.id}>
                      <span className="font-medium">{s.name}</span>
                      {s.email && (
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      )}
                    </li>
                  ))}
                  {results?.staff.length === 0 && (
                    <p className="text-sm text-muted-foreground">No staff found</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <ul className="space-y-2">
                  {results?.appointments.map((apt) => (
                    <li key={apt.id}>
                      <Link
                        href={`/patients/${apt.patient_id}`}
                        className="hover:underline text-primary"
                      >
                        {(apt.patient as { first_name?: string; last_name?: string })?.first_name}{" "}
                        {(apt.patient as { first_name?: string; last_name?: string })?.last_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(apt.start_time)} • {(apt.staff as { name?: string })?.name}
                      </p>
                      <Badge variant="secondary" className="mt-1">{apt.status}</Badge>
                    </li>
                  ))}
                  {results?.appointments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
