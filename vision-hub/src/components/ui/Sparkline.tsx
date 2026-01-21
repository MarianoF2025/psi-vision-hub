'use client';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showArea?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  color = '#e63946',
  height = 24,
  showArea = true,
  className = '',
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;
  const gradientId = `sparkline-gradient-${color.replace('#', '')}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`w-full overflow-visible ${className}`}
      style={{ height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      
      {showArea && (
        <polygon fill={`url(#${gradientId})`} points={areaPoints} />
      )}
      
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
