"use client"

import { useMemo } from "react"
import { createClient } from "./supabaseClient"
import type { SupabaseClient } from "@supabase/supabase-js"

export function useSupabase(): SupabaseClient | null {
  return useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])
}
