export interface Vector2 {
  x: number;
  y: number;
}

export interface StrandSpec {
  id: number;
  color: string;
  slot: number;
}

export interface StrandHistoryEntry {
  step: number;
  slot: number;
  compoundIndex: number;
  moveIndex: number;
}

export interface Strand {
  id: number;
  color: string;
  slot: number;
  moveCount: number;
  history: StrandHistoryEntry[];
}

export interface SlotState {
  slotIndex: number;
  strands: number[];
}

export interface ElementaryMove {
  source: number;
  target: number;
}

export interface CompoundMove {
  name: string;
  moves: ElementaryMove[];
}

export interface SequenceItem {
  name: string;
  offset: number;
}

export interface KumihimoConfig {
  slotCount: number;
  strandCount: number;
  centerScale: number;
  twistScale: number;
}

export interface ElementaryRecord {
  source: number;
  target: number;
  strandId: number;
  color: string;
  centerContribution: Vector2;
  direction: Vector2;
  distance: number;
}

export interface VisibleSegment {
  time: number;
  strandId: number;
  color: string;
  source: number;
  target: number;
  surfaceAngle: number;
  twist: number;
  center: Vector2;
  exposure: number;
}

export interface StepSnapshot {
  step: number;
  compoundIndex: number | null;
  compoundName: string;
  slots: SlotState[];
  occupancy: number[];
  center: Vector2;
  twist: number;
}

export interface KumihimoDiagnostics {
  slotDelta: number[];
  sectorDelta: Record<'N' | 'E' | 'S' | 'W', number>;
  slotBalanced: boolean;
  sectorBalanced: boolean;
  maxTemporaryImbalance: number;
  timeToRebalance: number | null;
  periodCenterDrift: Vector2;
  periodCenterDriftMagnitude: number;
  maxCenterRadius: number;
  periodTwist: number;
  averageTwistPerCompound: number;
  residualTwistMax: number;
  maxWaitingTime: number;
  averageWaitingTime: number;
  neverMoved: number[];
  overused: number[];
  moveDistanceHistogram: Record<string, number>;
  shortestMove: number | null;
  longestMove: number | null;
  averageFloatRisk: number;
  colorHistogram: Record<string, number>;
}

export interface KumihimoSimulationResult {
  snapshots: StepSnapshot[];
  visibleSegments: VisibleSegment[];
  centerHistory: Vector2[];
  twistHistory: number[];
  diagnostics: KumihimoDiagnostics;
  errors: string[];
  executedCompounds: number;
}

const FULL_TURN = 2 * Math.PI;
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
const OVERUSE_THRESHOLD = 1.5;

const EMPTY_DIAGNOSTICS: KumihimoDiagnostics = {
  slotDelta: [],
  sectorDelta: { N: 0, E: 0, S: 0, W: 0 },
  slotBalanced: true,
  sectorBalanced: true,
  maxTemporaryImbalance: 0,
  timeToRebalance: null,
  periodCenterDrift: { x: 0, y: 0 },
  periodCenterDriftMagnitude: 0,
  maxCenterRadius: 0,
  periodTwist: 0,
  averageTwistPerCompound: 0,
  residualTwistMax: 0,
  maxWaitingTime: 0,
  averageWaitingTime: 0,
  neverMoved: [],
  overused: [],
  moveDistanceHistogram: {},
  shortestMove: null,
  longestMove: null,
  averageFloatRisk: 0,
  colorHistogram: {},
};

export function createDefaultKumihimoConfig(): KumihimoConfig {
  return {
    slotCount: 16,
    strandCount: 8,
    centerScale: 1,
    twistScale: 0.25,
  };
}

export function createDefaultStrands(slotCount: number, strandCount: number): StrandSpec[] {
  const normalizedSlotCount = Math.max(4, slotCount);
  const normalizedStrandCount = Math.max(4, strandCount - (strandCount % 4));
  const groupSize = normalizedStrandCount / 4;
  const anchors = [0, normalizedSlotCount / 4, normalizedSlotCount / 2, (3 * normalizedSlotCount) / 4];
  const slots = anchors.flatMap(anchor => offsetsForGroup(anchor, groupSize, normalizedSlotCount));

  return Array.from({ length: normalizedStrandCount }, (_, index) => ({
    id: index,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    slot: normalizeSlot(slots[index] ?? index, normalizedSlotCount),
  }));
}

