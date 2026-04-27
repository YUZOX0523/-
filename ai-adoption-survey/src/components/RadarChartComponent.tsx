'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { CategoryScore } from '@/lib/scoring';

type Props = {
  categoryScores: CategoryScore[];
};

export default function RadarChartComponent({ categoryScores }: Props) {
  const data = categoryScores.map((cs) => ({
    subject: cs.categoryName,
    貴社: cs.score,
    平均: cs.benchmark,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickCount={5}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}点`, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Radar
          name="国内平均"
          dataKey="平均"
          stroke="#d1d5db"
          fill="#d1d5db"
          fillOpacity={0.3}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <Radar
          name="貴社スコア"
          dataKey="貴社"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.35}
          strokeWidth={2.5}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
