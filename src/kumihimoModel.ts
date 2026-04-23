export type BraidDirection = 'Z' | 'S';

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

export interface KongoActionParticipant {
  role: 'leftUp' | 'rightUp' | 'leftDown' | 'rightDown';
  strand: StrandSpec;
  slot: number;
  moves: boolean;
  targetLabel: string;
}

export interface KongoStepAction {
  direction: BraidDirection;
  participants: KongoActionParticipant[];
  topPairIndex: number;
  bottomPairIndex: number;
  rotationSlots: number;
}

export interface KongoSnapshot {
  step: number;
  move: BraidDirection | null;
  slots: StrandSpec[];
  pairs: KongoPair[];
  action: KongoStepAction | null;
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
  const snapshots: KongoSnapshot[] = [createSnapshot(0, null, startingSlots, null)];

  if (errors.length > 0) {
    return {
      snapshots,
      finalSlots: startingSlots,
      errors,
    };
  }

  const strandCount = strands.length;
  const zPerm = zUnitPerm(strandCount);
  const sPerm = sUnitPerm(strandCount);
  let slots = startingSlots;

  sequence.forEach((move, index) => {
    const action = createAction(move, slots);
    slots = applyPerm(slots, move === 'Z' ? zPerm : sPerm);
    snapshots.push(createSnapshot(index + 1, move, slots, action));
  });

  return {
    snapshots,
    finalSlots: slots,
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
  slots: StrandSpec[],
  action: KongoStepAction | null,
): KongoSnapshot {
  return {
    step,
    move,
    slots: slots.slice(),
    pairs: createPairs(slots),
    action,
  };
}

function createAction(direction: BraidDirection, slots: StrandSpec[]): KongoStepAction {
  const half = Math.floor(slots.length / 2);
  const quarter = Math.floor(slots.length / 4);
  const leftUp = slots[0];
  const rightUp = slots[1];
  const leftDown = slots[half];
  const rightDown = slots[half + 1];

  if (!leftUp || !rightUp || !leftDown || !rightDown) {
    throw new Error('Unable to build a four-strand action from the current slots.');
  }

  return {
    direction,
    topPairIndex: 0,
    bottomPairIndex: half / 2,
    rotationSlots: quarter,
    participants: [
      {
        role: 'leftUp',
        strand: leftUp,
        slot: 0,
        moves: direction === 'S',
        targetLabel: direction === 'S' ? 'left of left down' : 'stays in the active group',
      },
      {
        role: 'rightUp',
        strand: rightUp,
        slot: 1,
        moves: direction === 'Z',
        targetLabel: direction === 'Z' ? 'right of right down' : 'stays in the active group',
      },
      {
        role: 'leftDown',
        strand: leftDown,
        slot: half,
        moves: direction === 'Z',
        targetLabel: direction === 'Z' ? 'left of left up' : 'stays in the active group',
      },
      {
        role: 'rightDown',
        strand: rightDown,
        slot: half + 1,
        moves: direction === 'S',
        targetLabel: direction === 'S' ? 'right of right up' : 'stays in the active group',
      },
    ],
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

  perm.forEach(sourceIndex => {
    if (sourceIndex < 0 || sourceIndex >= items.length) {
      throw new Error(`Permutation index ${sourceIndex} is out of bounds.`);
    }
  });

  return perm.map(sourceIndex => items[sourceIndex] as T);
}

function zUnitPerm(strandCount: number): number[] {
  if (strandCount % 4 !== 0) {
    throw new Error('strandCount must be divisible by 4.');
  }

  const half = Math.floor(strandCount / 2);
  const quarterTurn = Math.floor(strandCount / 4);
  const slots = Array.from({ length: strandCount }, (_, index) => index);
  const topRight = popAt(slots, 1, 'right-up');
  slots.splice(half + 1, 0, topRight);

  const bottomLeft = popAt(slots, half - 1, 'left-down');
  slots.splice(0, 0, bottomLeft);

  return rotateLeft(slots, quarterTurn);
}

function sUnitPerm(strandCount: number): number[] {
  if (strandCount % 4 !== 0) {
    throw new Error('strandCount must be divisible by 4.');
  }

  const half = Math.floor(strandCount / 2);
  const quarterTurn = Math.floor(strandCount / 4);
  const slots = Array.from({ length: strandCount }, (_, index) => index);
  const topLeft = popAt(slots, 0, 'left-up');
  slots.splice(half, 0, topLeft);

  const bottomRight = popAt(slots, half + 1, 'right-down');
  slots.splice(1, 0, bottomRight);

  return rotateLeft(slots, quarterTurn);
}

function rotateLeft(items: number[], amount: number): number[] {
  return items.slice(amount).concat(items.slice(0, amount));
}

function popAt(slots: number[], index: number, label: string): number {
  const value = slots.splice(index, 1)[0];
  if (value === undefined) {
    throw new Error(`Unable to remove the ${label} strand at slot index ${index}.`);
  }
  return value;
}
