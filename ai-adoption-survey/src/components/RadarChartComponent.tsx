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
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <defs>
          <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7B3FFF" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="#F3F4F6" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#D1D5DB' }}
          tickCount={5}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}点`, name]}
          contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #E5E7EB' }}
        />
        <Radar
          name="国内平均"
          dataKey="平均"
          stroke="#D1D5DB"
          fill="#D1D5DB"
          fillOpacity={0.25}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <Radar
          name="貴社スコア"
          dataKey="貴社"
          stroke="#7B3FFF"
          fill="url(#radarGrad)"
          fillOpacity={0.4}
          strokeWidth={2.5}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