export function createDefaultDefinitionsText(): string {
  return 'A: 0 3, 2 5, 4 7, 6 9, 8 11, 10 13, 12 15, 14 1';
}

export function createDefaultSequenceText(): string {
  return 'A, A[1], A, A[1], A, A[1], A, A[1]';
}

// Place strands at every other slot (even indices), leaving odd slots empty for moves.
function createEvenSlotStrands(slotCount: number, strandCount: number): StrandSpec[] {
  return createDefaultStrands(slotCount, strandCount).map((strand, i) => ({ ...strand, slot: i * 2 }));
}

export function createEdoYatsuGumiPreset(): {
  config: KumihimoConfig;
  strands: StrandSpec[];
  definitionsText: string;
  sequenceText: string;
} {
  const config: KumihimoConfig = { slotCount: 16, strandCount: 8, centerScale: 1, twistScale: 0.25 };
  const strands = createEvenSlotStrands(16, 8);
  const definitionsText = 'A: 0 3, 2 5, 4 7, 6 9, 8 11, 10 13, 12 15, 14 1';
  const sequenceText = 'A, A[1], A, A[1], A, A[1], A, A[1]';
  return { config, strands, definitionsText, sequenceText };
}

export function createKongoKumiPreset(): {
  config: KumihimoConfig;
  strands: StrandSpec[];
  definitionsText: string;
  sequenceText: string;
} {
  const config: KumihimoConfig = { slotCount: 32, strandCount: 16, centerScale: 1, twistScale: 0.25 };
  const strands = createEvenSlotStrands(32, 16);
  const definitionsText = [
    'A: 0 5, 4 9, 8 13, 12 17, 16 21, 20 25, 24 29, 28 1',
    'B: 5 8, 9 12, 13 16, 17 20, 21 24, 25 28, 29 0, 1 4',
  ].join('\n');
  const sequenceText = 'A, A[2], B, B[2], A, A[2], B, B[2], A, A[2], B, B[2], A, A[2], B, B[2]';
  return { config, strands, definitionsText, sequenceText };
}

export function parseDefinitions(
  text: string,
  slotCount: number,
): { definitions: Record<string, ElementaryMove[]>; errors: string[] } {
  const errors: string[] = [];
  const definitions: Record<string, ElementaryMove[]> = {};

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex < 0) {
      errors.push(`Invalid definition line (missing ":"): ${trimmed}`);
      continue;
    }

    const name = trimmed.slice(0, colonIndex).trim();
    if (!name || !/^\w+$/.test(name)) {
      errors.push(`Invalid compound name: "${name}"`);
      continue;
    }

    const movesStr = trimmed.slice(colonIndex + 1).trim();
    const moves: ElementaryMove[] = [];

    for (const moveStr of movesStr.split(',')) {
      const parts = moveStr.trim().split(/\s+/);
      if (parts.length !== 2) {
        errors.push(`Compound "${name}": invalid move "${moveStr.trim()}" — expected "source target"`);
        continue;
      }
      const source = parseInt(parts[0], 10);
      const target = parseInt(parts[1], 10);
      if (!Number.isInteger(source) || !Number.isInteger(target)) {
        errors.push(`Compound "${name}": non-integer slot in "${moveStr.trim()}"`);
        continue;
      }
      moves.push({ source: normalizeSlot(source, slotCount), target: normalizeSlot(target, slotCount) });
    }

    if (name in definitions) {
      errors.push(`Duplicate compound name: "${name}"`);
    } else {
      definitions[name] = moves;
    }
  }

  return { definitions, errors };
}

export function parseSequence(text: string): { sequence: SequenceItem[]; errors: string[] } {
  const errors: string[] = [];
  const sequence: SequenceItem[] = [];

  for (const item of text.split(',')) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (!match) {
      errors.push(`Invalid sequence item: "${trimmed}"`);
      continue;
    }

    const name = match[1];
    const offset = match[2] !== undefined ? parseInt(match[2], 10) : 0;
    sequence.push({ name, offset });
  }

  return { sequence, errors };
}

