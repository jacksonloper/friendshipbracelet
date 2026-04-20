import { For } from "solid-js";
import type { KnotType } from "./bracelet";
import {
  knotsInRow,
  getKnotColor,
} from "./bracelet";

interface KnotDiagramProps {
  numStrands: number;
  numRows: number;
  knots: KnotType[][];
  strandColors: string[][];
  onKnotClick: (row: number, col: number) => void;
}

// SVG layout constants
const STRAND_SPACING = 30;
const ROW_HEIGHT = 40;
const KNOT_RADIUS = 12;
const PADDING_X = 30;
const PADDING_Y = 30;
const STRAND_WIDTH = 4;
const OUTLINE_WIDTH = 2;

function getKnotPos(
  row: number,
  col: number,
  _numStrands: number
): { x: number; y: number } {
  const offset = row % 2 === 0 ? 0 : 1;
  const leftIdx = offset + col * 2;
  const x = PADDING_X + (leftIdx + 0.5) * STRAND_SPACING;
  const y = PADDING_Y + row * ROW_HEIGHT + ROW_HEIGHT / 2;
  return { x, y };
}

// Arrow paths for knot types
function getArrowPath(knotType: KnotType): string {
  const s = 7; // arrow size
  switch (knotType) {
    case "FF":
      // Forward-Forward: arrow pointing right-down then right-down
      return `M${-s},${-s/2} L${s/2},0 L${-s/3},${s/2}`;
    case "BB":
      // Backward-Backward: arrow pointing left-down then left-down
      return `M${s},${-s/2} L${-s/2},0 L${s/3},${s/2}`;
    case "FB":
      // Forward then Backward: arrow right then left
      return `M${-s},0 L${s},0 M${s-3},${-3} L${s},0 L${s-3},${3}`;
    case "BF":
      // Backward then Forward: arrow left then right
      return `M${s},0 L${-s},0 M${-s+3},${-3} L${-s},0 L${-s+3},${3}`;
  }
}

