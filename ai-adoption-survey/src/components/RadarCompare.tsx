"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

export type RadarSeries = {
  key: string;
  name: string;
  color: string;
  fillOpacity?: number;
};

export default function RadarCompare({
  data,
  series,
  height = 320,
}: {
  data: Record<string, string | number>[];
  series: RadarSeries[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickCount={5} />
        {series.map((s) => (
          <Radar
            key={s.key}
            name={s.name}
            dataKey={s.key}
            stroke={s.color}
            fill={s.color}
            fillOpacity={s.fillOpacity ?? 0.15}
            strokeWidth={2}
          />
        ))}
        <Tooltip formatter={(v: number) => `${v}点`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