export function resolveCompounds(
  sequence: SequenceItem[],
  definitions: Record<string, ElementaryMove[]>,
  slotCount: number,
): { compounds: CompoundMove[]; errors: string[] } {
  const errors: string[] = [];
  const compounds: CompoundMove[] = [];

  for (const item of sequence) {
    const baseMoves = definitions[item.name];
    if (!baseMoves) {
      errors.push(`Undefined compound: "${item.name}"`);
      continue;
    }

    const moves = baseMoves.map(move => ({
      source: normalizeSlot(move.source + item.offset, slotCount),
      target: normalizeSlot(move.target + item.offset, slotCount),
    }));

    const displayName = item.offset === 0 ? item.name : `${item.name}[${item.offset}]`;
    compounds.push({ name: displayName, moves });
  }

  return { compounds, errors };
}

export function definitionsToText(definitions: Record<string, ElementaryMove[]>): string {
  return Object.entries(definitions)
    .map(([name, moves]) => `${name}: ${moves.map(m => `${m.source} ${m.target}`).join(', ')}`)
    .join('\n');
}

export function sequenceToText(sequence: SequenceItem[]): string {
  return sequence
    .map(item => (item.offset === 0 ? item.name : `${item.name}[${item.offset}]`))
    .join(', ');
}

export function resizeStrands(existing: StrandSpec[], strandCount: number, slotCount: number): StrandSpec[] {
  const normalizedCount = Math.max(4, strandCount - (strandCount % 4));
  const defaults = createDefaultStrands(slotCount, normalizedCount);
  return Array.from({ length: normalizedCount }, (_, index) => ({
    id: index,
    color: existing[index]?.color ?? defaults[index].color,
    slot: normalizeSlot(existing[index]?.slot ?? defaults[index].slot, slotCount),
  }));
}

