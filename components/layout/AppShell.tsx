"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { SupabaseGuard } from "@/components/SupabaseGuard"

const AUTH_PATHS = ["/login", "/signup"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pl-64 min-h-screen page-bg">
        <SupabaseGuard>{children}</SupabaseGuard>
      </main>
    </div>
  )
}
