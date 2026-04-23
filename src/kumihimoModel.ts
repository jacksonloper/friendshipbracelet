export type BraidDirection = 'Z' | 'S';
export type TransitionDirection = 'ZS' | 'SZ';

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
  step: number;
  move: BraidDirection | null;
  transition: TransitionDirection | null;
  slots: StrandSpec[];
  pairs: KongoPair[];
}

export interface KongoSimulationResult {
  snapshots: KongoSnapshot[];
  finalSlots: StrandSpec[];
  transitionCount: number;
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

export function normalizeStrandCount(count: number): number {
  if (!Number.isFinite(count)) return 8;
  const clamped = Math.max(4, Math.round(count));
  const remainder = clamped % 4;
  return remainder === 0 ? clamped : clamped + (4 - remainder);
}

export function createDefaultStrands(count: number): StrandSpec[] {
  const strandCount = normalizeStrandCount(count);
  return Array.from({ length: strandCount }, (_, index) => ({
    id: index + 1,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));
}

export function resizeStrands(previous: StrandSpec[], count: number): StrandSpec[] {
  const strandCount = normalizeStrandCount(count);
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
      errors.push(`Unsupported character "${input[index]}" at position ${index + 1}. Use only Z and S.`);
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
  const snapshots: KongoSnapshot[] = [createSnapshot(0, null, null, startingSlots)];

  if (errors.length > 0) {
    return {
      snapshots,
      finalSlots: startingSlots,
      transitionCount: 0,
      errors,
    };
  }

  const strandCount = strands.length;
  const zPerm = zUnitPerm(strandCount);
  const sPerm = sUnitPerm(strandCount);
  const switchStep = switchPerm(strandCount);

  let slots = startingSlots;
  let previousMove: BraidDirection | null = null;
  let transitionCount = 0;

  sequence.forEach((move, index) => {
    let transition: TransitionDirection | null = null;

    if (previousMove && previousMove !== move) {
      slots = applyPerm(slots, switchStep);
      transition = previousMove === 'Z' ? 'ZS' : 'SZ';
      transitionCount += 1;
    }

    slots = applyPerm(slots, move === 'Z' ? zPerm : sPerm);
    snapshots.push(createSnapshot(index + 1, move, transition, slots));
    previousMove = move;
  });

  return {
    snapshots,
    finalSlots: slots,
    transitionCount,
    errors: [],
  };
}

function validateStrands(strands: StrandSpec[]): string[] {
  if (strands.length === 0 || strands.length % 4 !== 0) {
    return ['The number of strands must be positive and divisible by 4.'];
  }

  return [];
}

function createSnapshot(
  step: number,
  move: BraidDirection | null,
  transition: TransitionDirection | null,
  slots: StrandSpec[],
): KongoSnapshot {
  return {
    step,
    move,
    transition,
    slots: slots.slice(),
    pairs: createPairs(slots),
  };
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

  return perm.map(sourceIndex => items[sourceIndex] as T);
}

function zUnitPerm(strandCount: number): number[] {
  if (strandCount % 4 !== 0) {
    throw new Error('strandCount must be divisible by 4.');
  }

  const slots = Array.from({ length: strandCount }, (_, index) => index);
  const topRight = slots.splice(1, 1)[0];
  slots.splice(strandCount / 2 + 1, 0, topRight);

  const bottomLeft = slots.splice(strandCount / 2 - 1, 1)[0];
  slots.splice(0, 0, bottomLeft);

  const quarterTurn = strandCount / 4;
  return slots.slice(quarterTurn).concat(slots.slice(0, quarterTurn));
}

function sUnitPerm(strandCount: number): number[] {
  if (strandCount % 4 !== 0) {
    throw new Error('strandCount must be divisible by 4.');
  }

  const slots = Array.from({ length: strandCount }, (_, index) => index);
  const topLeft = slots.splice(0, 1)[0];
  slots.splice(strandCount / 2, 0, topLeft);

  const bottomRight = slots.splice(strandCount / 2 + 1, 1)[0];
  slots.splice(1, 0, bottomRight);

  const quarterTurn = strandCount / 4;
  return slots.slice(quarterTurn).concat(slots.slice(0, quarterTurn));
}

function switchPerm(strandCount: number): number[] {
  if (strandCount % 2 !== 0) {
    throw new Error('strandCount must be even.');
  }

  const perm = Array.from({ length: strandCount }, (_, index) => index);
  for (let index = 0; index < strandCount; index += 2) {
    [perm[index], perm[index + 1]] = [perm[index + 1] as number, perm[index] as number];
  }
  return perm;
}