export function simulateKumihimo(
  config: KumihimoConfig,
  strandSpecs: StrandSpec[],
  compounds: CompoundMove[],
): KumihimoSimulationResult {
  const slotCount = Math.max(4, config.slotCount);
  const strands = new Map<number, Strand>();
  const slots = Array.from({ length: slotCount }, (_, slotIndex) => ({ slotIndex, strands: [] as number[] }));
  const errors: string[] = [];

  for (const spec of strandSpecs) {
    const slot = normalizeSlot(spec.slot, slotCount);
    if (slots[slot].strands.length > 0) {
      errors.push(`Strand ${spec.id} cannot start in slot ${slot}: already occupied.`);
      return finalizeResult({
        snapshots: [createSnapshot(0, null, 'Initial layout', slots, { x: 0, y: 0 }, 0)],
        visibleSegments: [],
        centerHistory: [{ x: 0, y: 0 }],
        twistHistory: [0],
        diagnostics: { ...EMPTY_DIAGNOSTICS },
        errors,
        executedCompounds: 0,
      });
    }
    const strand: Strand = {
      id: spec.id,
      color: spec.color,
      slot,
      moveCount: 0,
      history: [{ step: 0, slot, compoundIndex: -1, moveIndex: -1 }],
    };
    strands.set(spec.id, strand);
    slots[slot].strands.push(spec.id);
  }

  const snapshots: StepSnapshot[] = [
    createSnapshot(0, null, 'Initial layout', slots, { x: 0, y: 0 }, 0),
  ];
  const centerHistory: Vector2[] = [{ x: 0, y: 0 }];
  const twistHistory: number[] = [0];
  const visibleSegments: VisibleSegment[] = [];
  const movementTimes = new Map<number, number[]>(Array.from(strands.keys(), id => [id, []]));
  const initialOccupancy = occupancyVector(slots);
  const initialSectorOccupancy = sectorOccupancy(initialOccupancy, slotCount);

  let center = { x: 0, y: 0 };
  let twist = 0;
  let step = 0;
  let maxTemporaryImbalance = 0;
  let timeToRebalance: number | null = null;
  const allDistances: number[] = [];
  const floatRiskValues: number[] = [];

  for (let compoundIndex = 0; compoundIndex < compounds.length; compoundIndex++) {
    const compound = compounds[compoundIndex];
    const records: ElementaryRecord[] = [];

    for (let moveIndex = 0; moveIndex < compound.moves.length; moveIndex++) {
      const move = compound.moves[moveIndex];
      const source = normalizeSlot(move.source, slotCount);
      const target = normalizeSlot(move.target, slotCount);
      const sourceSlot = slots[source];
      const strandId = sourceSlot.strands[0] ?? null;

      if (strandId === null) {
        errors.push(`"${compound.name}", move ${moveIndex + 1}: slot ${source} is empty.`);
        return finalizeResult({
          snapshots,
          visibleSegments,
          centerHistory,
          twistHistory,
          diagnostics: buildDiagnostics({
            slots,
            slotCount,
            initialOccupancy,
            initialSectorOccupancy,
            centerHistory,
            twistHistory,
            periodCenter: { ...center },
            periodTwist: twist,
            movementTimes,
            strands,
            allDistances,
            floatRiskValues,
            timeToRebalance,
            maxTemporaryImbalance,
            visibleSegments,
            compounds,
          }),
          errors,
          executedCompounds: step,
        });
      }

      if (slots[target].strands.length > 0) {
        errors.push(`"${compound.name}", move ${moveIndex + 1}: target slot ${target} is already occupied.`);
        return finalizeResult({
          snapshots,
          visibleSegments,
          centerHistory,
          twistHistory,
          diagnostics: buildDiagnostics({
            slots,
            slotCount,
            initialOccupancy,
            initialSectorOccupancy,
            centerHistory,
            twistHistory,
            periodCenter: { ...center },
            periodTwist: twist,
            movementTimes,
            strands,
            allDistances,
            floatRiskValues,
            timeToRebalance,
            maxTemporaryImbalance,
            visibleSegments,
            compounds,
          }),
          errors,
          executedCompounds: step,
        });
      }

      slots[source].strands = [];
      slots[target].strands.push(strandId);

      const strand = strands.get(strandId);
      if (!strand) continue;

      strand.slot = target;
      strand.moveCount += 1;
      strand.history.push({ step: step + 1, slot: target, compoundIndex, moveIndex });
      movementTimes.get(strandId)?.push(step + 1);

      const centerContribution = centerContributionForMove(source, target, slotCount, config.centerScale);
      const direction = subtractVectors(slotVector(target, slotCount), slotVector(source, slotCount));
      const distance = circularDistance(source, target, slotCount);
      records.push({
        source,
        target,
        strandId,
        color: strand.color,
        centerContribution,
        direction,
        distance,
      });
      allDistances.push(distance);
      floatRiskValues.push(Math.abs(distance - slotCount / 2));
    }

    const compoundCenter = records.reduce(
      (acc, record) => addVectors(acc, record.centerContribution),
      { x: 0, y: 0 },
    );
    const compoundTwist = twistContribution(records, slotCount, config.twistScale);

    center = addVectors(center, compoundCenter);
    twist += compoundTwist;
    step += 1;

    for (const record of records) {
      visibleSegments.push({
        time: step,
        strandId: record.strandId,
        color: record.color,
        source: record.source,
        target: record.target,
        surfaceAngle: visibleAngle(record.source, record.target, twist, slotCount),
        twist,
        center: { ...center },
        exposure: 1,
      });
    }

    centerHistory.push({ ...center });
    twistHistory.push(twist);
    const occupancy = occupancyVector(slots);
    const imbalance = l1Distance(occupancy, initialOccupancy);
    maxTemporaryImbalance = Math.max(maxTemporaryImbalance, imbalance);
    if (timeToRebalance === null && occupancy.every((value, index) => value === initialOccupancy[index])) {
      timeToRebalance = step;
    }

    snapshots.push(
      createSnapshot(step, compoundIndex, compound.name, slots, center, twist),
    );
  }

  return finalizeResult({
    snapshots,
    visibleSegments,
    centerHistory,
    twistHistory,
    diagnostics: buildDiagnostics({
      slots,
      slotCount,
      initialOccupancy,
      initialSectorOccupancy,
      centerHistory,
      twistHistory,
      periodCenter: { ...center },
      periodTwist: twist,
      movementTimes,
      strands,
      allDistances,
      floatRiskValues,
      timeToRebalance,
      maxTemporaryImbalance,
      visibleSegments,
      compounds,
    }),
    errors,
    executedCompounds: step,
  });
}

function offsetsForGroup(anchor: number, groupSize: number, slotCount: number): number[] {
  const startOffset = -Math.floor(groupSize / 2);
  return Array.from({ length: groupSize }, (_, offset) => normalizeSlot(anchor + startOffset + offset, slotCount));
}

function normalizeSlot(slot: number, slotCount: number): number {
  return ((Math.round(slot) % slotCount) + slotCount) % slotCount;
}

