// Knot types: FF, BB, FB, BF
// F = forward knot, B = backward knot
// First letter = direction top-left strand goes, Second letter = direction top-right strand goes
// FF: left strand goes over, ends on right; right strand goes under, ends on left
// BB: right strand goes over, ends on left; left strand goes under, ends on right
// FB: left strand goes over right, then right goes over left (both swap back)
// BF: right strand goes over left, then left goes over right (both swap back)

export type KnotType = 'FF' | 'BB' | 'FB' | 'BF';

export interface BraceletState {
  numStrands: number;
  numRows: number;
  colors: string[];
  knots: KnotType[][];
  lockPattern: boolean;
}

// Get number of knots in a given row (0-indexed)
export function knotsInRow(numStrands: number, rowIndex: number): number {
  if (rowIndex % 2 === 0) {
    return numStrands / 2;
  } else {
    return numStrands / 2 - 1;
  }
}

// Compute the strand positions after applying all knots
// Returns an array of arrays: strandOrder[row] = array of strand indices from left to right at that level
export function computeStrandOrder(state: BraceletState): number[][] {
  const { numStrands, numRows, knots } = state;
  // strandOrder[i] has numStrands entries representing which original strand is at each position
  const strandOrder: number[][] = [];
  
  // Initial order
  let current = Array.from({ length: numStrands }, (_, i) => i);
  strandOrder.push([...current]);

  for (let row = 0; row < numRows; row++) {
    const nk = knotsInRow(numStrands, row);
    const offset = row % 2 === 0 ? 0 : 1;
    
    for (let k = 0; k < nk; k++) {
      const leftIdx = offset + k * 2;
      const rightIdx = leftIdx + 1;
      const knotType = knots[row]?.[k] ?? 'FF';
      
      // Determine if strands swap positions
      if (knotType === 'FF' || knotType === 'BF') {
        // Strands swap: left goes to right position, right goes to left position
        const temp = current[leftIdx];
        current[leftIdx] = current[rightIdx];
        current[rightIdx] = temp;
      }
      // FB and BB: strands stay in same positions
    }
    strandOrder.push([...current]);
  }

  return strandOrder;
}

// Get the color that appears on top of a knot (the "active" color shown in the knot circle)
export function getKnotTopColor(
  knotType: KnotType,
  leftStrandColor: string,
  rightStrandColor: string
): string {
  switch (knotType) {
    case 'FF':
    case 'FB':
      return leftStrandColor; // left strand is on top
    case 'BB':
    case 'BF':
      return rightStrandColor; // right strand is on top
  }
}

// Get which strand is "over" (on top): 'left' or 'right'
export function getOverStrand(knotType: KnotType): 'left' | 'right' {
  switch (knotType) {
    case 'FF':
    case 'FB':
      return 'left';
    case 'BB':
    case 'BF':
      return 'right';
  }
}

// Cycle knot type
const knotCycle: KnotType[] = ['FF', 'BB', 'FB', 'BF'];
export function cycleKnot(current: KnotType): KnotType {
  const idx = knotCycle.indexOf(current);
  return knotCycle[(idx + 1) % 4];
}

// Generate default knots
export function generateDefaultKnots(numStrands: number, numRows: number): KnotType[][] {
  const knots: KnotType[][] = [];
  for (let row = 0; row < numRows; row++) {
    const nk = knotsInRow(numStrands, row);
    knots.push(Array(nk).fill('FF'));
  }
  return knots;
}

// Default colors (ROYGBV)
export function defaultColors(): string[] {
  return ['#FF0000', '#FF8800', '#FFFF00', '#00CC00', '#0000FF', '#8800FF'];
}

// Compute the rasterized pattern (color of each "pixel" in the bracelet)
// Each knot produces one colored square; short rows have side squares
export function computePattern(state: BraceletState): string[][] {
  const { numStrands, numRows, knots, colors } = state;
  const strandOrder = computeStrandOrder(state);
  const pattern: string[][] = [];

  for (let row = 0; row < numRows; row++) {
    const nk = knotsInRow(numStrands, row);
    const offset = row % 2 === 0 ? 0 : 1;
    const rowColors: string[] = [];

    if (row % 2 === 1) {
      // Short row: add left edge color
      rowColors.push(colors[strandOrder[row][0]]);
    }

    for (let k = 0; k < nk; k++) {
      const leftIdx = offset + k * 2;
      const rightIdx = leftIdx + 1;
      const leftColor = colors[strandOrder[row][leftIdx]];
      const rightColor = colors[strandOrder[row][rightIdx]];
      const knotType = knots[row]?.[k] ?? 'FF';
      rowColors.push(getKnotTopColor(knotType, leftColor, rightColor));
    }

    if (row % 2 === 1) {
      // Short row: add right edge color
      rowColors.push(colors[strandOrder[row][numStrands - 1]]);
    }

    pattern.push(rowColors);
  }

  return pattern;
}

// Export state to JSON
export function stateToJSON(state: BraceletState): string {
  return JSON.stringify({
    numStrands: state.numStrands,
    numRows: state.numRows,
    colors: state.colors,
    knots: state.knots,
    lockPattern: state.lockPattern,
  });
}

// Import state from JSON
export function stateFromJSON(json: string): BraceletState | null {
  try {
    const obj = JSON.parse(json);
    if (
      typeof obj.numStrands === 'number' &&
      typeof obj.numRows === 'number' &&
      Array.isArray(obj.colors) &&
      Array.isArray(obj.knots)
    ) {
      return {
        numStrands: obj.numStrands,
        numRows: obj.numRows,
        colors: obj.colors,
        knots: obj.knots,
        lockPattern: obj.lockPattern ?? true,
      };
    }
  } catch {
    // invalid JSON
  }
  return null;
}