export default function KnotDiagram(props: KnotDiagramProps) {
  const svgWidth = () => PADDING_X * 2 + (props.numStrands - 1) * STRAND_SPACING;
  const svgHeight = () => PADDING_Y * 2 + props.numRows * ROW_HEIGHT;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgWidth()} ${svgHeight()}`}
      style={{
        "max-width": `${Math.min(svgWidth(), 600)}px`,
        display: "block",
        margin: "0 auto",
      }}
    >
      {/* Draw strand segments between knots */}
      <For each={Array.from({ length: props.numRows + 1 })}>
        {(_, rowIdx) => {
          const row = rowIdx();
          // Draw strands going from row to row+1
          if (row >= props.numRows) return null;

          const offset = row % 2 === 0 ? 0 : 1;
          const nk = knotsInRow(row, props.numStrands);
          const elements: any[] = [];

          // For each knot in this row, draw connecting strands
          for (let k = 0; k < nk; k++) {
            const leftIdx = offset + k * 2;
            const rightIdx = leftIdx + 1;
            const knotPos = getKnotPos(row, k, props.numStrands);
            const knotType = props.knots[row]?.[k] ?? "FF";

            // Top strand positions
            const topY = row === 0 ? PADDING_Y : PADDING_Y + row * ROW_HEIGHT;
            const bottomY = PADDING_Y + (row + 1) * ROW_HEIGHT;

            const leftX = PADDING_X + leftIdx * STRAND_SPACING;
            const rightX = PADDING_X + rightIdx * STRAND_SPACING;

            const leftColor = props.strandColors[row]?.[leftIdx] ?? "#888";
            const rightColor = props.strandColors[row]?.[rightIdx] ?? "#888";

            // Determine drawing order based on which strand is on top at the knot
            const knotColor = getKnotColor(knotType, leftColor, rightColor);
            const isLeftOnTop = knotColor === leftColor;

            // Get output colors
            const outputColors = props.strandColors[row + 1];
            const outLeftColor = outputColors?.[leftIdx] ?? "#888";
            const outRightColor = outputColors?.[rightIdx] ?? "#888";

            // Draw lines from top position to knot center, and from knot center to bottom position
            // The strand that's "behind" gets drawn first
            const strandsToDraw = isLeftOnTop
              ? [
                  // Right strand behind
                  { fromX: rightX, toKnotX: knotPos.x, fromKnotX: knotPos.x, toX: rightIdx === leftIdx ? leftX : rightX, color: rightColor, outColor: outRightColor, behind: true, side: "right" as const },
                  // Left strand on top
                  { fromX: leftX, toKnotX: knotPos.x, fromKnotX: knotPos.x, toX: leftIdx === rightIdx ? rightX : leftX, color: leftColor, outColor: outLeftColor, behind: false, side: "left" as const },
                ]
              : [
                  // Left strand behind
                  { fromX: leftX, toKnotX: knotPos.x, fromKnotX: knotPos.x, toX: leftIdx === rightIdx ? rightX : leftX, color: leftColor, outColor: outLeftColor, behind: true, side: "left" as const },
                  // Right strand on top
                  { fromX: rightX, toKnotX: knotPos.x, fromKnotX: knotPos.x, toX: rightIdx === leftIdx ? leftX : rightX, color: rightColor, outColor: outRightColor, behind: false, side: "right" as const },
                ];

            for (const strand of strandsToDraw) {
              // Determine output position based on knot type and side
              let outX: number;
              if (strand.side === "left") {
                // Left strand: swaps for FF/BB, stays for FB/BF
                outX = (knotType === "FF" || knotType === "BB") ? rightX : leftX;
              } else {
                // Right strand: swaps for FF/BB, stays for FB/BF
                outX = (knotType === "FF" || knotType === "BB") ? leftX : rightX;
              }

              // Upper segment: from top to knot (with gap for knot circle)
              const dx1 = knotPos.x - strand.fromX;
              const dy1 = knotPos.y - topY;
              const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
              const gapX1 = len1 > 0 ? (dx1 / len1) * KNOT_RADIUS : 0;
              const gapY1 = len1 > 0 ? (dy1 / len1) * KNOT_RADIUS : 0;

              // Lower segment: from knot to bottom
              const dx2 = outX - knotPos.x;
              const dy2 = bottomY - knotPos.y;
              const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              const gapX2 = len2 > 0 ? (dx2 / len2) * KNOT_RADIUS : 0;
              const gapY2 = len2 > 0 ? (dy2 / len2) * KNOT_RADIUS : 0;

              // Outline (border)
              elements.push(
                <line
                  x1={strand.fromX}
                  y1={topY}
                  x2={knotPos.x - gapX1}
                  y2={knotPos.y - gapY1}
                  stroke="var(--border-color)"
                  stroke-width={STRAND_WIDTH + OUTLINE_WIDTH * 2}
                  stroke-linecap="round"
                />
              );
              elements.push(
                <line
                  x1={knotPos.x + gapX2}
                  y1={knotPos.y + gapY2}
                  x2={outX}
                  y2={bottomY}
                  stroke="var(--border-color)"
                  stroke-width={STRAND_WIDTH + OUTLINE_WIDTH * 2}
                  stroke-linecap="round"
                />
              );

              // Color fill
              elements.push(
                <line
                  x1={strand.fromX}
                  y1={topY}
                  x2={knotPos.x - gapX1}
                  y2={knotPos.y - gapY1}
                  stroke={strand.color}
                  stroke-width={STRAND_WIDTH}
                  stroke-linecap="round"
                />
              );
              elements.push(
                <line
                  x1={knotPos.x + gapX2}
                  y1={knotPos.y + gapY2}
                  x2={outX}
                  y2={bottomY}
                  stroke={strand.color}
                  stroke-width={STRAND_WIDTH}
                  stroke-linecap="round"
                />
              );
            }
          }

          // Draw strands that don't participate in knots (edges on offset rows)
          if (offset === 1) {
            // First strand (index 0) goes straight down
            const topY = row === 0 ? PADDING_Y : PADDING_Y + row * ROW_HEIGHT;
            const bottomY = PADDING_Y + (row + 1) * ROW_HEIGHT;
            const x = PADDING_X + 0 * STRAND_SPACING;
            const color = props.strandColors[row]?.[0] ?? "#888";
            elements.push(
              <line x1={x} y1={topY} x2={x} y2={bottomY} stroke="var(--border-color)" stroke-width={STRAND_WIDTH + OUTLINE_WIDTH * 2} stroke-linecap="round" />
            );
            elements.push(
              <line x1={x} y1={topY} x2={x} y2={bottomY} stroke={color} stroke-width={STRAND_WIDTH} stroke-linecap="round" />
            );
            // Last strand goes straight down
            const lastIdx = props.numStrands - 1;
            const lx = PADDING_X + lastIdx * STRAND_SPACING;
            const lcolor = props.strandColors[row]?.[lastIdx] ?? "#888";
            elements.push(
              <line x1={lx} y1={topY} x2={lx} y2={bottomY} stroke="var(--border-color)" stroke-width={STRAND_WIDTH + OUTLINE_WIDTH * 2} stroke-linecap="round" />
            );
            elements.push(
              <line x1={lx} y1={topY} x2={lx} y2={bottomY} stroke={lcolor} stroke-width={STRAND_WIDTH} stroke-linecap="round" />
            );
          }

          return <>{elements}</>;
        }}
      </For>

      {/* Draw knot circles on top */}
      <For each={Array.from({ length: props.numRows })}>
        {(_, rowIdx) => {
          const row = rowIdx();
          const nk = knotsInRow(row, props.numStrands);
          return (
            <For each={Array.from({ length: nk })}>
              {(_, colIdx) => {
                const col = colIdx();
                const pos = getKnotPos(row, col, props.numStrands);
                const knotType = () => props.knots[row]?.[col] ?? "FF";
                const leftColor = () => props.strandColors[row]?.[row % 2 === 0 ? col * 2 : col * 2 + 1] ?? "#888";
                const rightColor = () => props.strandColors[row]?.[row % 2 === 0 ? col * 2 + 1 : col * 2 + 2] ?? "#888";
                const knotColor = () => getKnotColor(knotType(), leftColor(), rightColor());

                return (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => props.onKnotClick(row, col)}
                  >
                    {/* Knot circle background */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={KNOT_RADIUS}
                      fill={knotColor()}
                      stroke="var(--border-color)"
                      stroke-width={OUTLINE_WIDTH}
                    />
                    {/* Arrow indicator */}
                    <path
                      d={getArrowPath(knotType())}
                      transform={`translate(${pos.x},${pos.y})`}
                      fill="none"
                      stroke="var(--arrow-color)"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                );
              }}
            </For>
          );
        }}
      </For>
    </svg>
  );
}
