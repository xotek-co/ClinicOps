"use client"

import { useState, useEffect } from "react"
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
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { SortableHeader } from "@/components/ui/sortable-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, MapPin, Clock, Plus, Pencil, Archive, RotateCcw, Search } from "lucide-react"
import { useTableState } from "@/lib/use-table-data"

export default function ClinicsPage() {
  const supabase = useSupabase()
  const { appUser } = useAuth()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingClinic, setEditingClinic] = useState<{
    id: string
    name: string
    address: string
    timezone: string
    archived: boolean
  } | null>(null)
  const [form, setForm] = useState({ name: "", address: "", timezone: "America/New_York" })

  const { state, setPage, setLimit, setSearch, setSort, setFilter, buildUrl } = useTableState(10)
  const [searchInput, setSearchInput] = useState("")
  const archivedFilter = state.filters.archived ?? "all"

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput, setSearch])

  const { data: clinics, isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase not configured")
      const { data, error } = await supabase
        .from("clinic_locations")
        .select("*")
        .order("name")
      if (error) throw error
      return data
    },
  })

  const { data: tableResult, isLoading: tableLoading } = useQuery({
    queryKey: ["clinics-table", state],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/clinics"), { credentials: "include" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to fetch")
      }
      return res.json()
    },
  })

  const tableClinics = tableResult?.data ?? []
  const tableTotal = tableResult?.total ?? 0
  const tableTotalPages = tableResult?.totalPages ?? 0

  const { data: stats } = useQuery({
    queryKey: ["clinic-stats"],
    queryFn: async () => {
      if (!supabase) return { revenue: [], appointments: [], staff: [] }
      const { data: revenue } = await supabase
        .from("revenue_records")
        .select("clinic_location_id, amount")
      const { data: appointments } = await supabase
        .from("appointments")
        .select("clinic_location_id, status")
      const { data: staff } = await supabase
        .from("staff")
        .select("clinic_location_id")
      return { revenue: revenue || [], appointments: appointments || [], staff: staff || [] }
    },
  })

  const getClinicStats = (clinicId: string) => {
    if (!stats) return { revenue: 0, appointments: 0, staff: 0 }
    const revenue = stats.revenue
      .filter((r) => r.clinic_location_id === clinicId)
      .reduce((s, r) => s + Number(r.amount), 0)
    const appointments = stats.appointments.filter(
      (a) => a.clinic_location_id === clinicId && a.status === "completed"
    ).length
    const staffCount = stats.staff.filter(
      (s) => s.clinic_location_id === clinicId
    ).length
    return { revenue, appointments, staff: staffCount }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase not configured")
      const { error } = await supabase.from("clinic_locations").insert({
        organization_id: appUser!.organization_id,
        name: form.name,
        address: form.address || null,
        timezone: form.timezone,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinics"] })
      queryClient.invalidateQueries({ queryKey: ["clinics-table"] })
      setCreateOpen(false)
      setForm({ name: "", address: "", timezone: "America/New_York" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingClinic || !supabase) return
      const { error } = await supabase
        .from("clinic_locations")
        .update({
          name: editingClinic.name,
          address: editingClinic.address || null,
          timezone: editingClinic.timezone,
          archived: editingClinic.archived,
        })
        .eq("id", editingClinic.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinics"] })
      queryClient.invalidateQueries({ queryKey: ["clinics-table"] })
      setEditOpen(false)
      setEditingClinic(null)
    },
  })

  const activeClinics = clinics?.filter((c) => !c.archived) ?? []
  const isAdmin = appUser?.role === "ADMIN"
  const isManager = appUser?.role === "CLINIC_MANAGER"
  const canManageClinic = (clinicId: string) =>
    isAdmin || (isManager && appUser?.clinic_location_id === clinicId)

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
          <h1 className="text-3xl font-bold tracking-tight">Clinics</h1>
          <p className="text-muted-foreground">
            Manage your clinic locations and view performance
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clinics..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={archivedFilter} onValueChange={(v) => setFilter("archived", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="false">Active</SelectItem>
              <SelectItem value="true">Archived</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Clinic
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {activeClinics.map((clinic) => {
          const s = getClinicStats(clinic.id)
          return (
            <Card key={clinic.id} className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {clinic.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" />
                  {clinic.address || "—"}
                </p>
                <div className="flex gap-4 text-sm">
                  <span>${s.revenue.toLocaleString()} rev</span>
                  <span>{s.appointments} appts</span>
                  <span>{s.staff} staff</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <p className="text-sm text-muted-foreground">
            {tableTotal} locations
          </p>
        </CardHeader>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Name"
                    column="name"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                  <TableHead>Address</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableClinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No clinics found
                    </TableCell>
                  </TableRow>
                ) : (
                  tableClinics.map((clinic: { id: string; name: string; address?: string; timezone?: string; archived?: boolean }) => (
                <TableRow key={clinic.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {clinic.name}
                      {clinic.archived && (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{clinic.address || "—"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {clinic.timezone}
                    </span>
                  </TableCell>
                  <TableCell>{getClinicStats(clinic.id).staff}</TableCell>
                  <TableCell>
                    {canManageClinic(clinic.id) ? (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit clinic"
                          onClick={() => {
                            setEditingClinic({
                              id: clinic.id,
                              name: clinic.name,
                              address: clinic.address || "",
                              timezone: clinic.timezone || "America/New_York",
                              archived: clinic.archived || false,
                            })
                            setEditOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!clinic.archived ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Archive clinic"
                            onClick={async () => {
                              if (!supabase) return
                              await supabase
                                .from("clinic_locations")
                                .update({ archived: true })
                                .eq("id", clinic.id)
                              queryClient.invalidateQueries({ queryKey: ["clinics"] })
                              queryClient.invalidateQueries({ queryKey: ["clinics-table"] })
                            }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Restore clinic"
                            onClick={async () => {
                              if (!supabase) return
                              await supabase
                                .from("clinic_locations")
                                .update({ archived: false })
                                .eq("id", clinic.id)
                              queryClient.invalidateQueries({ queryKey: ["clinics"] })
                              queryClient.invalidateQueries({ queryKey: ["clinics-table"] })
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <DataTablePagination
            page={state.page}
            limit={state.limit}
            total={tableTotal}
            totalPages={tableTotalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
            isLoading={tableLoading}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Clinic</DialogTitle>
            <DialogDescription>Create a new clinic location</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Downtown Medical Center"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="America/New_York"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Clinic</DialogTitle>
            <DialogDescription>Update clinic details or archive</DialogDescription>
          </DialogHeader>
          {editingClinic && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={editingClinic.name}
                  onChange={(e) =>
                    setEditingClinic((c) => (c ? { ...c, name: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={editingClinic.address}
                  onChange={(e) =>
                    setEditingClinic((c) => (c ? { ...c, address: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Timezone</Label>
                <Input
                  value={editingClinic.timezone}
                  onChange={(e) =>
                    setEditingClinic((c) => (c ? { ...c, timezone: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Archived</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingClinic.archived ? "yes" : "no"}
                  onChange={(e) =>
                    setEditingClinic((c) =>
                      c ? { ...c, archived: e.target.value === "yes" } : null
                    )
                  }
                >
                  <option value="no">Active</option>
                  <option value="yes">Archived</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!editingClinic || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
