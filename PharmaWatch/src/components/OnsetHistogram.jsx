import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="card card-compact shadow-xl border p-3 text-xs bg-base-100"
      style={{
        borderColor: "oklch(var(--bc) / 0.1)",
        color: "oklch(var(--bc))"
      }}
    >
      <div className="font-bold mb-1 text-base-content">Days {label}</div>
      <div className="font-semibold text-primary">
        {payload[0].value} reporters
      </div>
    </div>
  );
};

export default function OnsetHistogram({ data, height = 280 }) {
  return (
    <div className="card bg-base-100 border border-base-300 p-6 shadow-sm">
      <h3 className="card-title text-sm font-bold text-base-content mb-4">
        Onset Time Distribution (days)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.1)" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: '#0070f3', fontSize: 11 }}
            axisLine={{ stroke: "oklch(var(--bc) / 0.1)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#0070f3', fontSize: 11 }}
            axisLine={{ stroke: "oklch(var(--bc) / 0.1)" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
