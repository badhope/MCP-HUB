/**
 * ScoreRadar — 5因子雷达图组件
 *
 * 可视化展示服务器的5个评分因子：
 * - stars: 社区认可
 * - recency: 新鲜度
 * - lang_coverage: 语言覆盖
 * - desc_quality: 描述质量
 * - our_signal: 我们的信号
 */

import React from 'react';
import { ScoreBreakdown } from '../../types';

interface ScoreRadarProps {
  breakdown: ScoreBreakdown;
  size?: number;
}

export const ScoreRadar: React.FC<ScoreRadarProps> = ({ breakdown, size = 200 }) => {
  const factors = [
    { key: 'stars', label: 'Stars', value: breakdown.stars },
    { key: 'recency', label: 'Recency', value: breakdown.recency },
    { key: 'lang_coverage', label: 'Language', value: breakdown.lang_coverage },
    { key: 'desc_quality', label: 'Description', value: breakdown.desc_quality },
    { key: 'our_signal', label: 'Our Signal', value: breakdown.our_signal },
  ];

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const levels = 5;

  // Calculate polygon points
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / factors.length - Math.PI / 2;
    const r = radius * value;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  const dataPoints = factors.map((f, i) => getPoint(i, f.value));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid levels */}
        {Array.from({ length: levels }, (_, level) => {
          const levelRadius = (radius * (level + 1)) / levels;
          const points = factors
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
              return `${centerX + levelRadius * Math.cos(angle)} ${centerY + levelRadius * Math.sin(angle)}`;
            })
            .join(' ');
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
            />
          );
        })}

        {/* Axes */}
        {factors.map((_, i) => {
          const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={dataPath}
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="currentColor"
            className="text-primary"
          />
        ))}

        {/* Labels */}
        {factors.map((f, i) => {
          const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
          const labelRadius = radius * 1.2;
          const x = centerX + labelRadius * Math.cos(angle);
          const y = centerY + labelRadius * Math.sin(angle);
          return (
            <text
              key={f.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs font-medium"
            >
              {f.label}
            </text>
          );
        })}
      </svg>

      {/* Score values */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-xs">
        {factors.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{f.label}:</span>
            <span className="font-medium text-foreground">
              {Math.round(f.value * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
