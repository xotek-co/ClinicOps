import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: "Server not configured for user creation" },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user: caller } } = await supabaseUser.auth.getUser()
  if (!caller) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const appUser = await supabaseUser
    .from("users")
    .select("organization_id, role")
    .eq("id", caller.id)
    .single()

  if (!appUser.data || appUser.data.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const body = await request.json()
  const { email, password, name, role, clinic_location_id } = body

  if (!email || !name) {
    return NextResponse.json(
      { error: "Email and name required" },
      { status: 400 }
    )
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: password || "changeme123",
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: "User creation failed" }, { status: 500 })
  }

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: authData.user.id,
      organization_id: appUser.data.organization_id,
      role: role || "STAFF",
      name,
      email: authData.user.email!,
      clinic_location_id: clinic_location_id || null,
    },
    { onConflict: "id" }
  )

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: authData.user.id })
}
