import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="border border-base-300 rounded-lg p-3 text-xs bg-base-100 shadow-sm"
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
    <div className="panel-card p-6">
      <h3 className="text-sm font-semibold text-base-content mb-4">
        Onset distribution (days)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.1)" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: 'oklch(var(--bc) / 0.5)', fontSize: 11 }}
            axisLine={{ stroke: "oklch(var(--bc) / 0.1)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'oklch(var(--bc) / 0.5)', fontSize: 11 }}
            axisLine={{ stroke: "oklch(var(--bc) / 0.1)" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#2d5a7b" radius={[2, 2, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
