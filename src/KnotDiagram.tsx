import { For, createMemo } from "solid-js";
import type { KnotType } from "./bracelet";
import { knotsInRow, getKnotColor } from "./bracelet";

interface KnotDiagramProps {
  numStrands: number;
  numRows: number;
  knots: KnotType[][];
  strandColors: string[][];
  onKnotClick: (row: number, col: number) => void;
}

// SVG layout constants
const STRAND_SPACING = 32;
const ROW_HEIGHT = 44;
const KNOT_RADIUS = 13;
const PADDING_X = 24;
const PADDING_TOP = 20;
const STRAND_WIDTH = 5;
const OUTLINE_WIDTH = 2;
// Outline stops this far from knot center; color stops closer (creating gap in outline)
const OUTLINE_GAP = KNOT_RADIUS + 1;
const COLOR_GAP = KNOT_RADIUS - 3; // color extends past outline, into the circle

function strandX(index: number): number {
  return PADDING_X + index * STRAND_SPACING;
}

function knotCenter(row: number, col: number): { x: number; y: number } {
  const offset = row % 2 === 0 ? 0 : 1;
  const leftIdx = offset + col * 2;
  return {
    x: (strandX(leftIdx) + strandX(leftIdx + 1)) / 2,
    y: PADDING_TOP + ROW_HEIGHT * (row + 0.5),
  };
}

function rowTopY(row: number): number {
  return PADDING_TOP + row * ROW_HEIGHT;
}

// Clip a line segment so it stops `gap` distance from (cx,cy)
function clipToward(
  fromX: number, fromY: number,
  cx: number, cy: number,
  gap: number
): { x: number; y: number } {
  const dx = cx - fromX;
  const dy = cy - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: cx, y: cy };
  const t = Math.max(0, (len - gap) / len);
  return { x: fromX + dx * t, y: fromY + dy * t };
}

function clipAway(
  cx: number, cy: number,
  toX: number, toY: number,
  gap: number
): { x: number; y: number } {
  const dx = toX - cx;
  const dy = toY - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: cx, y: cy };
  const frac = gap / len;
  return { x: cx + dx * frac, y: cy + dy * frac };
}

// Arrow paths: clear directional indicators
// FF: two right arrows ⇉
// BB: two left arrows ⇇
// FB: right then left →←
// BF: left then right ←→
function knotArrowPath(knotType: KnotType): string {
  const a = 8; // arrow span
  const h = 3; // arrowhead size
  const g = 3; // vertical gap between arrows
  switch (knotType) {
    case "FF":
      return [
        `M${-a},-${g} L${a-h},-${g}`, // top shaft
        `M${a-2*h},-${g+h} L${a-h},-${g} L${a-2*h},-${g-h}`, // top head
        `M${-a},${g} L${a-h},${g}`, // bottom shaft
        `M${a-2*h},${g+h} L${a-h},${g} L${a-2*h},${g-h}`, // bottom head
      ].join(" ");
    case "BB":
      return [
        `M${a},-${g} L${-a+h},-${g}`, // top shaft
        `M${-a+2*h},-${g+h} L${-a+h},-${g} L${-a+2*h},-${g-h}`, // top head
        `M${a},${g} L${-a+h},${g}`, // bottom shaft
        `M${-a+2*h},${g+h} L${-a+h},${g} L${-a+2*h},${g-h}`, // bottom head
      ].join(" ");
    case "FB":
      return [
        `M${-a},-${g} L${a-h},-${g}`, // top shaft →
        `M${a-2*h},-${g+h} L${a-h},-${g} L${a-2*h},-${g-h}`,
        `M${a},${g} L${-a+h},${g}`, // bottom shaft ←
        `M${-a+2*h},${g+h} L${-a+h},${g} L${-a+2*h},${g-h}`,
      ].join(" ");
    case "BF":
      return [
        `M${a},-${g} L${-a+h},-${g}`, // top shaft ←
        `M${-a+2*h},-${g+h} L${-a+h},-${g} L${-a+2*h},-${g-h}`,
        `M${-a},${g} L${a-h},${g}`, // bottom shaft →
        `M${a-2*h},${g+h} L${a-h},${g} L${a-2*h},${g-h}`,
      ].join(" ");
  }
}

