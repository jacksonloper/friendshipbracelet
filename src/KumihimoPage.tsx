import { useEffect, useMemo, useState } from 'react';
import {
  createDefaultKongoSequence,
  createDefaultStrands,
  ensureStrandCountDivisibleByFour,
  parseKongoSequence,
  resizeStrands,
  simulateKongo,
  type KongoActionParticipant,
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
  const finalSnapshot = simulation.snapshots[simulation.snapshots.length - 1] ?? simulation.snapshots[0];

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

  return (
    <div className="kumihimo-page">
      <div className="page-header">
        <div>
          <h1>Kongo Gumi Pattern Builder</h1>
          <p className="page-description">
            Each Z or S step now models one active four-strand group: two threads up, two threads down,
            then a counterclockwise disk rotation to bring the next pair to the top.
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
            Use only Z and S steps. Whitespace and commas are ignored.
            Z moves left down + right up; S moves left up + right down; each step then rotates the disk counterclockwise.
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
            <Metric label="Normalized count" value={String(ensureStrandCountDivisibleByFour(strands.length))} />
            <Metric label="Steps" value={String(parsedSequence.sequence.length)} />
            <Metric label="Pairs" value={String(snapshot.pairs.length)} />
            <Metric label="Final move" value={finalSnapshot.move ?? 'Start'} />
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
            <span>{formatStepLabel(snapshot)}</span>
          </div>
          <label className="timeline-label">
            Step {snapshot.step} / {Math.max(simulation.snapshots.length - 1, 0)}
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
          <h2>Selected step</h2>
          <KongoActionCard snapshot={snapshot} />
        </section>
      </div>

      <div className="kumihimo-grid">
        <section className="panel">
          <h2>Pattern timeline</h2>
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
  const slotPositions = Array.from({ length: snapshot.slots.length }, (_, index) => polar(index, snapshot.slots.length, RING_RADIUS));
  const pairCount = snapshot.pairs.length;
  const highlightedPairs = new Set<number>(snapshot.action ? [snapshot.action.topPairIndex, snapshot.action.bottomPairIndex] : []);
  const previousSlotLookup = createSlotLookup(previousSnapshot);

  return (
    <svg width={DISK_SIZE} height={DISK_SIZE} viewBox={`0 0 ${DISK_SIZE} ${DISK_SIZE}`} className="kongo-disk">
      <circle cx={DISK_SIZE / 2} cy={DISK_SIZE / 2} r={RING_RADIUS + 22} fill="var(--bg-secondary)" stroke="var(--border)" />
      <circle cx={DISK_SIZE / 2} cy={DISK_SIZE / 2} r={56} fill="var(--bg)" stroke="var(--border)" />
      {snapshot.pairs.map(pair => {
        const first = slotPositions[pair.slotA];
        const second = slotPositions[pair.slotB];
        if (!first || !second) {
          return null;
        }
        const emphasized = highlightedPairs.has(pair.pairIndex);
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
      {slotPositions.map((position, index) => (
        <g key={`slot-${index}`}>
          <circle cx={position.x} cy={position.y} r={slotRadius} fill="var(--bg)" stroke="var(--border)" />
          <text x={position.x} y={position.y - slotRadius - 6} textAnchor="middle" className="kongo-slot-label">
            {index}
          </text>
        </g>
      ))}
      {snapshot.slots.map((strand, index) => {
        const nextPosition = slotPositions[index];
        const previousIndex = previousSlotLookup.get(strand.id) ?? index;
        const previousPosition = slotPositions[previousIndex] ?? nextPosition;
        if (!nextPosition) {
          return null;
        }
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
            {snapshot.step > 0 && previousIndex !== index && (
              <line
                x1={relativeTrailX}
                y1={relativeTrailY}
                x2={0}
                y2={0}
                className="kongo-motion-trail"
              />
            )}
          </g>
        );
      })}
      {snapshot.action ? (
        <>
          <text x={DISK_SIZE / 2} y={DISK_SIZE / 2 - 8} textAnchor="middle" className="kongo-center-label">
            {snapshot.move} step: 2 up / 2 down active group
          </text>
          <text x={DISK_SIZE / 2} y={DISK_SIZE / 2 + 12} textAnchor="middle" className="kongo-center-label">
            Rotate counterclockwise by {snapshot.action.rotationSlots} slots
          </text>
          <text x={DISK_SIZE / 2} y={DISK_SIZE / 2 + 32} textAnchor="middle" className="kongo-center-label subtle">
            Top pair P1, bottom pair P{Math.floor(pairCount / 2 + 1)}
          </text>
        </>
      ) : (
        <text x={DISK_SIZE / 2} y={DISK_SIZE / 2 + 4} textAnchor="middle" className="kongo-center-label">
          Start position
        </text>
      )}
    </svg>
  );
}

function KongoActionCard({ snapshot }: { snapshot: KongoSnapshot }) {
  if (!snapshot.action || !snapshot.move) {
    return (
      <div className="kongo-action-card">
        <p className="note">Select a Z or S step to inspect the active two-up / two-down group.</p>
      </div>
    );
  }

  return (
    <div className="kongo-action-card">
      <p className="kongo-action-summary">
        <strong>{snapshot.move}</strong> works on the current top and bottom pairs.
        Then the disk rotates counterclockwise so a fresh pair is ready at the top.
      </p>
      <div className="kongo-action-grid">
        {snapshot.action.participants.map(participant => (
          <ActionParticipantCard key={participant.role} participant={participant} />
        ))}
      </div>
      <div className="kongo-action-footer">
        <span>Active pairs: top P{snapshot.action.topPairIndex + 1}, bottom P{snapshot.action.bottomPairIndex + 1}</span>
        <span>Rotation: {snapshot.action.rotationSlots} slots counterclockwise</span>
      </div>
    </div>
  );
}

function ActionParticipantCard({ participant }: { participant: KongoActionParticipant }) {
  return (
    <div className={`kongo-action-participant${participant.moves ? ' moving' : ''}`}>
      <span className="kongo-swatch" style={{ backgroundColor: participant.strand.color }} aria-hidden="true" />
      <div>
        <strong>{formatRole(participant.role)}</strong>
        <div>strand #{participant.strand.id} in slot {participant.slot}</div>
        <div>{participant.moves ? `Moves to ${participant.targetLabel}` : participant.targetLabel}</div>
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
          key={`${snapshot.step}-${snapshot.move ?? 'start'}`}
          type="button"
          className={`kongo-pattern-row-button${snapshot.step === selectedStep ? ' active' : ''}`}
          onClick={() => onSelectStep(snapshot.step)}
        >
          <div className="kongo-pattern-row">
            <div className="kongo-step-label">{formatStepLabel(snapshot)}</div>
            {snapshot.pairs.map(pair => (
              <div
                key={`${snapshot.step}-${pair.pairIndex}`}
                className={`kongo-pair-cell${snapshot.action && (pair.pairIndex === snapshot.action.topPairIndex || pair.pairIndex === snapshot.action.bottomPairIndex) ? ' active' : ''}`}
                title={`pair ${pair.pairIndex + 1}: slots ${pair.slotA} and ${pair.slotB}`}
              >
                <span className="kongo-pair-caption">{pair.pairIndex + 1}</span>
                <span className="kongo-pair-half" style={{ backgroundColor: pair.first.color }} aria-hidden="true" />
                <span className="kongo-pair-half" style={{ backgroundColor: pair.second.color }} aria-hidden="true" />
              </div>
            ))}
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
  if (snapshot.move === null) {
    return 'Start';
  }

  return `${snapshot.step}: ${snapshot.move}`;
}

function formatRole(role: KongoActionParticipant['role']): string {
  switch (role) {
    case 'leftUp':
      return 'Left up';
    case 'rightUp':
      return 'Right up';
    case 'leftDown':
      return 'Left down';
    case 'rightDown':
      return 'Right down';
    default:
      return role;
  }
}

function polar(slotIndex: number, slotCount: number, radius: number) {
  const angle = (2 * Math.PI * slotIndex) / slotCount - Math.PI / 2;
  return {
    x: DISK_SIZE / 2 + Math.cos(angle) * radius,
    y: DISK_SIZE / 2 + Math.sin(angle) * radius,
  };
}
