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
const STRAND_WIDTH = 4;
const OUTLINE_WIDTH = 6;

export default function KnotDiagram({ state, strandOrder, onKnotClick }: KnotDiagramProps) {
  const { numStrands, numRows, colors, knots } = state;
  const width = (numStrands + 1) * STRAND_SPACING;
  const height = (numRows + 1) * ROW_HEIGHT + 10;

  // X position of strand at a given position index
  const strandX = (pos: number) => (pos + 1) * STRAND_SPACING;

  // Y position of the top of a row's zone and the knot center
  const rowTopY = (row: number) => row * ROW_HEIGHT + ROW_HEIGHT * 0.5;
  const rowCenterY = (row: number) => (row + 1) * ROW_HEIGHT;
  const rowBottomY = (row: number) => (row + 1) * ROW_HEIGHT + ROW_HEIGHT * 0.5;

  // Knot center position
  const knotCenter = (row: number, col: number) => {
    const offset = row % 2 === 0 ? 0 : 1;
    const leftPos = offset + col * 2;
    const x = (strandX(leftPos) + strandX(leftPos + 1)) / 2;
    const y = rowCenterY(row);
    return { x, y };
  };

  const renderStrands = () => {
    const elements: ReactElement[] = [];

    for (let row = 0; row < numRows; row++) {
      const nk = knotsInRow(numStrands, row);
      const offset = row % 2 === 0 ? 0 : 1;
      const involvedPositions = new Set<number>();
      for (let k = 0; k < nk; k++) {
        involvedPositions.add(offset + k * 2);
        involvedPositions.add(offset + k * 2 + 1);
      }

      // Pass-through strands (edges in odd rows)
      for (let pos = 0; pos < numStrands; pos++) {
        if (!involvedPositions.has(pos)) {
          const strandIdx = strandOrder[row][pos];
          const x = strandX(pos);
          const y1 = rowTopY(row);
          const y2 = rowBottomY(row);
          elements.push(
            <line key={`pass-o-${row}-${pos}`}
              x1={x} y1={y1} x2={x} y2={y2}
              stroke="var(--fg)" strokeWidth={OUTLINE_WIDTH} strokeLinecap="round" />,
            <line key={`pass-${row}-${pos}`}
              x1={x} y1={y1} x2={x} y2={y2}
              stroke={colors[strandIdx]} strokeWidth={STRAND_WIDTH} strokeLinecap="round" />,
          );
        }
      }

      // Knot strands
      for (let k = 0; k < nk; k++) {
        const leftPos = offset + k * 2;
        const rightPos = leftPos + 1;
        const center = knotCenter(row, k);
        const knotType = knots[row]?.[k] ?? 'FF';

        const leftStrandIdx = strandOrder[row][leftPos];
        const rightStrandIdx = strandOrder[row][rightPos];
        const swaps = knotType === 'FF' || knotType === 'BB';

        const topLeftX = strandX(leftPos);
        const topRightX = strandX(rightPos);
        const yTop = rowTopY(row);
        const yBottom = rowBottomY(row);

        // Exit X positions
        // If swap: left strand exits bottom-right, right strand exits bottom-left
        // If no swap: left strand exits bottom-left, right strand exits bottom-right
        const leftExitX = swaps ? topRightX : topLeftX;
        const rightExitX = swaps ? topLeftX : topRightX;

        const overStrand = getOverStrand(knotType);

        // Determine paths for under and over strands
        const underTopX = overStrand === 'left' ? topRightX : topLeftX;
        const underExitX = overStrand === 'left' ? rightExitX : leftExitX;
        const overTopX = overStrand === 'left' ? topLeftX : topRightX;
        const overExitX = overStrand === 'left' ? leftExitX : rightExitX;

        const underColor = overStrand === 'left' ? colors[rightStrandIdx] : colors[leftStrandIdx];
        const overColor = overStrand === 'left' ? colors[leftStrandIdx] : colors[rightStrandIdx];

        // Draw UNDER strand first (goes behind the knot node)
        elements.push(
          <line key={`u-top-o-${row}-${k}`}
            x1={underTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke="var(--fg)" strokeWidth={OUTLINE_WIDTH} strokeLinecap="round" />,
          <line key={`u-top-${row}-${k}`}
            x1={underTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke={underColor} strokeWidth={STRAND_WIDTH} strokeLinecap="round" />,
          <line key={`u-bot-o-${row}-${k}`}
            x1={center.x} y1={center.y} x2={underExitX} y2={yBottom}
            stroke="var(--fg)" strokeWidth={OUTLINE_WIDTH} strokeLinecap="round" />,
          <line key={`u-bot-${row}-${k}`}
            x1={center.x} y1={center.y} x2={underExitX} y2={yBottom}
            stroke={underColor} strokeWidth={STRAND_WIDTH} strokeLinecap="round" />,
        );

        // Draw OVER strand on top
        elements.push(
          <line key={`o-top-o-${row}-${k}`}
            x1={overTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke="var(--fg)" strokeWidth={OUTLINE_WIDTH} strokeLinecap="round" />,
          <line key={`o-top-${row}-${k}`}
            x1={overTopX} y1={yTop} x2={center.x} y2={center.y}
            stroke={overColor} strokeWidth={STRAND_WIDTH} strokeLinecap="round" />,
          <line key={`o-bot-o-${row}-${k}`}
            x1={center.x} y1={center.y} x2={overExitX} y2={yBottom}
            stroke="var(--fg)" strokeWidth={OUTLINE_WIDTH} strokeLinecap="round" />,
          <line key={`o-bot-${row}-${k}`}
            x1={center.x} y1={center.y} x2={overExitX} y2={yBottom}
            stroke={overColor} strokeWidth={STRAND_WIDTH} strokeLinecap="round" />,
        );
      }
    }

    return elements;
  };

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
        const swaps = knotType === 'FF' || knotType === 'BB';

        // Compute angles where strands enter/exit the circle
        const topLeftX = strandX(leftPos);
        const topRightX = strandX(rightPos);
        const yTop = rowTopY(row);
        const yBottom = rowBottomY(row);
        const leftExitX = swaps ? topRightX : topLeftX;
        const rightExitX = swaps ? topLeftX : topRightX;
        const overExitX = overStrand === 'left' ? leftExitX : rightExitX;
        const overTopX = overStrand === 'left' ? topLeftX : topRightX;

        // Angles of over-strand connections to circle
        const angleIn = Math.atan2(yTop - center.y, overTopX - center.x);
        const angleOut = Math.atan2(yBottom - center.y, overExitX - center.x);

        // Gap in outline where over-strand connects
        const gapSize = 0.4; // radians

        // Filled circle
        elements.push(
          <circle key={`knot-bg-${row}-${k}`}
            cx={center.x} cy={center.y} r={NODE_R}
            fill={topColor} />
        );

        // Circle outline with gaps at over-strand positions
        const gaps = [
          { start: angleIn - gapSize / 2, end: angleIn + gapSize / 2 },
          { start: angleOut - gapSize / 2, end: angleOut + gapSize / 2 },
        ];

        // Normalize to [0, 2π]
        const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const sortedGaps = gaps
          .map(g => ({ start: norm(g.start), end: norm(g.end) }))
          .sort((a, b) => a.start - b.start);

        let arcPath = '';
        for (let i = 0; i < sortedGaps.length; i++) {
          const arcStart = sortedGaps[i].end;
          const arcEnd = sortedGaps[(i + 1) % sortedGaps.length].start;
          const sx = center.x + NODE_R * Math.cos(arcStart);
          const sy = center.y + NODE_R * Math.sin(arcStart);
          const ex = center.x + NODE_R * Math.cos(arcEnd);
          const ey = center.y + NODE_R * Math.sin(arcEnd);
          let sweep = arcEnd - arcStart;
          if (sweep < 0) sweep += 2 * Math.PI;
          const largeArc = sweep > Math.PI ? 1 : 0;
          arcPath += `M ${sx} ${sy} A ${NODE_R} ${NODE_R} 0 ${largeArc} 1 ${ex} ${ey} `;
        }

        elements.push(
          <path key={`knot-ol-${row}-${k}`}
            d={arcPath} fill="none"
            stroke="var(--fg)" strokeWidth={2} />
        );

        // Arrow inside knot
        const arrow = getArrowPath(knotType, center.x, center.y, NODE_R * 0.6);
        elements.push(
          <path key={`knot-arr-${row}-${k}`}
            d={arrow} fill="none"
            stroke="var(--fg)" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round" />
        );

        // Click target
        elements.push(
          <circle key={`knot-click-${row}-${k}`}
            cx={center.x} cy={center.y} r={NODE_R + 4}
            fill="transparent"
            className="knot-node"
            onClick={() => onKnotClick(row, k)} />
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

// Arrow inside the knot showing direction
// Standard bracelet notation:
// FF: arrow → (left strand goes forward/right over the other)
// BB: arrow ← (right strand goes backward/left over the other)
// FB: top arrow →, bottom arrow ← (forward then backward, strands return)
// BF: top arrow ←, bottom arrow → (backward then forward, strands return)
function getArrowPath(knotType: KnotType, cx: number, cy: number, r: number): string {
  const hs = r * 0.35; // arrowhead size

  switch (knotType) {
    case 'FF': {
      // Single right-pointing arrow
      const x1 = cx - r * 0.7;
      const x2 = cx + r * 0.7;
      return `M ${x1} ${cy} L ${x2} ${cy} M ${x2 - hs} ${cy - hs} L ${x2} ${cy} L ${x2 - hs} ${cy + hs}`;
    }
    case 'BB': {
      // Single left-pointing arrow
      const x1 = cx + r * 0.7;
      const x2 = cx - r * 0.7;
      return `M ${x1} ${cy} L ${x2} ${cy} M ${x2 + hs} ${cy - hs} L ${x2} ${cy} L ${x2 + hs} ${cy + hs}`;
    }
    case 'FB': {
      // Two arrows: top right, bottom left
      const y1 = cy - r * 0.35;
      const y2 = cy + r * 0.35;
      const xl = cx - r * 0.55;
      const xr = cx + r * 0.55;
      const hs2 = hs * 0.7;
      return `M ${xl} ${y1} L ${xr} ${y1} M ${xr - hs2} ${y1 - hs2} L ${xr} ${y1} L ${xr - hs2} ${y1 + hs2}` +
        ` M ${xr} ${y2} L ${xl} ${y2} M ${xl + hs2} ${y2 - hs2} L ${xl} ${y2} L ${xl + hs2} ${y2 + hs2}`;
    }
    case 'BF': {
      // Two arrows: top left, bottom right
      const y1 = cy - r * 0.35;
      const y2 = cy + r * 0.35;
      const xl = cx - r * 0.55;
      const xr = cx + r * 0.55;
      const hs2 = hs * 0.7;
      return `M ${xr} ${y1} L ${xl} ${y1} M ${xl + hs2} ${y1 - hs2} L ${xl} ${y1} L ${xl + hs2} ${y1 + hs2}` +
        ` M ${xl} ${y2} L ${xr} ${y2} M ${xr - hs2} ${y2 - hs2} L ${xr} ${y2} L ${xr - hs2} ${y2 + hs2}`;
    }
  }
}