function slotVector(slot: number, slotCount: number): Vector2 {
  const angle = (FULL_TURN * normalizeSlot(slot, slotCount)) / slotCount;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function centerContributionForMove(source: number, target: number, slotCount: number, scale: number): Vector2 {
  const start = slotVector(source, slotCount);
  const end = slotVector(target, slotCount);
  return {
    x: scale * (start.x + end.x) / 2,
    y: scale * (start.y + end.y) / 2,
  };
}

function twistContribution(records: ElementaryRecord[], slotCount: number, twistScale: number): number {
  if (records.length === 0) return 0;
  if (records.length === 1) {
    return twistScale * angularDifference(records[0].source, records[0].target, slotCount) / (2 * Math.PI);
  }

  let sum = 0;
  let pairCount = 0;
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const cross = crossProduct(records[i].direction, records[j].direction);
      sum += Math.sign(cross);
      pairCount += 1;
    }
  }
  return pairCount === 0 ? 0 : twistScale * (sum / pairCount);
}

function visibleAngle(source: number, target: number, twist: number, slotCount: number): number {
  const midpoint = centerContributionForMove(source, target, slotCount, 1);
  const direction = subtractVectors(slotVector(target, slotCount), slotVector(source, slotCount));
  const baseAngle = Math.abs(midpoint.x) < 1e-9 && Math.abs(midpoint.y) < 1e-9
    ? Math.atan2(direction.y, direction.x)
    : Math.atan2(midpoint.y, midpoint.x);
  return wrapAngle(baseAngle + FULL_TURN * twist);
}

function angularDifference(source: number, target: number, slotCount: number): number {
  const sourceAngle = (FULL_TURN * source) / slotCount;
  const targetAngle = (FULL_TURN * target) / slotCount;
  return wrapSignedAngle(targetAngle - sourceAngle);
}

