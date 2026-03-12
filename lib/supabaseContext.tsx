"use client"

import { createContext, useContext } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

const SupabaseContext = createContext<SupabaseClient | null>(null)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  let client: SupabaseClient | null = null
  try {
    client = createClient()
  } catch {
    // Env vars not configured
  }
  return (
    <SupabaseContext.Provider value={client}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const client = useContext(SupabaseContext)
  return client
}
