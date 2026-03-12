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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Users, Search, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useTableState } from "@/lib/use-table-data";

export default function PatientsPage() {
  const supabase = useSupabase();
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    notes: "",
  });

  const { state, setPage, setLimit, setSearch, setSort, buildUrl } =
    useTableState(10);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  const {
    data: result,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["patients", state],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/patients"), {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch");
      }
      return res.json();
    },
  });

  const patients = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("patients").insert({
        organization_id: appUser!.organization_id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setCreateOpen(false);
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        notes: "",
      });
    },
  });

  const canManage =
    appUser?.role === "ADMIN" || appUser?.role === "CLINIC_MANAGER";

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            View and manage patient records
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          )}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Patient Directory
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isFetching && !result ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              `${total} patients`
            )}
          </p>
        </CardHeader>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Name"
                    column="last_name"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                  <TableHead>Contact</TableHead>
                  <SortableHeader
                    label="Date of Birth"
                    column="date_of_birth"
                    currentSort={state.sortColumn}
                    ascending={state.sortAsc}
                    onSort={setSort}
                  />
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  Array.from({ length: state.limit }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map(
                    (patient: {
                      id: string;
                      first_name: string;
                      last_name: string;
                      email?: string;
                      phone?: string;
                      date_of_birth?: string;
                      notes?: string;
                    }) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="hover:underline text-primary"
                          >
                            {patient.first_name} {patient.last_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {patient.email && (
                              <p className="text-sm">{patient.email}</p>
                            )}
                            {patient.phone && (
                              <p className="text-sm text-muted-foreground">
                                {patient.phone}
                              </p>
                            )}
                            {!patient.email && !patient.phone && "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {patient.date_of_birth
                            ? formatDate(patient.date_of_birth)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {patient.notes ? <Badge>{patient.notes}</Badge> : "—"}
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
            isLoading={isFetching}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient</DialogTitle>
            <DialogDescription>Create a new patient record</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  placeholder="John"
                />
              </div>
              <div className="grid gap-2">
                <Label>Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="555-1234"
              />
            </div>
            <div className="grid gap-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={form.date_of_birth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date_of_birth: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Allergies, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !form.first_name || !form.last_name || createMutation.isPending
              }
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
