"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO } from "date-fns"

interface DataPoint {
  week: string
  appointments: number
  revenue: number
}

export function WeeklyAppointmentTrendChart({ data }: { data: DataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    weekLabel: format(parseISO(d.week), "MMM d"),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatted} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "revenue" ? formatCurrency(value) : value
          }
          labelFormatter={(label) => label}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="appointments"
          name="Appointments"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="hsl(var(--chart-2, 142 76% 36%))"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
