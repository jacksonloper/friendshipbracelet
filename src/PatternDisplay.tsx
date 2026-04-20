interface PatternDisplayProps {
  pattern: string[][];
}

export default function PatternDisplay({ pattern }: PatternDisplayProps) {
  if (pattern.length === 0) return null;

  const cellSize = 18;
  const gap = 2;
  const diagSize = Math.ceil(cellSize * Math.SQRT2);
  const maxCols = Math.max(...pattern.map(r => r.length));
  const svgWidth = maxCols * (diagSize + gap) + diagSize;
  const svgHeight = pattern.length * (diagSize / 2 + gap) + diagSize;

  return (
    <div className="pattern-display">
      <h3 style={{ margin: '8px 0 4px', fontSize: '0.9rem' }}>Pattern</h3>
      <svg width={svgWidth} height={svgHeight} style={{ minWidth: svgWidth }}>
        {pattern.map((row, rowIdx) => {
          const isShortRow = row.length < maxCols;
          const offsetX = isShortRow ? 0 : (diagSize + gap) / 2;
          // Actually: even rows (long) are centered, odd rows (short) might need offset
          // Let's center everything based on maxCols
          const rowWidth = row.length * (diagSize + gap);
          const totalMaxWidth = maxCols * (diagSize + gap);
          const startX = (totalMaxWidth - rowWidth) / 2 + diagSize / 2;

          return row.map((color, colIdx) => {
            const cx = startX + colIdx * (diagSize + gap) + diagSize / 2;
            const cy = rowIdx * (diagSize / 2 + gap) + diagSize / 2;
            const half = cellSize / 2;
            // Diamond shape (square rotated 45 degrees)
            const points = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;

            return (
              <polygon
                key={`${rowIdx}-${colIdx}`}
                points={points}
                fill={color}
                stroke="var(--fg)"
                strokeWidth={0.5}
              />
            );
          });
        })}
      </svg>
    </div>
  );
}
