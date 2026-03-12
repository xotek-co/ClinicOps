"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Calendar,
  BarChart3,
  Settings,
  Stethoscope,
  LogOut,
  Shield,
  ClipboardList,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"

function NavItems() {
  const pathname = usePathname()
  const { appUser } = useAuth()

  const baseItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"] },
    { href: "/appointments", label: "Appointments", icon: Calendar, roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"] },
    { href: "/patients", label: "Patients", icon: Users, roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"] },
    { href: "/clinics", label: "Clinics", icon: Building2, roles: ["ADMIN", "CLINIC_MANAGER"] },
    { href: "/staff", label: "Staff", icon: UserCog, roles: ["ADMIN", "CLINIC_MANAGER"] },
    { href: "/services", label: "Services", icon: ClipboardList, roles: ["ADMIN"] },
    { href: "/admin/users", label: "Users", icon: Shield, roles: ["ADMIN"] },
    { href: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "CLINIC_MANAGER"] },
    { href: "/search", label: "Search", icon: Search, roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"] },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
  ]

  const role = appUser?.role ?? "STAFF"
  const navItems = baseItems.filter((item) => item.roles.includes(role))

  return (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

export function Sidebar() {
  const router = useRouter()
  const { appUser, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-full flex-col">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 border-b border-border px-6 py-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">ClinicOps</span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <NavItems />
        </nav>
        <div className="border-t border-border p-4 space-y-2">
          {appUser && (
            <p className="text-xs text-muted-foreground truncate" title={appUser.email}>
              {appUser.name} {appUser.role && `(${appUser.role})`}
            </p>
          )}
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  )
}
