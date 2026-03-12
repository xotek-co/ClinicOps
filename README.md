# ClinicOps – Multi-Location Clinic Operations System

A modern SaaS platform for private healthcare groups managing multi-location clinics. Built with Next.js 14, Supabase Auth, and role-based access control.

## Features

- **Authentication** – Email/password login, signup (admin creates first org), session persistence, protected routes
- **Role-Based Access** – ADMIN, CLINIC_MANAGER, STAFF with distinct permissions
- **Admin Dashboard** – Organization overview, revenue analytics, branch comparison, staff & clinic management
- **Clinic Manager Dashboard** – Clinic performance, today's appointments, staff utilization, patient management
- **Staff Dashboard** – My schedule, appointment status updates, patient notes
- **User Management** – Admins create staff accounts, assign roles and clinics
- **Clinic Management** – Create, edit, archive clinics
- **Patient Management** – Directory, profiles, visit history, create/update
- **Appointments** – Schedule, edit, cancel, mark completed/no-show, add notes
- **Service Catalog** – Manage services, duration, pricing
- **Global Search** – Patients, staff, appointments
- **Reports & Analytics** – Revenue by clinic, appointments per day, no-show rate, staff utilization

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, React Query, Recharts
- **Backend:** Supabase (PostgreSQL, Auth, RLS)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env.local`
3. Add to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for seed script and admin API)

### 3. Run database migrations

In the Supabase SQL Editor, run the files in `supabase/migrations/` in order:

1. `001_initial_schema.sql` – Creates tables
2. `002_rls_policies.sql` – Row Level Security
3. `003_users_auth_rbac.sql` – Users table, activity_log, notifications
4. `004_rls_role_based.sql` – Role-based RLS policies
5. `005_auth_users_trigger.sql` – Auto-create user on signup
6. `006_fix_users_rls_recursion.sql` – Fix users table recursion
7. `007_complete_rls_policies.sql` – Complete RLS for all tables

### 4. Seed demo data

```bash
npm run db:seed
```

This creates 1 org, 4 clinics, 20 staff, 200 patients, 500 appointments, 10 services, and demo users:

- **admin@metrohealth.com** / demo123 (ADMIN)
- **manager@metrohealth.com** / demo123 (CLINIC_MANAGER)
- **staff@metrohealth.com** / demo123 (STAFF)

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`. Use the demo credentials above.

## Project Structure

```
/app
  /login, /signup     – Auth pages
  /dashboard          – Role-specific dashboards
  /admin/users        – User management (Admin)
  /clinics            – Clinic locations
  /services           – Service catalog (Admin)
  /patients           – Patient directory & profiles
  /staff              – Staff management
  /appointments       – Appointment scheduling & workflow
  /reports            – Weekly reports
  /search             – Global search
  /settings           – Organization settings

/components
  /ui                 – shadcn components
  /charts             – Recharts
  /layout             – Sidebar (role-based nav)

/lib
  supabase/           – Client, server, middleware
  auth-context.tsx    – Auth state & app user
  activity.ts         – Activity log & notifications
```

## User Roles

| Role | Permissions |
|------|-------------|
| **ADMIN** | Manage clinics, staff, users, services, patients, appointments; view analytics; system settings |
| **CLINIC_MANAGER** | Manage appointments, patients, staff in their clinic; view branch analytics |
| **STAFF** | View schedule, update appointment status, view patient profile, add notes |

## RLS

- Users only access data in their organization
- Staff/Managers see only their assigned clinic
- Admins see the entire organization
