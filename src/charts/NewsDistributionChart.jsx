import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

export default function NewsDistributionChart({ news }) {
  if (!news || news.length === 0) {
    return (
      <div
        className="flex min-h-[300px] items-center justify-center text-sm"
        style={{ color: 'var(--muted-foreground)' }}
      >
        No data
      </div>
    );
  }

  // Group by source name
  const sourceCounts = {};
  news.forEach(article => {
    const source = article.source_id || article.source?.name || "Unknown";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const chartData = Object.entries(sourceCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 sources

  if (chartData.length === 0) {
    return (
      <div
        className="flex min-h-[300px] items-center justify-center text-sm"
        style={{ color: 'var(--muted-foreground)' }}
      >
        No source analytics available.
      </div>
    );
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.08) return null; // Skip tiny slices
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div style={{ minHeight: '320px', width: '100%', display: 'flex', position: 'relative' }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--popover-foreground)',
            }}
            formatter={(value, name) => [`${value} article${value !== 1 ? 's' : ''}`, name]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
