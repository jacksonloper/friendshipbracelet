export type BraidDirection = 'Z' | 'S';

/**
 * The kind of sub-step in the simulation:
 *   start      – initial state before any moves
 *   cross      – the Z or S 4-cycle (only slots 0, 1, half, half+1 move)
 *   rotate     – counter-clockwise disk rotation by 2 positions (all slots shift)
 *   transition – pair-swap when direction changes (all adjacent pairs swap)
 */
export type SnapshotKind = 'start' | 'cross' | 'rotate' | 'transition';

export interface StrandSpec {
  id: number;
  color: string;
}

export interface KongoPair {
  pairIndex: number;
  slotA: number;
  slotB: number;
  first: StrandSpec;
  second: StrandSpec;
}

export interface KongoSnapshot {
  /** Index of this snapshot in the full snapshots array. */
  subStep: number;
  /** Which letter in the input sequence this sub-step belongs to (0 = start). */
  sequenceStep: number;
  kind: SnapshotKind;
  move: BraidDirection | null;
  slots: StrandSpec[];
  pairs: KongoPair[];
  /** Slot indices that participate in the move for this sub-step. */
  activeSlots: number[];
}

export interface KongoSimulationResult {
  snapshots: KongoSnapshot[];
  finalSlots: StrandSpec[];
  errors: string[];
}

const DEFAULT_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#78716c',
  '#0f766e',
];

export function ensureStrandCountDivisibleByFour(count: number): number {
  if (!Number.isFinite(count)) return 8;
  const clamped = Math.max(4, Math.round(count));
  const remainder = clamped % 4;
  return remainder === 0 ? clamped : clamped + (4 - remainder);
}

