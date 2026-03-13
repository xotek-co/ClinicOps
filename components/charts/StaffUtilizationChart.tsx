"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface DataPoint {
  name: string
  utilization: number
  count: number
}

export function StaffUtilizationChart({ data }: { data: DataPoint[] }) {
  const displayData = data.slice(0, 12)

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[580px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: DataPoint }) => [
                `${props.payload?.count ?? value} appointments`,
                "Completed",
              ]}
            />
            <Bar
              dataKey="utilization"
              name="Utilization"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
