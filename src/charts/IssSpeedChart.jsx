import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store/useAppStore';

export default function IssSpeedChart() {
  const issSpeedHistory = useAppStore((s) => s.issSpeedHistory);

  if (!issSpeedHistory || issSpeedHistory.length === 0) {
    return (
      <div
        className="flex h-full min-h-[200px] items-center justify-center text-sm"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Waiting for ISS speed data…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '320px', width: '100%', display: 'flex', position: 'relative' }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={issSpeedHistory} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="var(--border)"
            opacity={0.6}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toLocaleString()}`}
            width={56}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--popover-foreground)',
            }}
            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 4 }}
            formatter={(v) => [`${v.toLocaleString()} km/h`, 'Speed']}
          />
          <Line
            type="monotone"
            dataKey="speed"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
