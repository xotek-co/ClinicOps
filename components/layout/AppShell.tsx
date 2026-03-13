"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/layout/Sidebar";
import { SupabaseGuard } from "@/components/SupabaseGuard";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { Menu, Stethoscope } from "lucide-react";

const AUTH_PATHS = ["/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              ClinicOps
            </span>
          </div>
        </div>
        <NotificationBell />
      </header>

      <MobileSidebar
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      />

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 page-bg">
          <div className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 h-screen overflow-y-auto">
            <SupabaseGuard>{children}</SupabaseGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