function wrapAngle(angle: number): number {
  return ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

function wrapSignedAngle(angle: number): number {
  let wrapped = ((angle + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
  if (wrapped <= -Math.PI) wrapped += FULL_TURN;
  return wrapped;
}

function createSnapshot(
  step: number,
  compoundIndex: number | null,
  compoundName: string,
  slots: SlotState[],
  center: Vector2,
  twist: number,
): StepSnapshot {
  return {
    step,
    compoundIndex,
    compoundName,
    slots: cloneSlots(slots),
    occupancy: occupancyVector(slots),
    center: { ...center },
    twist,
  };
}

function cloneSlots(slots: SlotState[]): SlotState[] {
  return slots.map(slot => ({
    slotIndex: slot.slotIndex,
    strands: [...slot.strands],
  }));
}

function occupancyVector(slots: SlotState[]): number[] {
  return slots.map(slot => slot.strands.length);
}

function sectorOccupancy(occupancy: number[], slotCount: number): Record<'N' | 'E' | 'S' | 'W', number> {
  const sectors: Record<'N' | 'E' | 'S' | 'W', number> = { N: 0, E: 0, S: 0, W: 0 };
  occupancy.forEach((count, slot) => {
    sectors[sectorForSlot(slot, slotCount)] += count;
  });
  return sectors;
}

function sectorForSlot(slot: number, slotCount: number): 'N' | 'E' | 'S' | 'W' {
  const normalized = normalizeSlot(slot, slotCount);
  const sectorIndex = Math.floor((normalized / slotCount) * 4) % 4;
  return ['N', 'E', 'S', 'W'][sectorIndex] as 'N' | 'E' | 'S' | 'W';
}

function circularDistance(source: number, target: number, slotCount: number): number {
  const diff = Math.abs(normalizeSlot(target - source, slotCount));
  return Math.min(diff, slotCount - diff);
}

function l1Distance(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + Math.abs(value - (right[index] ?? 0)), 0);
}

function buildDiagnostics(args: {
  slots: SlotState[];
  slotCount: number;
  initialOccupancy: number[];
  initialSectorOccupancy: Record<'N' | 'E' | 'S' | 'W', number>;
  centerHistory: Vector2[];
  twistHistory: number[];
  periodCenter: Vector2;
  periodTwist: number;
  movementTimes: Map<number, number[]>;
  strands: Map<number, Strand>;
  allDistances: number[];
  floatRiskValues: number[];
  timeToRebalance: number | null;
  maxTemporaryImbalance: number;
  visibleSegments: VisibleSegment[];
  compounds: CompoundMove[];
}): KumihimoDiagnostics {
  const {
    slots,
    slotCount,
    initialOccupancy,
    initialSectorOccupancy,
    centerHistory,
    twistHistory,
    periodCenter,
    periodTwist,
    movementTimes,
    strands,
    allDistances,
    floatRiskValues,
    timeToRebalance,
    maxTemporaryImbalance,
    visibleSegments,
    compounds,
  } = args;

  const finalOccupancy = occupancyVector(slots);
  const slotDelta = finalOccupancy.map((value, index) => value - initialOccupancy[index]);
  const finalSectorOccupancy = sectorOccupancy(finalOccupancy, slotCount);
  const sectorDelta = {
    N: finalSectorOccupancy.N - initialSectorOccupancy.N,
    E: finalSectorOccupancy.E - initialSectorOccupancy.E,
    S: finalSectorOccupancy.S - initialSectorOccupancy.S,
    W: finalSectorOccupancy.W - initialSectorOccupancy.W,
  };

  const maxCenterRadius = centerHistory.reduce(
    (max, point) => Math.max(max, Math.hypot(point.x, point.y)),
    0,
  );
  const compoundCount = Math.max(compounds.length, 1);
  const mu = periodTwist / compoundCount;
  const residualTwistMax = twistHistory.reduce(
    (max, twist, index) => Math.max(max, Math.abs(twist - mu * index)),
    0,
  );

  const waitingTimes = Array.from(movementTimes.values()).map(times => {
    if (times.length === 0) return 0;
    let maxGap = times[0];
    for (let index = 1; index < times.length; index++) {
      maxGap = Math.max(maxGap, times[index] - times[index - 1]);
    }
    return maxGap;
  });
  const averageMoveCount = strands.size === 0
    ? 0
    : Array.from(strands.values()).reduce((sum, strand) => sum + strand.moveCount, 0) / strands.size;
  const overused = Array.from(strands.values())
    .filter(strand => strand.moveCount > averageMoveCount * OVERUSE_THRESHOLD && strand.moveCount > 0)
    .map(strand => strand.id);
  const neverMoved = Array.from(strands.values())
    .filter(strand => strand.moveCount === 0)
    .map(strand => strand.id);

  const moveDistanceHistogram = allDistances.reduce<Record<string, number>>((histogram, distance) => {
    const key = String(distance);
    histogram[key] = (histogram[key] ?? 0) + 1;
    return histogram;
  }, {});
  const colorHistogram = visibleSegments.reduce<Record<string, number>>((histogram, segment) => {
    histogram[segment.color] = (histogram[segment.color] ?? 0) + 1;
    return histogram;
  }, {});

  return {
    slotDelta,
    sectorDelta,
    slotBalanced: slotDelta.every(value => value === 0),
    sectorBalanced: Object.values(sectorDelta).every(value => value === 0),
    maxTemporaryImbalance,
    timeToRebalance,
    periodCenterDrift: { ...periodCenter },
    periodCenterDriftMagnitude: Math.hypot(periodCenter.x, periodCenter.y),
    maxCenterRadius,
    periodTwist,
    averageTwistPerCompound: compoundCount === 0 ? 0 : periodTwist / compoundCount,
    residualTwistMax,
    maxWaitingTime: waitingTimes.length === 0 ? 0 : Math.max(...waitingTimes),
    averageWaitingTime: waitingTimes.length === 0 ? 0 : average(waitingTimes),
    neverMoved,
    overused,
    moveDistanceHistogram,
    shortestMove: allDistances.length === 0 ? null : Math.min(...allDistances),
    longestMove: allDistances.length === 0 ? null : Math.max(...allDistances),
    averageFloatRisk: floatRiskValues.length === 0 ? 0 : average(floatRiskValues),
    colorHistogram,
  };
}

function finalizeResult(result: KumihimoSimulationResult): KumihimoSimulationResult {
  return {
    ...result,
    diagnostics: {
      ...EMPTY_DIAGNOSTICS,
      ...result.diagnostics,
    },
  };
}

function addVectors(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

function subtractVectors(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x - right.x, y: left.y - right.y };
}

function crossProduct(left: Vector2, right: Vector2): number {
  return left.x * right.y - left.y * right.x;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
