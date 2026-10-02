// Single-series trend line (one measure per chart, never a dual axis). Recessive grid, 2px line,
// hover tooltip; the card title names the series so no legend is needed.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendPoint {
  label: string;
  value: number | null;
}

const INK_MUTED = '#6B7690';
const GRID = '#E9EDF3';

export function TrendChart({
  data,
  color = '#159A82',
  unit = '',
  domain,
  height = 200,
  name,
}: {
  data: TrendPoint[];
  color?: string;
  unit?: string;
  domain?: [number, number];
  height?: number;
  name: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ fill: INK_MUTED, fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis
            domain={domain ?? ['auto', 'auto']}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => `${v}${unit}`}
          />
          <Tooltip
            cursor={{ stroke: '#C9D1DE', strokeWidth: 1 }}
            formatter={(v) => [`${typeof v === 'number' ? Math.round(v * 10) / 10 : v}${unit}`, name]}
            contentStyle={{ borderRadius: 10, border: '1px solid #E3E7EE', fontSize: 13, color: '#1F2A44' }}
            labelStyle={{ color: INK_MUTED }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny line for the last few sessions; hover shows the value. */
export function Sparkline({ data, color = '#159A82', name }: { data: TrendPoint[]; color?: string; name: string }) {
  return (
    <div className="h-14 w-full" aria-label={`${name} trend`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip
            cursor={false}
            formatter={(v) => [typeof v === 'number' ? Math.round(v) : v, name]}
            labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ''}
            contentStyle={{ borderRadius: 10, border: '1px solid #E3E7EE', fontSize: 12, color: '#1F2A44' }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color }} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
