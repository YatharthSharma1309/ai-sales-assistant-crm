import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type StageBarChartProps = {
  data: { stage: string; label: string; count: number }[]
}

export function StageBarChart({ data }: StageBarChartProps) {
  if (data.every((d) => d.count === 0)) {
    return (
      <p className="text-sm text-slate-500">No deals in pipeline yet.</p>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip />
          <Bar dataKey="count" name="Deals" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

type TrendLineChartProps = {
  data: { week: string; leads: number; deals: number }[]
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="leads"
            name="New leads"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="deals"
            name="New deals"
            stroke="#059669"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
