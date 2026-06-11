/**
 * ScoreRadar — radar / spider chart for the 5-factor completeness score.
 *
 * Why SVG instead of chart.js / recharts: a 5-axis polygon is ~30
 * lines of pure SVG. No deps, no hydration mismatch, and the file
 * is testable with a vitest snapshot if we want to.
 *
 * The 5 factors (with weights) come from
 * tools/completeness_scoring.py at build time; we just visualise
 * what the server's `score_breakdown` says.
 *
 *   - stars         30%   — popularity on GitHub
 *   - recency       15%   — how recently it was updated
 *   - lang_coverage 15%   — language detected + topic coverage
 *   - desc_quality  20%   — description length + structure
 *   - our_signal    20%   — what we've done with it (Layer 2 / Layer 3)
 *
 * Each axis is rendered 0..100. The pentagon is the data; the dashed
 * pentagon is the "even average" baseline (60 on every axis) for
 * quick eyeballing.
 */

import React from 'react';
import type { ScoreBreakdown } from '../../types';

export interface ScoreRadarProps {
  /** The 5-factor breakdown, all fields 0..100. */
  breakdown: ScoreBreakdown;
  /** Pixel size of the chart (square). Defaults to 240. */
  size?: number;
  /** Optional className for layout. */
  className?: string;
}

const AXES: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: 'stars', label: 'Stars' },
  { key: 'recency', label: 'Recency' },
  { key: 'lang_coverage', label: 'Lang' },
  { key: 'desc_quality', label: 'Docs' },
  { key: 'our_signal', label: 'Ours' },
];

/** Convert polar (r in 0..1, angle in radians) to SVG (x, y). */
function polar(r: number, angleRad: number, cx: number, cy: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

export const ScoreRadar: React.FC<ScoreRadarProps> = ({ breakdown, size = 240, className = '' }) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28; // leave room for labels
  const n = AXES.length;
  // Start at -90deg (top) and go clockwise.
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  // Build the data polygon: each value normalised to 0..1.
  const dataPoints = AXES.map((axis, i) => {
    const v = (breakdown[axis.key] ?? 0) / 100;
    const r = radius * Math.max(0, Math.min(1, v));
    return polar(r, angleFor(i), cx, cy);
  });
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Build the reference grid: 3 concentric pentagons (0.25, 0.5, 0.75, 1.0).
  const gridRings = [0.25, 0.5, 0.75, 1.0].map((scale) => {
    const pts = AXES.map((_, i) => polar(radius * scale, angleFor(i), cx, cy));
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  });

  // Build the spoke lines (centre -> each axis vertex at radius 1.0).
  const spokes = AXES.map((_, i) => {
    const outer = polar(radius, angleFor(i), cx, cy);
    return { x1: cx, y1: cy, x2: outer.x, y2: outer.y };
  });

  // Label positions: push them slightly outside the outer ring.
  const labelPositions = AXES.map((axis, i) => {
    const p = polar(radius + 18, angleFor(i), cx, cy);
    return { ...p, text: axis.label, value: Math.round(breakdown[axis.key] ?? 0) };
  });

  return (
    <div className={`inline-block ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="5-factor score breakdown"
      >
        {/* Grid rings */}
        {gridRings.map((pts, i) => (
          <polygon
            key={`grid-${i}`}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}

        {/* Spokes */}
        {spokes.map((s, i) => (
          <line
            key={`spoke-${i}`}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={dataPath}
          fill="rgb(99 102 241 / 0.18)"
          stroke="rgb(99 102 241)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="rgb(99 102 241)"
            stroke="white"
            strokeWidth={1.5}
          />
        ))}

        {/* Axis labels + values */}
        {labelPositions.map((lp, i) => (
          <text
            key={`lbl-${i}`}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-700 dark:fill-slate-300"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {lp.text}
            <tspan x={lp.x} dy={14} className="fill-slate-500 dark:fill-slate-400" style={{ fontSize: 10, fontWeight: 400 }}>
              {lp.value}
            </tspan>
          </text>
        ))}
      </svg>
    </div>
  );
};

export default ScoreRadar;
