import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  computeKumihimoPattern,
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
            move), then a counter-clockwise disk rotation by 2. Use the slider to step through each
            sub-step and watch the strands animate.
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
            Each cross is followed by a counter-clockwise disk rotation by 2. A direction change inserts a pair-swap transition.
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
          <h2>Bracelet pattern</h2>
          <KumihimoBraceletPattern initialStrands={strands} />
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
  // Intermediate value before min/max clamping; inversely proportional to strand count.
  const unclamped = SLOT_RADIUS_SCALE_FACTOR - snapshot.slots.length;
  const slotRadius = Math.max(
    MIN_SLOT_RADIUS,
    Math.min(MAX_SLOT_RADIUS, unclamped),
  );
  const n = snapshot.slots.length;
  const half = n / 2;

  // Slot positions never change for a given n (fixed ring geometry).
  const slotPositions = useMemo(
    () => Array.from({ length: n }, (_, i) => polar(i, n, RING_RADIUS)),
    [n],
  );

  const activeSlotSet = new Set(snapshot.activeSlots);

  // Only the cross step highlights specific pairs; for the rest no pairs are highlighted.
  const activePairIndices = snapshot.kind === 'cross'
    ? new Set([0, half / 2])
    : new Set<number>();

  // ── Animation ────────────────────────────────────────────────────────────
  // We manage `style.transform` on each strand <g> entirely via DOM refs so
  // that every step-change animates FROM the correct previous slot position
  // regardless of how the user navigates the slider.
  const nodeRefs = useRef<Map<number, SVGGElement>>(new Map());

  useLayoutEffect(() => {
    const prevLookup = new Map(previousSnapshot.slots.map((s, i) => [s.id, i]));
    const currLookup = new Map(snapshot.slots.map((s, i) => [s.id, i]));

    // Step 1 — snap every strand to its PREVIOUS slot position (no transition).
    for (const [id, el] of nodeRefs.current) {
      const prevSlot = prevLookup.get(id) ?? currLookup.get(id) ?? 0;
      const pos = slotPositions[prevSlot];
      if (pos) {
        el.style.transition = 'none';
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
    }

    // Force a synchronous layout so the browser registers the "from" position
    // before we set the transition.  Reading any layout property is sufficient.
    const firstEl = nodeRefs.current.values().next().value as SVGGElement | undefined;
    firstEl?.getBoundingClientRect();

    // Step 2 — animate every strand to its CURRENT slot position.
    for (const [id, el] of nodeRefs.current) {
      const currSlot = currLookup.get(id) ?? 0;
      const pos = slotPositions[currSlot];
      if (pos) {
        el.style.transition = 'transform var(--animation-duration) ease';
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
    }
  }, [snapshot.subStep, slotPositions]);   // run on every step or strand-count change

  // For drawing motion-trail arrows (purely decorative).
  const previousSlotLookup = useMemo(
    () => new Map(previousSnapshot.slots.map((s, i) => [s.id, i])),
    [previousSnapshot.slots],
  );

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

      {/* Strand dots – positions driven by useLayoutEffect above (no style prop here). */}
      {snapshot.slots.map((strand, index) => {
        // Trail line: drawn relative to the strand's current position.
        const previousIndex = previousSlotLookup.get(strand.id) ?? index;
        const currPos = slotPositions[index];
        const prevPos = slotPositions[previousIndex] ?? currPos;
        const showTrail = snapshot.subStep > 0 && previousIndex !== index && currPos && prevPos;

        return (
          <g
            key={strand.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(strand.id, el);
              else nodeRefs.current.delete(strand.id);
            }}
            className="kongo-strand-node"
          >
            {showTrail && (
              <line
                x1={prevPos!.x - currPos!.x}
                y1={prevPos!.y - currPos!.y}
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
      return 'Rotate ↺ 2';
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
          Disk rotates <strong>counter-clockwise by 2</strong> positions.
          Every strand moves from slot <em>i</em> to slot <em>(i − 2 + n) mod {snapshot.slots.length}</em>.
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
      return `${snapshot.sequenceStep}: Rotate ↺2`;
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

/**
 * Renders the kumihimo bracelet pattern as an SVG oblique-lattice of overlapping
 * ellipses, using only the initial strand colors (independent of sequence).
 *
 * Layout: r = half the horizontal cell spacing.
 *   even rows shift right by r (½ step).
 *   ellipse size: 2.5r × 3r (overlap creates woven look).
 */
function KumihimoBraceletPattern({ initialStrands }: { initialStrands: StrandSpec[] }) {
  const S = initialStrands.length;
  if (S < 4 || S % 4 !== 0) return null;

  const W = S / 2;
  const NR = Math.min(Math.round(0.86 * S + 1.56), 40);

  // Cell half-spacing in pixels.
  const r = 20;

  const pattern = useMemo(
    () => computeKumihimoPattern(initialStrands, NR),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialStrands.map(s => s.color).join(','), NR],
  );

  const svgWidth = (2 * W + 3) * r;
  const svgHeight = (2 * NR + 2) * r;

  return (
    <div className="kumihimo-bracelet-scroll">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="kumihimo-bracelet-svg"
        aria-label="Kumihimo bracelet pattern preview"
      >
        {pattern.map((row, i) =>
          row.map((color, j) => {
            // x1=r: left margin of one r; even rows shift right by r.
            const x = r + (2 * j + 1) * r + (i % 2 === 0 ? r : 0);
            const y = r + (2 * i + 1) * r;
            return (
              <ellipse
                key={`${i}-${j}`}
                cx={x}
                cy={y}
                rx={1.25 * r}
                ry={1.5 * r}
                fill={color}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}