export function createDefaultStrands(count: number): StrandSpec[] {
  const strandCount = ensureStrandCountDivisibleByFour(count);
  return Array.from({ length: strandCount }, (_, index) => ({
    id: index + 1,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));
}

export function resizeStrands(previous: StrandSpec[], count: number): StrandSpec[] {
  const strandCount = ensureStrandCountDivisibleByFour(count);
  return Array.from({ length: strandCount }, (_, index) => ({
    id: index + 1,
    color: previous[index]?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));
}

export function createDefaultKongoSequence(): string {
  return 'ZZZZZZZZ';
}

export function parseKongoSequence(input: string): { sequence: BraidDirection[]; errors: string[] } {
  const sequence: BraidDirection[] = [];
  const errors: string[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]?.toUpperCase();
    if (char === 'Z' || char === 'S') {
      sequence.push(char);
      continue;
    }

    if (char && /[\s,;|]/.test(char)) {
      continue;
    }

    if (char) {
      errors.push(`Unsupported character "${char}" at position ${index + 1}. Use only Z and S.`);
    }
  }

  return {
    sequence: errors.length === 0 ? sequence : [],
    errors,
  };
}

export function simulateKongo(strands: StrandSpec[], sequence: readonly BraidDirection[]): KongoSimulationResult {
  const errors = validateStrands(strands);
  const startingSlots = strands.slice();

  const startSnapshot: KongoSnapshot = {
    subStep: 0,
    sequenceStep: 0,
    kind: 'start',
    move: null,
    slots: startingSlots.slice(),
    pairs: createPairs(startingSlots),
    activeSlots: [],
  };

  if (errors.length > 0) {
    return { snapshots: [startSnapshot], finalSlots: startingSlots, errors };
  }

  const strandCount = strands.length;
  const half = strandCount / 2;
  const zCross = buildZCrossPerm(strandCount);
  const sCross = buildSCrossPerm(strandCount);
  const rotateCCW = buildRotateCCWPerm(strandCount);
  const trans = buildTransitionPerm(strandCount);
  const crossActiveSlots = [0, 1, half, half + 1];
  const allSlots = Array.from({ length: strandCount }, (_, i) => i);

  const snapshots: KongoSnapshot[] = [startSnapshot];
  let slots = startingSlots.slice();
  let previousMove: BraidDirection | null = null;
  let subStep = 1;

  for (let seqIndex = 0; seqIndex < sequence.length; seqIndex++) {
    const move = sequence[seqIndex]!;
    const sequenceStep = seqIndex + 1;

    if (previousMove !== null && previousMove !== move) {
      slots = applyPerm(slots, trans);
      snapshots.push({
        subStep: subStep++,
        sequenceStep,
        kind: 'transition',
        move,
        slots: slots.slice(),
        pairs: createPairs(slots),
        activeSlots: allSlots.slice(),
      });
    }

    slots = applyPerm(slots, move === 'Z' ? zCross : sCross);
    snapshots.push({
      subStep: subStep++,
      sequenceStep,
      kind: 'cross',
      move,
      slots: slots.slice(),
      pairs: createPairs(slots),
      activeSlots: crossActiveSlots.slice(),
    });

    slots = applyPerm(slots, rotateCCW);
    snapshots.push({
      subStep: subStep++,
      sequenceStep,
      kind: 'rotate',
      move,
      slots: slots.slice(),
      pairs: createPairs(slots),
      activeSlots: allSlots.slice(),
    });

    previousMove = move;
  }

  return { snapshots, finalSlots: slots, errors: [] };
}

function validateStrands(strands: StrandSpec[]): string[] {
  if (strands.length === 0 || strands.length % 4 !== 0) {
    return ['The number of strands must be positive and divisible by 4.'];
  }

  return [];
}

function createPairs(slots: StrandSpec[]): KongoPair[] {
  const pairs: KongoPair[] = [];
  for (let index = 0; index < slots.length; index += 2) {
    const first = slots[index];
    const second = slots[index + 1];
    if (!first || !second) {
      continue;
    }

    pairs.push({
      pairIndex: index / 2,
      slotA: index,
      slotB: index + 1,
      first,
      second,
    });
  }
  return pairs;
}

function applyPerm<T>(items: readonly T[], perm: readonly number[]): T[] {
  if (items.length !== perm.length) {
    throw new Error('Permutation length does not match item length.');
  }

  perm.forEach(sourceIndex => {
    if (sourceIndex < 0 || sourceIndex >= items.length) {
      throw new Error(`Permutation index ${sourceIndex} is out of bounds.`);
    }
  });

  return perm.map(sourceIndex => items[sourceIndex] as T);
}

/**
 * Z cross: 4-cycle 0 → 1 → 2n → 2n+1 → 0
 * (slot 0 sends its strand to slot 1, slot 1 to slot 2n, etc.)
 * In perm[dest]=src notation:
 *   slot 1    ← slot 0
 *   slot 2n   ← slot 1
 *   slot 2n+1 ← slot 2n
 *   slot 0    ← slot 2n+1
 */
function buildZCrossPerm(strandCount: number): number[] {
  const half = strandCount / 2;
  const perm = Array.from({ length: strandCount }, (_, i) => i);
  perm[0] = half + 1;
  perm[1] = 0;
  perm[half] = 1;
  perm[half + 1] = half;
  return perm;
}

/**
 * S cross: reverse 4-cycle 2n → 1 → 0 → 2n+1 → 2n
 * In perm[dest]=src notation:
 *   slot 0    ← slot 1
 *   slot 1    ← slot 2n
 *   slot 2n   ← slot 2n+1
 *   slot 2n+1 ← slot 0
 */
function buildSCrossPerm(strandCount: number): number[] {
  const half = strandCount / 2;
  const perm = Array.from({ length: strandCount }, (_, i) => i);
  perm[0] = 1;
  perm[1] = half;
  perm[half] = half + 1;
  perm[half + 1] = 0;
  return perm;
}

/**
 * Counter-clockwise disk rotation by 2 positions.
 *
 * Strand at slot `src` moves CCW to slot `dest = (src - 2 + n) % n`.
 * In perm[dest] = src notation: dest `j` sources from `(j + 2) % n`.
 *   → perm[i] = (i + 2) % n
 *
 * Verification for n=8: perm[6] = 0, meaning slot 6 receives the strand
 * from slot 0.  The strand moved from slot 0 to slot 6 = (0 - 2 + 8) % 8. ✓
 */
function buildRotateCCWPerm(strandCount: number): number[] {
  return Array.from({ length: strandCount }, (_, i) => (i + 2) % strandCount);
}

/**
 * Transition: swap every adjacent pair.
 * (0↔1, 2↔3, 4↔5, …)
 */
function buildTransitionPerm(strandCount: number): number[] {
  const perm = Array.from({ length: strandCount }, (_, i) => i);
  for (let i = 0; i < strandCount; i += 2) {
    perm[i] = i + 1;
    perm[i + 1] = i;
  }
  return perm;
}

/**
 * Compute the visible bracelet pattern from the initial strand arrangement.
 *
 * Algorithm (reverse-engineered from Kumihimo.js / jquery.kumihimo.js):
 *   S = 4n strands, G = n groups of 4, W = 2n pattern columns.
 *   groups[g] = [ strands[4g+1], strands[4g], strands[4g+3], strands[4g+2] ]
 *   pattern[i][j]:
 *     g = (j + floor(i/2))         mod G
 *     k = (i - floor((j+i/2) / G)) mod 4   (i/2 is real division)
 *     color = groups[g][k].color
 *
 * The resulting grid is rendered on an oblique lattice with overlapping ellipses
 * to produce the woven look.
 */
export function computeKumihimoPattern(
  initialStrands: StrandSpec[],
  numRows: number,
): string[][] {
  const S = initialStrands.length;
  if (S < 4 || S % 4 !== 0) return [];

  const G = S / 4;

  // Build groups of 4, swapping each pair within the group.
  const groups: string[][] = [];
  for (let g = 0; g < G; g++) {
    groups.push([
      initialStrands[4 * g + 1]!.color,
      initialStrands[4 * g]!.color,
      initialStrands[4 * g + 3]!.color,
      initialStrands[4 * g + 2]!.color,
    ]);
  }

  const W = S / 2;
  const pattern: string[][] = [];
  for (let i = 0; i < numRows; i++) {
    const row: string[] = [];
    for (let j = 0; j < W; j++) {
      const g = ((j + Math.floor(i / 2)) % G + G) % G;
      const k = (((i - Math.floor((j + i / 2) / G)) % 4) + 4) % 4;
      row.push(groups[g]![k]!);
    }
    pattern.push(row);
  }
  return pattern;
}
