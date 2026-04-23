import { useEffect, useMemo, useState } from 'react';
import {
  createDefaultKongoSequence,
  createDefaultStrands,
  ensureStrandCountDivisibleByFour,
  parseKongoSequence,
  resizeStrands,
  simulateKongo,
  type KongoSnapshot,
  type StrandSpec,
} from './kumihimoModel';

const DEFAULT_STRAND_COUNT = 8;
const DISK_SIZE = 360;
const RING_RADIUS = 130;
const MIN_SLOT_RADIUS = 9;
const MAX_SLOT_RADIUS = 16;
const SLOT_RADIUS_SCALE_FACTOR = 42;

export default function KumihimoPage() {
  const [strands, setStrands] = useState<StrandSpec[]>(() => createDefaultStrands(DEFAULT_STRAND_COUNT));
  const [sequenceText, setSequenceText] = useState(createDefaultKongoSequence);
  const [selectedStep, setSelectedStep] = useState(0);

  const parsedSequence = useMemo(() => parseKongoSequence(sequenceText), [sequenceText]);
  const simulation = useMemo(() => simulateKongo(strands, parsedSequence.sequence), [parsedSequence.sequence, strands]);
  const snapshot = simulation.snapshots[selectedStep] ?? simulation.snapshots[0];
  const previousSnapshot = simulation.snapshots[Math.max(selectedStep - 1, 0)] ?? simulation.snapshots[0];

  useEffect(() => {
    setSelectedStep(previous => Math.min(previous, simulation.snapshots.length - 1));
  }, [simulation.snapshots.length]);

  function handleStrandCountChange(value: number) {
    if (!Number.isFinite(value)) return;
    setStrands(previous => resizeStrands(previous, value));
    setSelectedStep(0);
  }

  function updateStrandColor(index: number, color: string) {
    setStrands(previous => previous.map((strand, strandIndex) => (
      strandIndex === index ? { ...strand, color } : strand
    )));
  }

  function resetDefaults() {
    setStrands(createDefaultStrands(DEFAULT_STRAND_COUNT));
    setSequenceText(createDefaultKongoSequence());
    setSelectedStep(0);
  }

  const finalSnapshot = simulation.snapshots[simulation.snapshots.length - 1] ?? simulation.snapshots[0];

  return (
    <div className="kumihimo-page">
      <div className="page-header">
        <div>
          <h1>Kongo Gumi Pattern Builder</h1>
          <p className="page-description">
            Each Z/S step is split into two sub-steps: the 4-strand cross (only slots 0, 1, 2n, 2n+1
            move), then a clockwise disk rotation by 2. Use the slider to step through each sub-step
            and watch the strands animate.
          </p>
        </div>
        <button type="button" onClick={resetDefaults}>Reset defaults</button>
      </div>

      <div className="kumihimo-grid">
        <section className="panel">
          <h2>Setup</h2>
          <div className="field-grid">
            <label>
              Strands (4n)
              <input
                type="number"
                min={4}
                step={4}
                value={strands.length}
                onChange={event => handleStrandCountChange(parseInt(event.target.value, 10))}
              />
            </label>
          </div>
          <label className="timeline-label">
            Sequence
            <textarea
              className="sequence-editor"
              value={sequenceText}
              onChange={event => {
                setSequenceText(event.target.value);
                setSelectedStep(0);
              }}
              spellCheck={false}
              aria-label="Kongo gumi Z and S sequence"
            />
          </label>
          <p className="note">
            Use only Z and S. Z cross: 0→1→2n→2n+1→0. S cross: 2n→1→0→2n+1→2n.
            Each cross is followed by a clockwise disk rotation by 2. A direction change inserts a pair-swap transition.
          </p>
          {parsedSequence.errors.length > 0 ? (
            <div className="error-list">
              {parsedSequence.errors.map(error => <div key={error}>{error}</div>)}
            </div>
          ) : null}
          {simulation.errors.length > 0 ? (
            <div className="error-list">
              {simulation.errors.map(error => <div key={error}>{error}</div>)}
            </div>
          ) : null}
          <div className="metric-grid">
            <Metric label="Strand count" value={String(ensureStrandCountDivisibleByFour(strands.length))} />
            <Metric label="Sequence steps" value={String(parsedSequence.sequence.length)} />
            <Metric label="Sub-steps" value={String(Math.max(simulation.snapshots.length - 1, 0))} />
            <Metric label="Final move" value={finalSnapshot.move ?? '—'} />
          </div>
        </section>

        <section className="panel">
          <h2>Starting strand colors</h2>
          <div className="strand-editor">
            {strands.map((strand, index) => (
              <div key={strand.id} className="strand-editor-row">
                <span>Slot {index}</span>
                <input
                  type="color"
                  value={strand.color}
                  onChange={event => updateStrandColor(index, event.target.value)}
                  aria-label={`Color for strand ${strand.id} in slot ${index}`}
                />
                <strong>#{strand.id}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="kumihimo-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Disk view</h2>
            <span className={`kongo-kind-badge kongo-kind-${snapshot.kind}`}>{formatStepLabel(snapshot)}</span>
          </div>
          <label className="timeline-label">
            Sub-step {snapshot.subStep} / {Math.max(simulation.snapshots.length - 1, 0)}
            <input
              type="range"
              min={0}
              max={Math.max(simulation.snapshots.length - 1, 0)}
              value={selectedStep}
              onChange={event => setSelectedStep(parseInt(event.target.value, 10))}
            />
          </label>
          <KongoDisk snapshot={snapshot} previousSnapshot={previousSnapshot} />
        </section>

        <section className="panel">
          <h2>Current sub-step</h2>
          <KongoSubStepCard snapshot={snapshot} previousSnapshot={previousSnapshot} />
        </section>
      </div>

      <div className="kumihimo-grid">
        <section className="panel">
          <h2>Timeline</h2>
          <PatternTimeline snapshots={simulation.snapshots} selectedStep={selectedStep} onSelectStep={setSelectedStep} />
        </section>

        <section className="panel">
          <h2>Final slot order</h2>
          <div className="kongo-slot-strip">
            {finalSnapshot.slots.map((strand, index) => (
              <div key={`${index}-${strand.id}`} className="kongo-slot-chip">
                <span className="kongo-swatch" style={{ backgroundColor: strand.color }} aria-hidden="true" />
                <span>Slot {index}</span>
                <strong>#{strand.id}</strong>
              </div>
            ))}
          </div>
          <div className="kongo-pair-list">
            {finalSnapshot.pairs.map(pair => (
              <div key={pair.pairIndex} className="kongo-final-pair">
                <span>Pair {pair.pairIndex + 1}</span>
                <span className="kongo-pair-stack">
                  <span className="kongo-pair-swatch" style={{ backgroundColor: pair.first.color }} aria-hidden="true" />
                  <span className="kongo-pair-swatch" style={{ backgroundColor: pair.second.color }} aria-hidden="true" />
                </span>
                <strong>{pair.slotA}/{pair.slotB}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KongoDisk({
  snapshot,
  previousSnapshot,
}: {
  snapshot: KongoSnapshot;
  previousSnapshot: KongoSnapshot;
}) {
  const scaledRadius = SLOT_RADIUS_SCALE_FACTOR - snapshot.slots.length;
  const slotRadius = Math.max(
    MIN_SLOT_RADIUS,
    Math.min(MAX_SLOT_RADIUS, scaledRadius),
  );
  const n = snapshot.slots.length;
  const half = n / 2;
  const slotPositions = Array.from({ length: n }, (_, index) => polar(index, n, RING_RADIUS));
  const activeSlotSet = new Set(snapshot.activeSlots);

  // Only the cross step highlights specific pairs; for the rest no pairs are highlighted.
  const activePairIndices = snapshot.kind === 'cross'
    ? new Set([0, half / 2])
    : new Set<number>();

  const previousSlotLookup = createSlotLookup(previousSnapshot);

  return (
    <svg width={DISK_SIZE} height={DISK_SIZE} viewBox={`0 0 ${DISK_SIZE} ${DISK_SIZE}`} className="kongo-disk">
      <circle cx={DISK_SIZE / 2} cy={DISK_SIZE / 2} r={RING_RADIUS + 22} fill="var(--bg-secondary)" stroke="var(--border)" />
      <circle cx={DISK_SIZE / 2} cy={DISK_SIZE / 2} r={56} fill="var(--bg)" stroke="var(--border)" />

      {/* Pair guide lines – connect the two slots that form each pair */}
      {snapshot.pairs.map(pair => {
        const first = slotPositions[pair.slotA];
        const second = slotPositions[pair.slotB];
        if (!first || !second) {
          return null;
        }
        const emphasized = activePairIndices.has(pair.pairIndex);
        return (
          <g key={`pair-guide-${pair.pairIndex}`}>
            <line
              x1={first.x}
              y1={first.y}
              x2={second.x}
              y2={second.y}
              className={`kongo-pair-guide${emphasized ? ' active' : ''}`}
            />
            <text
              x={(first.x + second.x) / 2}
              y={(first.y + second.y) / 2 - 12}
              textAnchor="middle"
              className="kongo-pair-index"
            >
              P{pair.pairIndex + 1}
            </text>
          </g>
        );
      })}

      {/* Slot rings – active slots get a highlighted border */}
      {slotPositions.map((position, index) => {
        const isActive = activeSlotSet.has(index);
        return (
          <g key={`slot-${index}`}>
            <circle
              cx={position.x}
              cy={position.y}
              r={slotRadius + (isActive ? 4 : 0)}
              fill="var(--bg)"
              stroke={isActive ? 'var(--accent)' : 'var(--border)'}
              strokeWidth={isActive ? 2 : 1}
            />
            <text x={position.x} y={position.y - slotRadius - 8} textAnchor="middle" className="kongo-slot-label">
              {index}
            </text>
          </g>
        );
      })}

      {/* Strand dots – CSS transition animates movement between steps */}
      {snapshot.slots.map((strand, index) => {
        const nextPosition = slotPositions[index];
        if (!nextPosition) {
          return null;
        }
        const previousIndex = previousSlotLookup.get(strand.id) ?? index;
        const previousPosition = slotPositions[previousIndex] ?? nextPosition;
        const relativeTrailX = previousPosition.x - nextPosition.x;
        const relativeTrailY = previousPosition.y - nextPosition.y;

        return (
          <g
            key={strand.id}
            className="kongo-strand-node"
            style={{
              transform: `translate(${nextPosition.x}px, ${nextPosition.y}px)`,
              transformOrigin: '0 0',
            }}
          >
            {snapshot.subStep > 0 && previousIndex !== index && (
              <line
                x1={relativeTrailX}
                y1={relativeTrailY}
                x2={0}
                y2={0}
                className="kongo-motion-trail"
              />
            )}
            <circle
              cx={0}
              cy={0}
              r={Math.max(slotRadius - 4, 5)}
              fill={strand.color}
              stroke="var(--fg)"
              strokeWidth={1}
            />
            <text x={0} y={4} textAnchor="middle" className="kongo-strand-label">
              {strand.id}
            </text>
          </g>
        );
      })}

      <text x={DISK_SIZE / 2} y={DISK_SIZE / 2 + 4} textAnchor="middle" className="kongo-center-label">
        {formatCenterLabel(snapshot)}
      </text>
    </svg>
  );
}

function formatCenterLabel(snapshot: KongoSnapshot): string {
  switch (snapshot.kind) {
    case 'start':
      return 'Start';
    case 'cross':
      return `${snapshot.move} cross`;
    case 'rotate':
      return 'Rotate ↻ 2';
    case 'transition':
      return `→ ${snapshot.move} transition`;
  }
}

function KongoSubStepCard({
  snapshot,
  previousSnapshot,
}: {
  snapshot: KongoSnapshot;
  previousSnapshot: KongoSnapshot;
}) {
  const half = snapshot.slots.length / 2;

  if (snapshot.kind === 'start') {
    return (
      <div className="kongo-action-card">
        <p className="kongo-action-summary">Starting configuration. Use the slider to step through.</p>
      </div>
    );
  }

  if (snapshot.kind === 'rotate') {
    return (
      <div className="kongo-action-card">
        <p className="kongo-action-summary">
          Disk rotates <strong>clockwise by 2</strong> positions.
          Every strand moves from slot <em>i</em> to slot <em>(i + 2) mod {snapshot.slots.length}</em>.
        </p>
      </div>
    );
  }

  if (snapshot.kind === 'transition') {
    return (
      <div className="kongo-action-card">
        <p className="kongo-action-summary">
          Direction changes to <strong>{snapshot.move}</strong>.
          Each adjacent pair swaps: 0↔1, 2↔3, 4↔5, …
        </p>
      </div>
    );
  }

  // cross
  const dir = snapshot.move!;
  const cycle = dir === 'Z'
    ? `0 → 1 → ${half} → ${half + 1} → 0`
    : `${half} → 1 → 0 → ${half + 1} → ${half}`;

  const prevLookup = createSlotLookup(previousSnapshot);

  return (
    <div className="kongo-action-card">
      <p className="kongo-action-summary">
        <strong>{dir} cross</strong> — 4-cycle: {cycle}
      </p>
      <div className="kongo-action-grid">
        {snapshot.activeSlots.map(destSlot => {
          const strand = snapshot.slots[destSlot];
          if (!strand) {
            return null;
          }
          const srcSlot = prevLookup.get(strand.id) ?? destSlot;
          const moved = srcSlot !== destSlot;
          return (
            <div key={destSlot} className={`kongo-action-participant${moved ? ' moving' : ''}`}>
              <span className="kongo-swatch" style={{ backgroundColor: strand.color }} aria-hidden="true" />
              <div>
                <strong>Slot {destSlot}</strong>
                <div>Strand #{strand.id}</div>
                {moved && <div className="kongo-action-move">← from slot {srcSlot}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatternTimeline({
  snapshots,
  selectedStep,
  onSelectStep,
}: {
  snapshots: KongoSnapshot[];
  selectedStep: number;
  onSelectStep: (step: number) => void;
}) {
  return (
    <div className="kongo-pattern-table">
      {snapshots.map(snapshot => (
        <button
          key={snapshot.subStep}
          type="button"
          className={`kongo-pattern-row-button${snapshot.subStep === selectedStep ? ' active' : ''}`}
          onClick={() => onSelectStep(snapshot.subStep)}
        >
          <div className="kongo-pattern-row">
            <div className={`kongo-step-label kongo-kind-${snapshot.kind}`}>{formatStepLabel(snapshot)}</div>
            {snapshot.pairs.map(pair => {
              const isActive = snapshot.kind === 'cross' &&
                (pair.slotA === 0 || pair.slotA === snapshot.slots.length / 2);
              return (
                <div
                  key={`${snapshot.subStep}-${pair.pairIndex}`}
                  className={`kongo-pair-cell${isActive ? ' active' : ''}`}
                  title={`pair ${pair.pairIndex + 1}: slots ${pair.slotA} and ${pair.slotB}`}
                >
                  <span className="kongo-pair-caption">{pair.pairIndex + 1}</span>
                  <span className="kongo-pair-half" style={{ backgroundColor: pair.first.color }} aria-hidden="true" />
                  <span className="kongo-pair-half" style={{ backgroundColor: pair.second.color }} aria-hidden="true" />
                </div>
              );
            })}
          </div>
        </button>
      ))}
    </div>
  );
}

function createSlotLookup(snapshot: KongoSnapshot): Map<number, number> {
  return new Map(snapshot.slots.map((strand, index) => [strand.id, index]));
}

function formatStepLabel(snapshot: KongoSnapshot): string {
  switch (snapshot.kind) {
    case 'start':
      return 'Start';
    case 'cross':
      return `${snapshot.sequenceStep}: ${snapshot.move} cross`;
    case 'rotate':
      return `${snapshot.sequenceStep}: Rotate ↻2`;
    case 'transition':
      return `${snapshot.sequenceStep}: → ${snapshot.move}`;
  }
}

function polar(slotIndex: number, slotCount: number, radius: number) {
  const angle = (2 * Math.PI * slotIndex) / slotCount - Math.PI / 2;
  return {
    x: DISK_SIZE / 2 + Math.cos(angle) * radius,
    y: DISK_SIZE / 2 + Math.sin(angle) * radius,
  };
}
