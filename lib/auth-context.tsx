"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useSupabase } from "@/lib/supabaseContext"

export type UserRole = "ADMIN" | "CLINIC_MANAGER" | "STAFF"

export interface AppUser {
  id: string
  organization_id: string
  role: UserRole
  name: string
  email: string
  clinic_location_id: string | null
  is_active: boolean
}

const AuthContext = createContext<{
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
} | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setAppUser(data))
      } else {
        setAppUser(null)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setAppUser(data))
      } else {
        setAppUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut()
      setUser(null)
      setAppUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
