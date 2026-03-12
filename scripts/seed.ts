import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { addDays, addHours, subDays } from "date-fns"

// Load .env.local (Node/tsx doesn't load it automatically)
config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add to .env.local"
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

const firstNames = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Elizabeth",
  "David",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
]
const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Wilson",
  "Anderson",
  "Taylor",
  "Thomas",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Thompson",
  "White",
]

const servicesData = [
  { name: "General Checkup", duration: 30, price: 120 },
  { name: "Follow-up Visit", duration: 15, price: 75 },
  { name: "Physical Exam", duration: 45, price: 150 },
  { name: "Consultation", duration: 60, price: 200 },
  { name: "Vaccination", duration: 15, price: 50 },
  { name: "Minor Procedure", duration: 30, price: 180 },
  { name: "Lab Work", duration: 20, price: 85 },
  { name: "X-Ray", duration: 30, price: 120 },
  { name: "Urgent Care", duration: 45, price: 175 },
  { name: "Annual Physical", duration: 60, price: 250 },
]

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function seed() {
  console.log("Seeding ClinicOps database...")
  console.log("Note: Run on a fresh database. Re-running may create duplicates.\n")

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: "Metro Health Group" })
    .select("id")
    .single()

  if (orgErr) {
    console.error("Org error:", orgErr)
    throw orgErr
  }
  const orgId = org.id
  console.log("Created organization:", orgId)

  const { data: clinics, error: clinicsErr } = await supabase
    .from("clinic_locations")
    .insert([
      {
        organization_id: orgId,
        name: "Downtown Medical Center",
        address: "123 Main St, City Center",
        timezone: "America/New_York",
      },
      {
        organization_id: orgId,
        name: "Westside Family Clinic",
        address: "456 Oak Ave, West District",
        timezone: "America/New_York",
      },
      {
        organization_id: orgId,
        name: "North Park Health",
        address: "789 Pine Rd, North Park",
        timezone: "America/New_York",
      },
      {
        organization_id: orgId,
        name: "South Bay Wellness",
        address: "321 Harbor Dr, South Bay",
        timezone: "America/New_York",
      },
    ])
    .select("id,name")

  if (clinicsErr) throw clinicsErr
  console.log("Created 4 clinic locations")

  const staffRoles = ["Physician", "Nurse Practitioner", "RN", "Medical Assistant", "Receptionist"]
  const staffData: { organization_id: string; clinic_location_id: string; name: string; role: string; email: string; phone: string; status: string }[] = []

  for (let i = 0; i < 20; i++) {
    const clinic = randomPick(clinics)
    staffData.push({
      organization_id: orgId,
      clinic_location_id: clinic.id,
      name: `${randomPick(firstNames)} ${randomPick(lastNames)}`,
      role: randomPick(staffRoles),
      email: `staff${i + 1}@metrohealth.com`,
      phone: `555-${String(1000 + i).padStart(4, "0")}`,
      status: "active",
    })
  }

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .insert(staffData)
    .select("id, clinic_location_id")

  if (staffErr) throw staffErr
  console.log("Created 20 staff members")

  const { data: services, error: servicesErr } = await supabase
    .from("services")
    .insert(
      servicesData.map((s) => ({
        organization_id: orgId,
        ...s,
      }))
    )
    .select("id")

  if (servicesErr) throw servicesErr
  console.log("Created services")

  const patientsData = Array.from({ length: 200 }, () => ({
    organization_id: orgId,
    first_name: randomPick(firstNames),
    last_name: randomPick(lastNames),
    phone: `555-${randomInt(1000, 9999)}`,
    email: `patient${randomInt(1, 500)}@email.com`,
    date_of_birth: new Date(1950 + randomInt(0, 50), randomInt(0, 11), randomInt(1, 28)).toISOString().split("T")[0],
    notes: Math.random() > 0.8 ? "Allergy note" : null,
  }))

  const { data: patients, error: patientsErr } = await supabase
    .from("patients")
    .insert(patientsData)
    .select("id")

  if (patientsErr) throw patientsErr
  console.log("Created 200 patients")

  const statuses: string[] = ["scheduled", "completed", "completed", "completed", "cancelled", "no_show"]
  const appointmentsData: {
    patient_id: string
    staff_id: string
    clinic_location_id: string
    service_id: string
    status: string
    start_time: string
    end_time: string
  }[] = []

  for (let i = 0; i < 500; i++) {
    const daysAgo = randomInt(0, 60)
    const baseDate = subDays(new Date(), daysAgo)
    const hour = randomInt(8, 17)
    const startTime = addHours(addDays(baseDate, 0), hour)
    const endTime = addHours(startTime, 1)
    const clinic = randomPick(clinics)
    const clinicStaff = staff!.filter((s: { clinic_location_id: string }) => s.clinic_location_id === clinic.id)
    const clinician = randomPick(clinicStaff) || staff![0]

    appointmentsData.push({
      patient_id: randomPick(patients!).id,
      staff_id: clinician.id,
      clinic_location_id: clinic.id,
      service_id: randomPick(services!).id,
      status: randomPick(statuses),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    })
  }

  const { data: appointments, error: appointmentsErr } = await supabase
    .from("appointments")
    .insert(appointmentsData)
    .select("id,clinic_location_id,start_time,status")

  if (appointmentsErr) throw appointmentsErr
  console.log("Created 500 appointments")

  const completedAppointments = appointments!.filter((a: { status: string }) => a.status === "completed")
  const revenueData = completedAppointments.map((a: { id: string; clinic_location_id: string }) => ({
    appointment_id: a.id,
    clinic_location_id: a.clinic_location_id,
    amount: randomInt(50, 250),
    payment_type: randomPick(["card", "cash", "insurance"]),
  }))

  const { error: revenueErr } = await supabase.from("revenue_records").insert(revenueData)
  if (revenueErr) throw revenueErr
  console.log("Created revenue records")

  for (let w = 0; w < 8; w++) {
    const weekStart = subDays(new Date(), w * 7)
    for (const clinic of clinics!) {
      const clinicAppointments = appointments!.filter(
        (a: { clinic_location_id: string; start_time: string }) =>
          a.clinic_location_id === clinic.id &&
          new Date(a.start_time) >= subDays(weekStart, 7) &&
          new Date(a.start_time) < weekStart
      )
      const completed = clinicAppointments.filter((a: { status: string }) => a.status === "completed")
      const cancelled = clinicAppointments.filter((a: { status: string }) => a.status === "cancelled")
      const clinicRevenue = revenueData
        .filter((r) => r.clinic_location_id === clinic.id)
        .reduce((s, r) => s + r.amount, 0)

      await supabase.from("weekly_reports").insert({
        clinic_location_id: clinic.id,
        total_revenue: clinicRevenue * (0.8 + Math.random() * 0.4),
        appointment_count: completed.length,
        cancellation_count: cancelled.length,
        staff_utilization: 60 + Math.random() * 35,
        created_at: weekStart.toISOString(),
      })
    }
  }
  console.log("Created weekly reports")

  // Create demo auth users (admin, clinic manager, staff)
  const demoUsers = [
    { email: "admin@metrohealth.com", password: "demo123", name: "Admin User", role: "ADMIN" as const, clinic_id: null as string | null },
    { email: "manager@metrohealth.com", password: "demo123", name: "Clinic Manager", role: "CLINIC_MANAGER" as const, clinic_id: clinics![0].id },
    { email: "staff@metrohealth.com", password: "demo123", name: "Staff Member", role: "STAFF" as const, clinic_id: clinics![0].id },
  ]

  for (const u of demoUsers) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })
    if (authErr) {
      console.warn(`Could not create auth user ${u.email}:`, authErr.message)
      continue
    }
    if (authUser.user) {
      await supabase.from("users").insert({
        id: authUser.user.id,
        organization_id: orgId,
        role: u.role,
        name: u.name,
        email: u.email,
        clinic_location_id: u.clinic_id,
      })
      console.log(`Created user: ${u.email} (${u.role})`)
    }
  }

  console.log("\nSeed complete!")
  console.log("Demo login: admin@metrohealth.com / demo123")
}

seed().catch(console.error)
