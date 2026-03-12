import type { SupabaseClient } from "@supabase/supabase-js"

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    action: string
    entityType: string
    entityId?: string
    metadata?: Record<string, unknown>
  }
) {
  const { data: { user } } = await supabase.auth.getUser()
  const appUser = user
    ? (await supabase.from("users").select("organization_id").eq("id", user.id).single()).data
    : null

  if (!appUser?.organization_id) return

  await supabase.from("activity_log").insert({
    organization_id: appUser.organization_id,
    user_id: user?.id ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? null,
  })
}

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    userId: string
    organizationId: string
    type: string
    title: string
    message?: string
    entityType?: string
    entityId?: string
  }
) {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    organization_id: params.organizationId,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  })
}
