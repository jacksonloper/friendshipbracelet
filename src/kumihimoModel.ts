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

export type Selector =
  | { kind: 'specific_id'; strandId: number }
  | { kind: 'top' }
  | { kind: 'bottom' }
  | { kind: 'index'; index: number };

export interface ElementaryMove {
  source: number;
  target: number;
  selector?: Selector;
}

export interface CompoundMove {
  name?: string;
  moves: ElementaryMove[];
}

export interface KumihimoConfig {
  slotCount: number;
  strandCount: number;
  repeats: number;
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
    slotCount: 32,
    strandCount: 16,
    repeats: 8,
    centerScale: 1,
    twistScale: 0.25,
  };
}

export function createDefaultStrands(slotCount: number, strandCount: number): StrandSpec[] {
  const safeSlotCount = Math.max(4, slotCount);
  const safeStrandCount = Math.max(4, strandCount - (strandCount % 4));
  const groupSize = safeStrandCount / 4;
  const anchors = [0, safeSlotCount / 4, safeSlotCount / 2, (3 * safeSlotCount) / 4];
  const slots = anchors.flatMap(anchor => offsetsForGroup(anchor, groupSize, safeSlotCount));

  return Array.from({ length: safeStrandCount }, (_, index) => ({
    id: index,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    slot: normalizeSlot(slots[index] ?? index, safeSlotCount),
  }));
}

export function createDefaultCompoundMoves(slotCount: number): CompoundMove[] {
  const quarter = Math.floor(slotCount / 4);
  const half = Math.floor(slotCount / 2);
  const threeQuarter = Math.floor((slotCount * 3) / 4);
  const ringA = [
    normalizeSlot(quarter - 2, slotCount),
    normalizeSlot(half - 2, slotCount),
    normalizeSlot(threeQuarter - 2, slotCount),
    normalizeSlot(-2, slotCount),
  ];
  const ringB = [
    normalizeSlot(quarter - 1, slotCount),
    normalizeSlot(half - 1, slotCount),
    normalizeSlot(threeQuarter - 1, slotCount),
    normalizeSlot(-1, slotCount),
  ];
  const ringC = [
    normalizeSlot(0, slotCount),
    normalizeSlot(quarter, slotCount),
    normalizeSlot(half, slotCount),
    normalizeSlot(threeQuarter, slotCount),
  ];
  const ringD = [
    normalizeSlot(1, slotCount),
    normalizeSlot(quarter + 1, slotCount),
    normalizeSlot(half + 1, slotCount),
    normalizeSlot(threeQuarter + 1, slotCount),
  ];

  return [
    { name: 'Quadrant cycle A', moves: cycleMoves(ringA) },
    { name: 'Quadrant cycle B', moves: cycleMoves(ringB) },
    { name: 'Quadrant cycle C', moves: cycleMoves(ringC) },
    { name: 'Quadrant cycle D', moves: cycleMoves(ringD) },
  ];
}

export function compoundMovesToJSON(compounds: CompoundMove[]): string {
  return JSON.stringify(compounds, null, 2);
}

export function parseCompoundMoves(input: string, slotCount: number): { compounds: CompoundMove[]; errors: string[] } {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) {
      return { compounds: [], errors: ['Move pattern must be a JSON array of compound moves.'] };
    }

    const errors: string[] = [];
    const compounds: CompoundMove[] = parsed.map((compound, compoundIndex) => {
      if (!compound || typeof compound !== 'object' || !Array.isArray((compound as { moves?: unknown }).moves)) {
        errors.push(`Compound ${compoundIndex + 1} must have a moves array.`);
        return { name: `Compound ${compoundIndex + 1}`, moves: [] };
      }

      const record = compound as { name?: unknown; moves: unknown[] };
      const moves = record.moves.map((move, moveIndex) => {
        if (!move || typeof move !== 'object') {
          errors.push(`Compound ${compoundIndex + 1}, move ${moveIndex + 1} is invalid.`);
          return { source: 0, target: 0 };
        }
        const raw = move as { source?: unknown; target?: unknown; selector?: unknown };
        if (!Number.isInteger(raw.source) || !Number.isInteger(raw.target)) {
          errors.push(`Compound ${compoundIndex + 1}, move ${moveIndex + 1} needs integer source and target slots.`);
          return { source: 0, target: 0 };
        }
        const selector = normalizeSelector(raw.selector, compoundIndex, moveIndex, errors);
        return {
          source: normalizeSlot(raw.source as number, slotCount),
          target: normalizeSlot(raw.target as number, slotCount),
          ...(selector ? { selector } : {}),
        };
      });

      return {
        name: typeof record.name === 'string' && record.name.trim() ? record.name : `Compound ${compoundIndex + 1}`,
        moves,
      };
    });

    return { compounds, errors };
  } catch {
    return { compounds: [], errors: ['Move pattern JSON could not be parsed.'] };
  }
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
  const periodCenter = { x: 0, y: 0 };
  let periodTwist = 0;

  for (let repeat = 0; repeat < config.repeats; repeat++) {
    for (let compoundIndex = 0; compoundIndex < compounds.length; compoundIndex++) {
      const compound = compounds[compoundIndex];
      const records: ElementaryRecord[] = [];

      for (let moveIndex = 0; moveIndex < compound.moves.length; moveIndex++) {
        const move = compound.moves[moveIndex];
        const source = normalizeSlot(move.source, slotCount);
        const target = normalizeSlot(move.target, slotCount);
        const sourceSlot = slots[source];
        const strandId = selectStrandId(sourceSlot, move.selector);

        if (strandId === null) {
          errors.push(`Compound ${compoundIndex + 1}, move ${moveIndex + 1}: no strand available in slot ${source}.`);
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
            }),
            errors,
            executedCompounds: step,
          });
        }

        removeStrand(slots[source], strandId);
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

      if (repeat === 0) {
        periodCenter.x += compoundCenter.x;
        periodCenter.y += compoundCenter.y;
        periodTwist += compoundTwist;
      }

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
        createSnapshot(step, compoundIndex, compound.name ?? `Compound ${compoundIndex + 1}`, slots, center, twist),
      );
    }
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
    }),
    errors,
    executedCompounds: step,
  });
}

