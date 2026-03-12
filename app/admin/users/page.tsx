"use client";

import { useState, useEffect } from "react";
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, UserPlus, Pencil, Search } from "lucide-react";
import { useTableState } from "@/lib/use-table-data";
import { Skeleton } from "@/components/ui/skeleton";

const ROLES = ["ADMIN", "CLINIC_MANAGER", "STAFF"] as const;

export default function AdminUsersPage() {
  const supabase = useSupabase();
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    clinic_location_id: string | null;
    is_active: boolean;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF" as const,
    clinic_location_id: "",
  });

  const { state, setPage, setLimit, setSearch, setSort, setFilter, buildUrl } =
    useTableState(10);
  const [searchInput, setSearchInput] = useState("");
  const roleFilter = state.filters.role ?? "all";
  const clinicFilter = state.filters.clinic_id ?? "all";
  const statusFilter = state.filters.is_active ?? "all";

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-users", state],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/users"), {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch");
      }
      return res.json();
    },
    enabled: !!appUser?.organization_id && appUser?.role === "ADMIN",
  });

  const users = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;

  const { data: clinics } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      if (!supabase || !appUser?.organization_id) return [];
      const { data } = await supabase
        .from("clinic_locations")
        .select("id, name")
        .eq("organization_id", appUser.organization_id)
        .order("name");
      return data ?? [];
    },
    enabled: !!supabase && !!appUser?.organization_id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase not configured");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password || undefined,
          name: form.name,
          role: form.role,
          clinic_location_id: form.clinic_location_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateOpen(false);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "STAFF",
        clinic_location_id: "",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser || !supabase) return;
      const { error } = await supabase
        .from("users")
        .update({
          name: editingUser.name,
          role: editingUser.role,
          clinic_location_id: editingUser.clinic_location_id || null,
          is_active: editingUser.is_active,
        })
        .eq("id", editingUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditOpen(false);
      setEditingUser(null);
    },
  });

  if (appUser?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Create staff accounts, assign roles, and manage access
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => setFilter("role", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={clinicFilter}
            onValueChange={(v) => setFilter("clinic_id", v)}
          >
            <SelectTrigger className="w-[140px]">
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
          <Select
            value={statusFilter}
            onValueChange={(v) => setFilter("is_active", v)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Users
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} users in your organization
          </p>
        </CardHeader>
        <CardContent>
          {isLoading && !result ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
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
                        label="Email"
                        column="email"
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
                      <SortableHeader
                        label="Status"
                        column="is_active"
                        currentSort={state.sortColumn}
                        ascending={state.sortAsc}
                        onSort={setSort}
                      />
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground"
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map(
                        (u: {
                          id: string;
                          name: string;
                          email: string;
                          role: string;
                          clinic_location_id: string | null;
                          clinic_location?: { name?: string };
                          is_active: boolean;
                        }) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {u.name}
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge>{u.role}</Badge>
                            </TableCell>
                            <TableCell>
                              {(u.clinic_location as { name?: string })?.name ??
                                "—"}
                            </TableCell>
                            <TableCell>
                              <Badge>
                                {u.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => {
                                  setEditingUser({
                                    id: u.id,
                                    name: u.name,
                                    email: u.email,
                                    role: u.role,
                                    clinic_location_id: u.clinic_location_id,
                                    is_active: u.is_active,
                                  });
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ),
                      )
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
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a new staff account. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="Leave blank for default"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as typeof form.role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Clinic (for Staff/Manager)</Label>
              <Select
                value={form.clinic_location_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, clinic_location_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All / None</SelectItem>
                  {clinics?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.email || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update role, clinic assignment, or deactivate user.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser((u) =>
                      u ? { ...u, name: e.target.value } : null,
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={editingUser.email} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(v) =>
                    setEditingUser((u) => (u ? { ...u, role: v } : null))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Clinic</Label>
                <Select
                  value={editingUser.clinic_location_id ?? ""}
                  onValueChange={(v) =>
                    setEditingUser((u) =>
                      u ? { ...u, clinic_location_id: v || null } : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {clinics?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editingUser.is_active ? "active" : "inactive"}
                  onValueChange={(v) =>
                    setEditingUser((u) =>
                      u ? { ...u, is_active: v === "active" } : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!editingUser || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