export default function KnotDiagram(props: KnotDiagramProps) {
  const svgWidth = () => PADDING_X * 2 + (props.numStrands - 1) * STRAND_SPACING;
  const svgHeight = () => PADDING_TOP * 2 + props.numRows * ROW_HEIGHT;

  // Reactive memo that rebuilds strand SVG elements when strandColors or knots change
  const strandElements = createMemo(() => {
    const elements: any[] = [];
    for (let row = 0; row < props.numRows; row++) {
      const offset = row % 2 === 0 ? 0 : 1;
      const nk = knotsInRow(row, props.numStrands);
      const topY = rowTopY(row);
      const bottomY = rowTopY(row + 1);

      for (let k = 0; k < nk; k++) {
        const leftIdx = offset + k * 2;
        const rightIdx = leftIdx + 1;
        const kp = knotCenter(row, k);
        const knotType = props.knots[row]?.[k] ?? "FF";
        const leftColor = props.strandColors[row]?.[leftIdx] ?? "#888";
        const rightColor = props.strandColors[row]?.[rightIdx] ?? "#888";
        const activeColor = getKnotColor(knotType, leftColor, rightColor);
        const isLeftActive = activeColor === leftColor;
        const doesSwap = knotType === "FF" || knotType === "BB";
        const leftExitX = doesSwap ? strandX(rightIdx) : strandX(leftIdx);
        const rightExitX = doesSwap ? strandX(leftIdx) : strandX(rightIdx);

        const drawHalf = (
          fromX: number, fromY: number,
          toX: number, toY: number,
          color: string,
          isEntry: boolean
        ) => {
          if (isEntry) {
            const oEnd = clipToward(fromX, fromY, kp.x, kp.y, OUTLINE_GAP);
            const cEnd = clipToward(fromX, fromY, kp.x, kp.y, COLOR_GAP);
            elements.push(
              <line x1={fromX} y1={fromY} x2={oEnd.x} y2={oEnd.y}
                stroke="var(--border-color)"
                stroke-width={STRAND_WIDTH + OUTLINE_WIDTH * 2}
                stroke-linecap="butt" />
            );
            elements.push(
              <line x1={fromX} y1={fromY} x2={cEnd.x} y2={cEnd.y}
                stroke={color}
                stroke-width={STRAND_WIDTH}
                stroke-linecap="butt" />
            );
          } else {
            const oFrom = clipAway(kp.x, kp.y, toX, toY, OUTLINE_GAP);
            const cFrom = clipAway(kp.x, kp.y, toX, toY, COLOR_GAP);
            elements.push(
              <line x1={oFrom.x} y1={oFrom.y} x2={toX} y2={toY}
                stroke="var(--border-color)"
                stroke-width={STRAND_WIDTH + OUTLINE_WIDTH * 2}
                stroke-linecap="butt" />
            );
            elements.push(
              <line x1={cFrom.x} y1={cFrom.y} x2={toX} y2={toY}
                stroke={color}
                stroke-width={STRAND_WIDTH}
                stroke-linecap="butt" />
            );
          }
        };

        const drawStrand = (entryX: number, exitX: number, color: string) => {
          drawHalf(entryX, topY, 0, 0, color, true);
          drawHalf(0, 0, exitX, bottomY, color, false);
        };

        if (isLeftActive) {
          drawStrand(strandX(rightIdx), rightExitX, rightColor);
          drawStrand(strandX(leftIdx), leftExitX, leftColor);
        } else {
          drawStrand(strandX(leftIdx), leftExitX, leftColor);
          drawStrand(strandX(rightIdx), rightExitX, rightColor);
        }
      }

      // Edge strands (offset rows)
      if (offset === 1) {
        const drawEdge = (idx: number) => {
          const x = strandX(idx);
          const color = props.strandColors[row]?.[idx] ?? "#888";
          elements.push(
            <line x1={x} y1={topY} x2={x} y2={bottomY}
              stroke="var(--border-color)"
              stroke-width={STRAND_WIDTH + OUTLINE_WIDTH * 2}
              stroke-linecap="butt" />
          );
          elements.push(
            <line x1={x} y1={topY} x2={x} y2={bottomY}
              stroke={color} stroke-width={STRAND_WIDTH}
              stroke-linecap="butt" />
          );
        };
        drawEdge(0);
        drawEdge(props.numStrands - 1);
      }
    }
    return elements;
  });

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
      {/* Layer 1: Strand segments (reactive via createMemo) */}
      {strandElements()}

      {/* Layer 2: Knot circles (no border - the outline gap creates the connection effect) */}
      <For each={Array.from({ length: props.numRows })}>
        {(_, rowIdx) => {
          const row = rowIdx();
          const nk = knotsInRow(row, props.numStrands);
          const offset = row % 2 === 0 ? 0 : 1;
          return (
            <For each={Array.from({ length: nk })}>
              {(_, colIdx) => {
                const col = colIdx();
                const pos = knotCenter(row, col);
                const knotType = () => props.knots[row]?.[col] ?? "FF";
                const leftIdx = offset + col * 2;
                const rightIdx = leftIdx + 1;
                const leftColor = () => props.strandColors[row]?.[leftIdx] ?? "#888";
                const rightColor = () => props.strandColors[row]?.[rightIdx] ?? "#888";
                const kColor = () => getKnotColor(knotType(), leftColor(), rightColor());

                return (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => props.onKnotClick(row, col)}
                  >
                    {/* Filled circle - no stroke so strand color flows in */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={KNOT_RADIUS}
                      fill={kColor()}
                    />
                    {/* Arrow */}
                    <path
                      d={knotArrowPath(knotType())}
                      transform={`translate(${pos.x},${pos.y})`}
                      fill="none"
                      stroke="var(--arrow-color)"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    {/* Invisible larger click target */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={KNOT_RADIUS + 4}
                      fill="transparent"
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
