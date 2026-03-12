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
import { ClipboardList, Plus, Pencil, Search } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useTableState } from "@/lib/use-table-data"

export default function ServicesPage() {
  const supabase = useSupabase()
  const { appUser } = useAuth()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingService, setEditingService] = useState<{
    id: string
    name: string
    duration: number
    price: number
  } | null>(null)
  const [form, setForm] = useState({ name: "", duration: 30, price: 0 })

  const { state, setPage, setLimit, setSearch, setSort, buildUrl } = useTableState(10)
  const [searchInput, setSearchInput] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput, setSearch])

  const { data: result, isLoading } = useQuery({
    queryKey: ["services", state],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/services"), { credentials: "include" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to fetch")
      }
      return res.json()
    },
    enabled: !!appUser?.organization_id && appUser?.role === "ADMIN",
  })

  const services = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 0

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase not configured")
      const { error } = await supabase.from("services").insert({
        organization_id: appUser!.organization_id,
        name: form.name,
        duration: form.duration,
        price: form.price,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] })
      setCreateOpen(false)
      setForm({ name: "", duration: 30, price: 0 })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingService || !supabase) return
      const { error } = await supabase
        .from("services")
        .update({
          name: editingService.name,
          duration: editingService.duration,
          price: editingService.price,
        })
        .eq("id", editingService.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] })
      setEditOpen(false)
      setEditingService(null)
    },
  })

  if (appUser?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Service Catalog</h1>
          <p className="text-muted-foreground">
            Manage services, durations, and pricing
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Services
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} services
          </p>
        </CardHeader>
        <CardContent>
          {isLoading && !result ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
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
                        label="Duration (min)"
                        column="duration"
                        currentSort={state.sortColumn}
                        ascending={state.sortAsc}
                        onSort={setSort}
                      />
                      <SortableHeader
                        label="Price"
                        column="price"
                        currentSort={state.sortColumn}
                        ascending={state.sortAsc}
                        onSort={setSort}
                      />
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          No services found
                        </TableCell>
                      </TableRow>
                    ) : (
                      services.map((s: { id: string; name: string; duration: number; price: number }) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.duration}</TableCell>
                          <TableCell>{formatCurrency(Number(s.price))}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingService({
                                  id: s.id,
                                  name: s.name,
                                  duration: s.duration,
                                  price: Number(s.price),
                                })
                                setEditOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>Create a new service</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="General Checkup"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={form.duration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                }
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
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service details</DialogDescription>
          </DialogHeader>
          {editingService && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={editingService.name}
                  onChange={(e) =>
                    setEditingService((s) => (s ? { ...s, name: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={editingService.duration}
                  onChange={(e) =>
                    setEditingService((s) =>
                      s ? { ...s, duration: parseInt(e.target.value) || 0 } : null
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingService.price}
                  onChange={(e) =>
                    setEditingService((s) =>
                      s ? { ...s, price: parseFloat(e.target.value) || 0 } : null
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!editingService || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
