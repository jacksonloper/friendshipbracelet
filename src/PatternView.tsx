import { createMemo } from "solid-js";
import type { KnotType } from "./bracelet";
import { knotsInRow, getKnotColor } from "./bracelet";

interface PatternViewProps {
  numStrands: number;
  numRows: number;
  knots: KnotType[][];
  strandColors: string[][];
}

export default function PatternView(props: PatternViewProps) {
  // Diamond size (half-diagonal length)
  const d = () => Math.max(6, Math.min(20, Math.floor(300 / props.numStrands)));

  // Full rows have numStrands/2 knots; offset rows have numStrands/2-1 knots + 2 edge half-diamonds
  // Total width = numStrands/2 diamonds wide (in the diamond grid coordinate)
  const svgWidth = () => props.numStrands / 2 * d() * 2;
  const svgHeight = () => props.numRows * d();

  const diamonds = createMemo(() => {
    const elements: { x: number; y: number; color: string; isHalf: "left" | "right" | null }[] = [];

    for (let row = 0; row < props.numRows; row++) {
      const offset = row % 2 === 0 ? 0 : 1;
      const nk = knotsInRow(row, props.numStrands);
      const dSize = d();
      const rowCenterY = row * dSize + dSize / 2;

      if (offset === 0) {
        // Full row: numStrands/2 knots, centered
        for (let k = 0; k < nk; k++) {
          const leftIdx = k * 2;
          const rightIdx = leftIdx + 1;
          const knotType = props.knots[row]?.[k] ?? "FF";
          const leftColor = props.strandColors[row]?.[leftIdx] ?? "#888";
          const rightColor = props.strandColors[row]?.[rightIdx] ?? "#888";
          const color = getKnotColor(knotType, leftColor, rightColor);
          const cx = k * dSize * 2 + dSize;
          elements.push({ x: cx, y: rowCenterY, color, isHalf: null });
        }
      } else {
        // Offset row: numStrands/2-1 knots + edge half-diamonds
        // Left edge half-diamond
        const leftEdgeColor = props.strandColors[row]?.[0] ?? "#888";
        elements.push({ x: 0, y: rowCenterY, color: leftEdgeColor, isHalf: "left" });

        for (let k = 0; k < nk; k++) {
          const leftIdx = 1 + k * 2;
          const rightIdx = leftIdx + 1;
          const knotType = props.knots[row]?.[k] ?? "FF";
          const leftColor = props.strandColors[row]?.[leftIdx] ?? "#888";
          const rightColor = props.strandColors[row]?.[rightIdx] ?? "#888";
          const color = getKnotColor(knotType, leftColor, rightColor);
          const cx = (k + 1) * dSize * 2;
          elements.push({ x: cx, y: rowCenterY, color, isHalf: null });
        }

        // Right edge half-diamond
        const lastIdx = props.numStrands - 1;
        const rightEdgeColor = props.strandColors[row]?.[lastIdx] ?? "#888";
        elements.push({ x: svgWidth(), y: rowCenterY, color: rightEdgeColor, isHalf: "right" });
      }
    }
    return elements;
  });

  const diamondPath = (cx: number, cy: number, size: number) => {
    return `M${cx},${cy - size} L${cx + size},${cy} L${cx},${cy + size} L${cx - size},${cy} Z`;
  };

  const leftHalfPath = (cx: number, cy: number, size: number) => {
    // Right half of a diamond (visible when clipped at left edge)
    return `M${cx},${cy - size} L${cx + size},${cy} L${cx},${cy + size} Z`;
  };

  const rightHalfPath = (cx: number, cy: number, size: number) => {
    // Left half of a diamond (visible when clipped at right edge)
    return `M${cx},${cy - size} L${cx - size},${cy} L${cx},${cy + size} Z`;
  };

  return (
    <div style={{ "text-align": "center", padding: "8px 0" }}>
      <h3 style={{ margin: "0 0 8px", "font-size": "14px", color: "var(--text-color)" }}>
        Pattern Preview
      </h3>
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth()} ${svgHeight()}`}
        style={{
          "max-width": `${Math.min(svgWidth(), 400)}px`,
          display: "block",
          margin: "0 auto",
        }}
      >
        {diamonds().map((item) => {
          const dSize = d() - 0.5; // slight inset for visible grid lines
          let path: string;
          if (item.isHalf === "left") {
            path = leftHalfPath(item.x, item.y, d());
          } else if (item.isHalf === "right") {
            path = rightHalfPath(item.x, item.y, d());
          } else {
            path = diamondPath(item.x, item.y, dSize);
          }
          return <path d={path} fill={item.color} stroke="var(--border-color)" stroke-width="0.5" />;
        })}
      </svg>
    </div>
  );
}
