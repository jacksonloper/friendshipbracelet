import { type ReactElement } from 'react';
import { BraceletState, KnotType, knotsInRow, getOverStrand } from './braceletModel';

interface KnotDiagramProps {
  state: BraceletState;
  strandOrder: number[][];
  onKnotClick: (row: number, col: number) => void;
}

const NODE_R = 14;
const STRAND_SPACING = 36;
const ROW_HEIGHT = 44;

export default function KnotDiagram({ state, strandOrder, onKnotClick }: KnotDiagramProps) {
  const { numStrands, numRows, colors, knots } = state;
  const width = (numStrands + 1) * STRAND_SPACING;
  const height = (numRows + 1) * ROW_HEIGHT;

  // Compute x position of strand at a given position index
  const strandX = (pos: number) => (pos + 1) * STRAND_SPACING;

  // Compute knot center position
  const knotCenter = (row: number, col: number) => {
    const offset = row % 2 === 0 ? 0 : 1;
    const leftPos = offset + col * 2;
    const x = (strandX(leftPos) + strandX(leftPos + 1)) / 2;
    const y = (row + 1) * ROW_HEIGHT;
    return { x, y };
  };

  // Draw strands between rows
  const renderStrands = () => {
    const elements: ReactElement[] = [];

    // Draw top stubs (from top to first row)
    for (let pos = 0; pos < numStrands; pos++) {
      const strandIdx = strandOrder[0][pos];
      const x = strandX(pos);
      elements.push(
        <line
          key={`top-${pos}`}
          x1={x} y1={4}
          x2={x} y2={ROW_HEIGHT * 0.5}
          stroke={colors[strandIdx]}
          strokeWidth={4}
        />,
        <line
          key={`top-outline-${pos}`}
          x1={x} y1={4}
          x2={x} y2={ROW_HEIGHT * 0.5}
          stroke="var(--fg)"
          strokeWidth={6}
          opacity={0.3}
        />
      );
    }

    // For each row, draw strand segments from row above to knot, and from knot to row below
    for (let row = 0; row < numRows; row++) {
      const nk = knotsInRow(numStrands, row);
      const offset = row % 2 === 0 ? 0 : 1;

      // Determine which positions are involved in knots this row
      const involvedPositions = new Set<number>();
      for (let k = 0; k < nk; k++) {
        involvedPositions.add(offset + k * 2);
        involvedPositions.add(offset + k * 2 + 1);
      }

      // Draw strands that pass through without a knot (edge strands in odd rows)
      for (let pos = 0; pos < numStrands; pos++) {
        if (!involvedPositions.has(pos)) {
          const strandIdx = strandOrder[row][pos];
          const x = strandX(pos);
          const y1 = row * ROW_HEIGHT + ROW_HEIGHT * 0.5;
          const y2 = (row + 1) * ROW_HEIGHT + ROW_HEIGHT * 0.5;
          elements.push(
            <line
              key={`pass-outline-${row}-${pos}`}
              x1={x} y1={y1} x2={x} y2={y2}
              stroke="var(--fg)"
              strokeWidth={6}
              strokeLinecap="round"
            />,
            <line
              key={`pass-${row}-${pos}`}
              x1={x} y1={y1} x2={x} y2={y2}
              stroke={colors[strandIdx]}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        }
      }

      // Draw knot strands (connecting top to knot center, and knot center to bottom)
      for (let k = 0; k < nk; k++) {
        const leftPos = offset + k * 2;
        const rightPos = leftPos + 1;
        const center = knotCenter(row, k);
        const knotType = knots[row]?.[k] ?? 'FF';

        const leftStrandIdx = strandOrder[row][leftPos];
        const rightStrandIdx = strandOrder[row][rightPos];

        // Determine output positions
        // FF/BF: strands swap
        // BB/FB: strands don't swap
        const swaps = knotType === 'FF' || knotType === 'BF';
        const bottomLeftIdx = swaps ? rightStrandIdx : leftStrandIdx;
        const bottomRightIdx = swaps ? leftStrandIdx : rightStrandIdx;

        const topLeftX = strandX(leftPos);
        const topRightX = strandX(rightPos);
        const yTop = row * ROW_HEIGHT + ROW_HEIGHT * 0.5;
        const yBottom = (row + 1) * ROW_HEIGHT + ROW_HEIGHT * 0.5;

        // Determine bottom positions
        const bottomLeftPos = swaps ? rightPos : leftPos;
        const bottomRightPos = swaps ? leftPos : rightPos;
        // Actually, output strand positions depend on what's going on in the NEXT row's strandOrder
        // For drawing, left comes in from top-left and right from top-right
        // They exit on same sides if no swap, or crossed if swap
        const exitLeftX = swaps ? topRightX : topLeftX;
        const exitRightX = swaps ? topLeftX : topRightX;

        const overStrand = getOverStrand(knotType);

        // Draw under strand first, then over strand on top
        const underColor = overStrand === 'left' ? colors[rightStrandIdx] : colors[leftStrandIdx];
        const overColor = overStrand === 'left' ? colors[leftStrandIdx] : colors[rightStrandIdx];

        // Under strand path (from top to center, center to exit)
        const underTopX = overStrand === 'left' ? topRightX : topLeftX;
        const underExitX = overStrand === 'left'
          ? (swaps ? topLeftX : topRightX)
          : (swaps ? topRightX : topLeftX);

        // Over strand path
        const overTopX = overStrand === 'left' ? topLeftX : topRightX;
        const overExitX = overStrand === 'left'
          ? (swaps ? topRightX : topLeftX)
          : (swaps ? topLeftX : topRightX);

        // Draw under strand segments (outline + color)
        elements.push(
          <line key={`under-top-o-${row}-${k}`}
            x1={underTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke="var(--fg)" strokeWidth={6} strokeLinecap="round" />,
          <line key={`under-top-${row}-${k}`}
            x1={underTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke={underColor} strokeWidth={4} strokeLinecap="round" />,
          <line key={`under-bot-o-${row}-${k}`}
            x1={center.x} y1={center.y} x2={underExitX} y2={yBottom}
            stroke="var(--fg)" strokeWidth={6} strokeLinecap="round" />,
          <line key={`under-bot-${row}-${k}`}
            x1={center.x} y1={center.y} x2={underExitX} y2={yBottom}
            stroke={underColor} strokeWidth={4} strokeLinecap="round" />,
        );

        // Draw over strand segments (outline + color) - drawn on top
        elements.push(
          <line key={`over-top-o-${row}-${k}`}
            x1={overTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke="var(--fg)" strokeWidth={6} strokeLinecap="round" />,
          <line key={`over-top-${row}-${k}`}
            x1={overTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke={overColor} strokeWidth={4} strokeLinecap="round" />,
          <line key={`over-bot-o-${row}-${k}`}
            x1={center.x} y1={center.y} x2={overExitX} y2={yBottom}
            stroke="var(--fg)" strokeWidth={6} strokeLinecap="round" />,
          <line key={`over-bot-${row}-${k}`}
            x1={center.x} y1={center.y} x2={overExitX} y2={yBottom}
            stroke={overColor} strokeWidth={4} strokeLinecap="round" />,
        );
      }
    }

    return elements;
  };

  // Render knot nodes (circles with arrows)
  const renderKnots = () => {
    const elements: ReactElement[] = [];

    for (let row = 0; row < numRows; row++) {
      const nk = knotsInRow(numStrands, row);

      for (let k = 0; k < nk; k++) {
        const center = knotCenter(row, k);
        const knotType = knots[row]?.[k] ?? 'FF';
        const offset = row % 2 === 0 ? 0 : 1;
        const leftPos = offset + k * 2;
        const rightPos = leftPos + 1;

        const leftStrandIdx = strandOrder[row][leftPos];
        const rightStrandIdx = strandOrder[row][rightPos];
        const overStrand = getOverStrand(knotType);
        const topColor = overStrand === 'left' ? colors[leftStrandIdx] : colors[rightStrandIdx];

        // Angles where strands connect to circle
        // Top-left strand comes from upper-left, top-right from upper-right
        // Exit strands go to lower-left / lower-right
        const angleTopLeft = -Math.PI * 0.75; // ~-135 degrees
        const angleTopRight = -Math.PI * 0.25; // ~-45 degrees
        const angleBottomLeft = Math.PI * 0.75; // ~135 degrees
        const angleBottomRight = Math.PI * 0.25; // ~45 degrees

        // Determine gap angles (where over strand connects - no outline there)
        const overAngles = overStrand === 'left'
          ? [angleTopLeft, knotType === 'FF' || knotType === 'BF' ? angleBottomRight : angleBottomLeft]
          : [angleTopRight, knotType === 'FF' || knotType === 'BF' ? angleBottomLeft : angleBottomRight];

        // Draw circle with gaps at over-strand connections
        // We'll draw the circle as arcs, skipping small gaps at connection points
        const gapSize = 0.35; // radians of gap

        // Build arc segments that skip the gap areas
        const allAngles = [...overAngles].sort((a, b) => a - b);
        
        // Draw a filled circle as background
        elements.push(
          <circle
            key={`knot-bg-${row}-${k}`}
            cx={center.x}
            cy={center.y}
            r={NODE_R}
            fill={topColor}
          />
        );

        // Draw circle outline with gaps where over-strand connects
        // Create the path for the outline with gaps
        const gapAngles = overAngles.map(a => ({ start: a - gapSize / 2, end: a + gapSize / 2 }));
        // Normalize angles to [0, 2*PI]
        const normalize = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const normalizedGaps = gapAngles.map(g => ({
          start: normalize(g.start),
          end: normalize(g.end),
        })).sort((a, b) => a.start - b.start);

        // Draw arcs between gaps
        let arcPaths = '';
        for (let i = 0; i < normalizedGaps.length; i++) {
          const arcStart = normalizedGaps[i].end;
          const arcEnd = normalizedGaps[(i + 1) % normalizedGaps.length].start;
          const startX = center.x + NODE_R * Math.cos(arcStart);
          const startY = center.y + NODE_R * Math.sin(arcStart);
          const endX = center.x + NODE_R * Math.cos(arcEnd);
          const endY = center.y + NODE_R * Math.sin(arcEnd);
          
          // Determine if arc is > 180 degrees
          let sweep = arcEnd - arcStart;
          if (sweep < 0) sweep += 2 * Math.PI;
          const largeArc = sweep > Math.PI ? 1 : 0;

          arcPaths += `M ${startX} ${startY} A ${NODE_R} ${NODE_R} 0 ${largeArc} 1 ${endX} ${endY} `;
        }

        elements.push(
          <path
            key={`knot-outline-${row}-${k}`}
            d={arcPaths}
            fill="none"
            stroke="var(--fg)"
            strokeWidth={2}
          />
        );

        // Draw arrow inside the knot
        const arrow = getArrowPath(knotType, center.x, center.y, NODE_R * 0.6);
        elements.push(
          <path
            key={`knot-arrow-${row}-${k}`}
            d={arrow}
            fill="none"
            stroke="var(--fg)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

        // Clickable area
        elements.push(
          <circle
            key={`knot-click-${row}-${k}`}
            cx={center.x}
            cy={center.y}
            r={NODE_R + 2}
            fill="transparent"
            className="knot-node"
            onClick={() => onKnotClick(row, k)}
          />
        );
      }
    }

    return elements;
  };

  return (
    <div className="knot-diagram">
      <svg width={width} height={height} style={{ minWidth: width }}>
        {renderStrands()}
        {renderKnots()}
      </svg>
    </div>
  );
}

// Generate arrow path for knot type
// FF: arrow pointing from top-left to bottom-right (two segments: ↘↘)
// BB: arrow pointing from top-right to bottom-left (two segments: ↙↙)
// FB: arrow going right then left (↘↙)
// BF: arrow going left then right (↙↘)
function getArrowPath(knotType: KnotType, cx: number, cy: number, r: number): string {
  const headSize = r * 0.4;

  switch (knotType) {
    case 'FF': {
      // Two forward arrows (left to right direction)
      const x1 = cx - r * 0.5;
      const x2 = cx + r * 0.5;
      const y = cy;
      return `M ${x1 - r * 0.3} ${y} L ${x2} ${y}` +
        ` M ${x2 - headSize} ${y - headSize * 0.7} L ${x2} ${y} L ${x2 - headSize} ${y + headSize * 0.7}`;
    }
    case 'BB': {
      // Two backward arrows (right to left direction)
      const x1 = cx + r * 0.5;
      const x2 = cx - r * 0.5;
      const y = cy;
      return `M ${x1 + r * 0.3} ${y} L ${x2} ${y}` +
        ` M ${x2 + headSize} ${y - headSize * 0.7} L ${x2} ${y} L ${x2 + headSize} ${y + headSize * 0.7}`;
    }
    case 'FB': {
      // Forward then backward (right then left)
      const y1 = cy - r * 0.3;
      const y2 = cy + r * 0.3;
      // Top arrow: pointing right
      const path1 = `M ${cx - r * 0.6} ${y1} L ${cx + r * 0.3} ${y1}` +
        ` M ${cx + r * 0.3 - headSize * 0.6} ${y1 - headSize * 0.5} L ${cx + r * 0.3} ${y1} L ${cx + r * 0.3 - headSize * 0.6} ${y1 + headSize * 0.5}`;
      // Bottom arrow: pointing left
      const path2 = `M ${cx + r * 0.6} ${y2} L ${cx - r * 0.3} ${y2}` +
        ` M ${cx - r * 0.3 + headSize * 0.6} ${y2 - headSize * 0.5} L ${cx - r * 0.3} ${y2} L ${cx - r * 0.3 + headSize * 0.6} ${y2 + headSize * 0.5}`;
      return path1 + ' ' + path2;
    }
    case 'BF': {
      // Backward then forward (left then right)
      const y1 = cy - r * 0.3;
      const y2 = cy + r * 0.3;
      // Top arrow: pointing left
      const path1 = `M ${cx + r * 0.6} ${y1} L ${cx - r * 0.3} ${y1}` +
        ` M ${cx - r * 0.3 + headSize * 0.6} ${y1 - headSize * 0.5} L ${cx - r * 0.3} ${y1} L ${cx - r * 0.3 + headSize * 0.6} ${y1 + headSize * 0.5}`;
      // Bottom arrow: pointing right
      const path2 = `M ${cx - r * 0.6} ${y2} L ${cx + r * 0.3} ${y2}` +
        ` M ${cx + r * 0.3 - headSize * 0.6} ${y2 - headSize * 0.5} L ${cx + r * 0.3} ${y2} L ${cx + r * 0.3 - headSize * 0.6} ${y2 + headSize * 0.5}`;
      return path1 + ' ' + path2;
    }
  }
}
