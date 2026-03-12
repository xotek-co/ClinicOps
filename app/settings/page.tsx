"use client"

import { useQuery } from "@tanstack/react-query"
import { useSupabase } from "@/lib/supabaseContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Building2, Database, Key } from "lucide-react"

export default function SettingsPage() {
  const supabase = useSupabase()

  const { data: org } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      if (!supabase) return null
      const { data } = await supabase.from("organizations").select("*").limit(1).maybeSingle()
      return data
    },
  })

  const { data: counts } = useQuery({
    queryKey: ["settings-counts"],
    queryFn: async () => {
      if (!supabase) return null
      const [clinics, staff, patients, appointments] = await Promise.all([
        supabase.from("clinic_locations").select("id", { count: "exact", head: true }),
        supabase.from("staff").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
      ])
      return {
        clinics: clinics.count ?? 0,
        staff: staff.count ?? 0,
        patients: patients.count ?? 0,
        appointments: appointments.count ?? 0,
      }
    },
  })

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Organization and platform configuration
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your organization details
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{org?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organization ID</p>
              <p className="font-mono text-sm text-muted-foreground">{org?.id || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Current data in your organization
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{counts?.clinics ?? 0}</p>
                <p className="text-sm text-muted-foreground">Clinic Locations</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{counts?.staff ?? 0}</p>
                <p className="text-sm text-muted-foreground">Staff Members</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{counts?.patients ?? 0}</p>
                <p className="text-sm text-muted-foreground">Patients</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{counts?.appointments ?? 0}</p>
                <p className="text-sm text-muted-foreground">Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Supabase Connection
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure your Supabase project
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Add the following environment variables to <code className="rounded bg-muted px-1 py-0.5">.env.local</code>:
          </p>
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For seed script only`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Run the SQL migrations in <code className="rounded bg-muted px-1 py-0.5">supabase/migrations/</code> in your
            Supabase SQL Editor, then run <code className="rounded bg-muted px-1 py-0.5">npm run db:seed</code> to populate demo data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
