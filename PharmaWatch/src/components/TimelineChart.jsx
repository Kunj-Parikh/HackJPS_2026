import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="card card-compact shadow-xl border p-3 text-xs bg-base-100"
      style={{
        borderColor: "oklch(var(--bc) / 0.1)",
        color: 'oklch(var(--bc))'
      }}
    >
      <div className="font-bold mb-2 text-base-content">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.dataKey === "reddit" ? "Reddit" : "FAERS"}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function TimelineChart({ data, height = 300 }) {
  return (
    <div className="card bg-base-100 border border-base-300 p-6 shadow-sm">
      <h3 className="card-title text-sm font-bold text-base-content mb-4 flex items-center gap-1.5">
        Report Volume Over Time
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -25 }}>
          <defs>
            <linearGradient id="redditGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="faersGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.1)" />
          <XAxis
            dataKey="month"
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
          <Area type="monotone" dataKey="reddit" stroke="#0d9488" strokeWidth={2.5} fill="url(#redditGrad)" />
          <Area type="monotone" dataKey="faers" stroke="#6366f1" strokeWidth={2.5} fill="url(#faersGrad)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-4 text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-base-content/80">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#0d9488" }} />
          Reddit Reports
        </div>
        <div className="flex items-center gap-1.5 text-base-content/80">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#6366f1" }} />
          FAERS Reports
        </div>
      </div>
    </div>
  );
}
