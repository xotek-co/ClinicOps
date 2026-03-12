"use client"

import { useSupabase } from "@/lib/supabaseContext"

export function SupabaseGuard({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase()

  if (!supabase) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-semibold">Setup Required</h2>
        <p className="text-center text-muted-foreground max-w-md">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.
          See README for setup instructions.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
