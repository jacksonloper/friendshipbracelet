import { useState } from 'react';
import { type KnotType } from './braceletModel';

interface PatternDisplayProps {
  pattern: string[][];
  backPattern: string[][];
  knots: KnotType[][];
  numStrands: number;
}

const BACK_ARROW_RADIUS_RATIO = 0.8;
const ARROW_HEAD_SIZE_RATIO = 0.35;
const ARROW_SHAFT_LENGTH_RATIO = 0.7;
const DOUBLE_ARROW_OFFSET_RATIO = 0.35;
const DOUBLE_ARROW_SPAN_RATIO = 0.55;
const SECONDARY_HEAD_SIZE_RATIO = 0.7;

export default function PatternDisplay({ pattern, backPattern, knots, numStrands }: PatternDisplayProps) {
  const [showBack, setShowBack] = useState(false);
  const visiblePattern = showBack ? backPattern : pattern;

  if (visiblePattern.length === 0) return null;

  const cellSize = 18;
  const gap = 2;
  const diagSize = Math.ceil(cellSize * Math.SQRT2);
  const maxCols = Math.max(...visiblePattern.map(r => r.length));
  const svgWidth = maxCols * (diagSize + gap) + diagSize;
  const svgHeight = visiblePattern.length * (diagSize / 2 + gap) + diagSize;

  return (
    <div className="pattern-display">
      <div className="pattern-display-header">
        <h3 style={{ margin: '8px 0 4px', fontSize: '0.9rem' }}>Pattern</h3>
        <label>
          <input
            type="checkbox"
            checked={showBack}
            onChange={e => setShowBack(e.target.checked)}
          />
          Show back
        </label>
      </div>
      <svg width={svgWidth} height={svgHeight} style={{ minWidth: svgWidth, display: 'block', margin: '0 auto' }}>
        {visiblePattern.map((row, rowIdx) => {
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
            const knotType = getPatternCellKnotType(rowIdx, colIdx, row.length, numStrands, knots);
            const backOverlay = showBack && knotType
              ? getPatternArrowPath(getBackViewKnotType(knotType), cx, cy, half * BACK_ARROW_RADIUS_RATIO)
              : null;

            return (
              <g key={`${rowIdx}-${colIdx}`}>
                <polygon
                  points={points}
                  fill={color}
                  stroke="var(--fg)"
                  strokeWidth={0.5}
                />
                {backOverlay ? (
                  <path
                    d={backOverlay}
                    fill="none"
                    stroke="var(--fg)"
                    strokeWidth={1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

function getPatternCellKnotType(
  rowIdx: number,
  colIdx: number,
  rowLength: number,
  numStrands: number,
  knots: KnotType[][]
): KnotType | null {
  if (rowIdx % 2 === 1 && (colIdx === 0 || colIdx === rowLength - 1)) {
    return null;
  }

  const knotIndex = rowIdx % 2 === 1 ? colIdx - 1 : colIdx;
  if (knotIndex < 0 || knotIndex >= Math.ceil(numStrands / 2)) {
    return null;
  }

  return knots[rowIdx]?.[knotIndex] ?? null;
}

function getBackViewKnotType(knotType: KnotType): KnotType {
  switch (knotType) {
    case 'FF':
      return 'BB';
    case 'BB':
      return 'FF';
    case 'FB':
      return 'BF';
    case 'BF':
      return 'FB';
  }
}

function getPatternArrowPath(knotType: KnotType, cx: number, cy: number, r: number): string {
  const arrowHeadSize = r * ARROW_HEAD_SIZE_RATIO;

  switch (knotType) {
    case 'FF': {
      const x1 = cx - r * ARROW_SHAFT_LENGTH_RATIO;
      const x2 = cx + r * ARROW_SHAFT_LENGTH_RATIO;
      return `M ${x1} ${cy} L ${x2} ${cy} M ${x2 - arrowHeadSize} ${cy - arrowHeadSize} L ${x2} ${cy} L ${x2 - arrowHeadSize} ${cy + arrowHeadSize}`;
    }
    case 'BB': {
      const x1 = cx + r * ARROW_SHAFT_LENGTH_RATIO;
      const x2 = cx - r * ARROW_SHAFT_LENGTH_RATIO;
      return `M ${x1} ${cy} L ${x2} ${cy} M ${x2 + arrowHeadSize} ${cy - arrowHeadSize} L ${x2} ${cy} L ${x2 + arrowHeadSize} ${cy + arrowHeadSize}`;
    }
    case 'FB': {
      const y1 = cy - r * DOUBLE_ARROW_OFFSET_RATIO;
      const y2 = cy + r * DOUBLE_ARROW_OFFSET_RATIO;
      const xl = cx - r * DOUBLE_ARROW_SPAN_RATIO;
      const xr = cx + r * DOUBLE_ARROW_SPAN_RATIO;
      const secondaryHeadSize = arrowHeadSize * SECONDARY_HEAD_SIZE_RATIO;
      return `M ${xl} ${y1} L ${xr} ${y1} M ${xr - secondaryHeadSize} ${y1 - secondaryHeadSize} L ${xr} ${y1} L ${xr - secondaryHeadSize} ${y1 + secondaryHeadSize}` +
        ` M ${xr} ${y2} L ${xl} ${y2} M ${xl + secondaryHeadSize} ${y2 - secondaryHeadSize} L ${xl} ${y2} L ${xl + secondaryHeadSize} ${y2 + secondaryHeadSize}`;
    }
    case 'BF': {
      const y1 = cy - r * DOUBLE_ARROW_OFFSET_RATIO;
      const y2 = cy + r * DOUBLE_ARROW_OFFSET_RATIO;
      const xl = cx - r * DOUBLE_ARROW_SPAN_RATIO;
      const xr = cx + r * DOUBLE_ARROW_SPAN_RATIO;
      const secondaryHeadSize = arrowHeadSize * SECONDARY_HEAD_SIZE_RATIO;
      return `M ${xr} ${y1} L ${xl} ${y1} M ${xl + secondaryHeadSize} ${y1 - secondaryHeadSize} L ${xl} ${y1} L ${xl + secondaryHeadSize} ${y1 + secondaryHeadSize}` +
        ` M ${xl} ${y2} L ${xr} ${y2} M ${xr - secondaryHeadSize} ${y2 - secondaryHeadSize} L ${xr} ${y2} L ${xr - secondaryHeadSize} ${y2 + secondaryHeadSize}`;
    }
  }
}