function offsetsForGroup(anchor: number, groupSize: number, slotCount: number): number[] {
  const startOffset = -Math.floor(groupSize / 2);
  return Array.from({ length: groupSize }, (_, offset) => normalizeSlot(anchor + startOffset + offset, slotCount));
}

function cycleMoves(slots: number[]): ElementaryMove[] {
  return slots.map((source, index) => ({
    source,
    target: slots[(index + 1) % slots.length],
    selector: { kind: 'top' },
  }));
}

function normalizeSelector(
  rawSelector: unknown,
  compoundIndex: number,
  moveIndex: number,
  errors: string[],
): Selector | undefined {
  if (!rawSelector || typeof rawSelector !== 'object') return undefined;
  const selector = rawSelector as { kind?: unknown; strandId?: unknown; index?: unknown };
  if (selector.kind === 'top' || selector.kind === 'bottom') {
    return { kind: selector.kind };
  }
  if (selector.kind === 'specific_id' && Number.isInteger(selector.strandId)) {
    return { kind: 'specific_id', strandId: selector.strandId as number };
  }
  if (selector.kind === 'index' && Number.isInteger(selector.index)) {
    return { kind: 'index', index: selector.index as number };
  }
  errors.push(`Compound ${compoundIndex + 1}, move ${moveIndex + 1}: selector is invalid.`);
  return undefined;
}

function normalizeSlot(slot: number, slotCount: number): number {
  return ((Math.round(slot) % slotCount) + slotCount) % slotCount;
}

function slotVector(slot: number, slotCount: number): Vector2 {
  const angle = (2 * Math.PI * normalizeSlot(slot, slotCount)) / slotCount;
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
  return wrapAngle(baseAngle + 2 * Math.PI * twist);
}

function angularDifference(source: number, target: number, slotCount: number): number {
  const sourceAngle = (2 * Math.PI * source) / slotCount;
  const targetAngle = (2 * Math.PI * target) / slotCount;
  return wrapSignedAngle(targetAngle - sourceAngle);
}

function wrapAngle(angle: number): number {
  const fullTurn = 2 * Math.PI;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function wrapSignedAngle(angle: number): number {
  const fullTurn = 2 * Math.PI;
  let wrapped = ((angle + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
  if (wrapped <= -Math.PI) wrapped += fullTurn;
  return wrapped;
}

function selectStrandId(slot: SlotState, selector?: Selector): number | null {
  if (slot.strands.length === 0) return null;
  if (!selector || selector.kind === 'top') return slot.strands[slot.strands.length - 1] ?? null;
  if (selector.kind === 'bottom') return slot.strands[0] ?? null;
  if (selector.kind === 'specific_id') {
    return slot.strands.includes(selector.strandId) ? selector.strandId : null;
  }
  if (selector.kind === 'index') {
    return slot.strands[selector.index] ?? null;
  }
  return null;
}

function removeStrand(slot: SlotState, strandId: number): void {
  const index = slot.strands.indexOf(strandId);
  if (index >= 0) {
    slot.strands.splice(index, 1);
  }
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
  const averageMoves = strands.size === 0
    ? 0
    : Array.from(strands.values()).reduce((sum, strand) => sum + strand.moveCount, 0) / strands.size;
  const overused = Array.from(strands.values())
    .filter(strand => strand.moveCount > averageMoves * OVERUSE_THRESHOLD && strand.moveCount > 0)
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
