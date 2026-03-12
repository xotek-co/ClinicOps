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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { UserCog, Mail, Phone, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { useTableState } from "@/lib/use-table-data"

export default function StaffPage() {
  const supabase = useSupabase()
  const { state, setPage, setLimit, setSearch, setSort, setFilter, buildUrl } = useTableState(10)
  const [searchInput, setSearchInput] = useState("")
  const clinicFilter = state.filters.clinic_id ?? "all"
  const statusFilter = state.filters.status ?? "all"

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput, setSearch])

  const { data: clinics } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from("clinic_locations").select("id, name").order("name")
      return data || []
    },
  })

  const { data: result, isLoading } = useQuery({
    queryKey: ["staff", state],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/staff"), { credentials: "include" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to fetch")
      }
      return res.json()
    },
  })

  const staff = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 0

  if (isLoading && !result) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">
            Manage clinicians and team members
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={clinicFilter} onValueChange={(v) => setFilter("clinic_id", v)}>
            <SelectTrigger className="w-[180px]">
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
          <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Team Directory
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} staff members
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
                  <SortableHeader
                    label="Role"
                    column="role"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                  <TableHead>Clinic</TableHead>
                  <TableHead>Contact</TableHead>
                  <SortableHeader
                    label="Status"
                    column="status"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No staff found
                    </TableCell>
                  </TableRow>
                ) : (
                  staff.map((s: { id: string; name: string; role: string; email?: string; phone?: string; status: string; clinic_location?: { name?: string } }) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {s.clinic_location?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {s.email && (
                            <p className="text-sm flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {s.email}
                            </p>
                          )}
                          {s.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {s.phone}
                            </p>
                          )}
                          {!s.email && !s.phone && "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "active"
                              ? "success"
                              : s.status === "on_leave"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {s.status}
                        </Badge>
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
