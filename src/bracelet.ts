// Knot types for friendship bracelet
// FF = Forward-Forward, BB = Backward-Backward, FB = Forward-Backward, BF = Backward-Forward
export type KnotType = "FF" | "BB" | "FB" | "BF";

export interface BraceletState {
  numStrands: number;
  numRows: number;
  colors: string[];
  knots: KnotType[][];
}

// Get number of knots in a given row (0-indexed)
export function knotsInRow(row: number, numStrands: number): number {
  // Odd rows (0,2,4,...) have n/2 knots, even rows (1,3,5,...) have n/2-1 knots
  return row % 2 === 0 ? numStrands / 2 : numStrands / 2 - 1;
}

// Compute strand colors at each position after applying knots row by row.
// Returns array of arrays: strandColors[row] gives colors BEFORE that row's knots are applied.
// strandColors[numRows] gives colors AFTER the last row.
export function computeStrandColors(
  initialColors: string[],
  knots: KnotType[][],
  numRows: number,
  numStrands: number
): string[][] {
  const result: string[][] = [initialColors.slice()];

  for (let row = 0; row < numRows; row++) {
    const prev = result[row].slice();
    const offset = row % 2 === 0 ? 0 : 1;
    const nk = knotsInRow(row, numStrands);

    for (let k = 0; k < nk; k++) {
      const leftIdx = offset + k * 2;
      const rightIdx = leftIdx + 1;
      const knotType = knots[row]?.[k] ?? "FF";

      // Determine which colors pass through based on knot type
      // Left strand enters from top-left, right strand enters from top-right
      // FF: left color goes right, right stays left → swap
      // BB: right color goes left, left stays right → swap
      // FB: left goes right then back → left stays left, right stays right (no swap)
      // BF: right goes left then back → left stays left, right stays right (no swap)
      switch (knotType) {
        case "FF":
          // Left strand crosses over right → colors swap
          [prev[leftIdx], prev[rightIdx]] = [prev[rightIdx], prev[leftIdx]];
          break;
        case "BB":
          // Right strand crosses over left → colors swap
          [prev[leftIdx], prev[rightIdx]] = [prev[rightIdx], prev[leftIdx]];
          break;
        case "FB":
          // No swap - strands stay on same side
          break;
        case "BF":
          // No swap - strands stay on same side
          break;
      }
    }
    result.push(prev);
  }

  return result;
}

// Get the "active" color of a knot (the color that wraps around)
export function getKnotColor(
  knotType: KnotType,
  leftColor: string,
  rightColor: string
): string {
  switch (knotType) {
    case "FF":
      return leftColor; // left strand wraps
    case "BB":
      return rightColor; // right strand wraps
    case "FB":
      return leftColor; // left strand wraps
    case "BF":
      return rightColor; // right strand wraps
  }
}

// Cycle to next knot type
export function cycleKnot(current: KnotType): KnotType {
  const order: KnotType[] = ["FF", "BB", "FB", "BF"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % 4];
}

// Generate default knots for given dimensions
export function generateDefaultKnots(
  numRows: number,
  numStrands: number
): KnotType[][] {
  const knots: KnotType[][] = [];
  for (let row = 0; row < numRows; row++) {
    const nk = knotsInRow(row, numStrands);
    knots.push(Array(nk).fill("FF"));
  }
  return knots;
}

// Default ROYGBV colors
export function defaultColors(): string[] {
  return ["#FF0000", "#FF8800", "#FFFF00", "#00CC00", "#0000FF", "#8800FF"];
}

// Serialize state to JSON
export function stateToJSON(state: BraceletState): string {
  return JSON.stringify(state, null, 2);
}

// Parse JSON to state
export function jsonToState(json: string): BraceletState | null {
  try {
    const parsed = JSON.parse(json);
    if (
      typeof parsed.numStrands === "number" &&
      typeof parsed.numRows === "number" &&
      Array.isArray(parsed.colors) &&
      Array.isArray(parsed.knots)
    ) {
      return parsed as BraceletState;
    }
    return null;
  } catch {
    return null;
  }
}
