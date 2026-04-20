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
  const pixelData = createMemo(() => {
    const rows: string[][] = [];
    for (let row = 0; row < props.numRows; row++) {
      const offset = row % 2 === 0 ? 0 : 1;
      const nk = knotsInRow(row, props.numStrands);
      const rowColors: string[] = [];

      // For offset rows, add edge color
      if (offset === 1) {
        rowColors.push(props.strandColors[row]?.[0] ?? "#888");
      }

      for (let k = 0; k < nk; k++) {
        const leftIdx = offset + k * 2;
        const rightIdx = leftIdx + 1;
        const knotType = props.knots[row]?.[k] ?? "FF";
        const leftColor = props.strandColors[row]?.[leftIdx] ?? "#888";
        const rightColor = props.strandColors[row]?.[rightIdx] ?? "#888";
        const color = getKnotColor(knotType, leftColor, rightColor);
        // Each knot takes 2 pixel width
        rowColors.push(color);
        rowColors.push(color);
      }

      // For offset rows, add trailing edge color
      if (offset === 1) {
        const lastIdx = props.numStrands - 1;
        rowColors.push(props.strandColors[row]?.[lastIdx] ?? "#888");
      }

      rows.push(rowColors);
    }
    return rows;
  });

  const cellSize = () => Math.max(4, Math.min(20, Math.floor(300 / props.numStrands)));

  return (
    <div style={{ "text-align": "center", padding: "8px 0" }}>
      <h3 style={{ margin: "0 0 8px", "font-size": "14px", color: "var(--text-color)" }}>
        Pattern Preview
      </h3>
      <div
        style={{
          display: "inline-block",
          border: "1px solid var(--border-color)",
          "border-radius": "4px",
          overflow: "hidden",
          "line-height": "0",
        }}
      >
        {pixelData().map((row) => (
          <div style={{ display: "flex" }}>
            {row.map((color) => (
              <div
                style={{
                  width: `${cellSize()}px`,
                  height: `${cellSize()}px`,
                  background: color,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
