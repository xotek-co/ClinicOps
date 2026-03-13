"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Calendar,
  CalendarDays,
  BarChart3,
  Settings,
  Stethoscope,
  LogOut,
  Shield,
  ClipboardList,
  Search,
  Sparkles,
  Menu,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";

type NavItemsProps = {
  collapsed: boolean;
  onNavigate?: () => void;
};

function NavItems({ collapsed, onNavigate }: NavItemsProps) {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const baseItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"],
    },
    {
      href: "/schedule",
      label: "My Schedule",
      icon: CalendarDays,
      roles: ["CLINIC_MANAGER", "STAFF"],
    },
    {
      href: "/appointments",
      label: "Appointments",
      icon: Calendar,
      roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"],
    },
    {
      href: "/patients",
      label: "Patients",
      icon: Users,
      roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"],
    },
    {
      href: "/clinics",
      label: "Clinics",
      icon: Building2,
      roles: ["ADMIN", "CLINIC_MANAGER"],
    },
    {
      href: "/staff",
      label: "Staff",
      icon: UserCog,
      roles: ["ADMIN", "CLINIC_MANAGER"],
    },
    {
      href: "/services",
      label: "Services",
      icon: ClipboardList,
      roles: ["ADMIN"],
    },
    { href: "/admin/users", label: "Users", icon: Shield, roles: ["ADMIN"] },
    {
      href: "/reports",
      label: "Reports",
      icon: BarChart3,
      roles: ["ADMIN", "CLINIC_MANAGER"],
    },
    {
      href: "/search",
      label: "Search",
      icon: Search,
      roles: ["ADMIN", "CLINIC_MANAGER", "STAFF"],
    },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
  ];

  const role = appUser?.role ?? "STAFF";
  const navItems = baseItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const router = useRouter();
  const { appUser, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "hidden md:block border-b md:border-b-0 md:border-r border-border bg-card/95 md:h-screen transition-all duration-200",
        collapsed ? "w-16" : "w-full md:w-64",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight whitespace-nowrap">
                ClinicOps
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden md:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <nav
          className={cn(
            "flex flex-1 flex-col space-y-1 overflow-y-auto overflow-x-hidden p-2 md:p-4",
            collapsed && "items-center",
          )}
        >
          <NavItems collapsed={collapsed} />
        </nav>
        <div className="border-t border-border p-3 md:p-4 space-y-2">
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-end",
            )}
          >
            <NotificationBell />
          </div>
          {appUser && !collapsed && (
            <p
              className="text-xs text-muted-foreground truncate"
              title={appUser.email}
            >
              {appUser.name} {appUser.role && `(${appUser.role})`}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              collapsed && "justify-center px-0",
            )}
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}

type MobileSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const router = useRouter();
  const { appUser, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
    onOpenChange(false);
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 md:hidden transition pointer-events-none",
        open && "pointer-events-auto",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 transition-opacity",
          open && "opacity-100",
        )}
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 max-w-full flex-col border-r border-border bg-card/95 shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            onClick={() => onOpenChange(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight whitespace-nowrap">
              ClinicOps
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => onOpenChange(false)}
            aria-label="Close navigation menu"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <NavItems
            collapsed={false}
            onNavigate={() => {
              onOpenChange(false);
            }}
          />
        </nav>
        <div className="border-t border-border p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <NotificationBell />
            {appUser && (
              <p
                className="text-xs text-muted-foreground truncate"
                title={appUser.email}
              >
                {appUser.name} {appUser.role && `(${appUser.role})`}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>
    </div>
  );
}
