export type StaffRole = "owner" | "admin" | "manager" | "staff"
export type StaffStatus = "active" | "inactive" | "on_leave"
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show"
export type PaymentType = "card" | "cash" | "insurance" | "other"

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface ClinicLocation {
  id: string
  organization_id: string
  name: string
  address: string | null
  timezone: string
  created_at?: string
}

export interface Staff {
  id: string
  organization_id: string
  clinic_location_id: string | null
  name: string
  role: string
  email: string | null
  phone: string | null
  status: StaffStatus
  created_at?: string
}

export interface Patient {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  date_of_birth: string | null
  notes: string | null
  created_at?: string
}

export interface Service {
  id: string
  organization_id: string
  name: string
  duration: number
  price: number
  created_at?: string
}

export interface Appointment {
  id: string
  patient_id: string
  staff_id: string
  clinic_location_id: string
  service_id: string | null
  status: AppointmentStatus
  start_time: string
  end_time: string
  created_at?: string
  patient?: Patient
  staff?: Staff
  clinic_location?: ClinicLocation
  service?: Service
}

export interface RevenueRecord {
  id: string
  appointment_id: string | null
  clinic_location_id: string
  amount: number
  payment_type: PaymentType
  created_at?: string
}

export interface WeeklyReport {
  id: string
  clinic_location_id: string
  total_revenue: number
  appointment_count: number
  cancellation_count: number
  staff_utilization: number
  created_at?: string
  clinic_location?: ClinicLocation
}
