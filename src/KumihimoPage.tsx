import { useEffect, useMemo, useState } from 'react';
import {
  CompoundMove,
  KumihimoConfig,
  StepSnapshot,
  StrandSpec,
  compoundMovesToJSON,
  createDefaultCompoundMoves,
  createDefaultKumihimoConfig,
  createDefaultStrands,
  parseCompoundMoves,
  resizeStrands,
  simulateKumihimo,
} from './kumihimoModel';

const DISK_SIZE = 360;
const RING_RADIUS = 132;
const CHART_PADDING = 10;
const CHART_INSET = CHART_PADDING * 2;

export default function KumihimoPage() {
  const [config, setConfig] = useState<KumihimoConfig>(createDefaultKumihimoConfig);
  const [strands, setStrands] = useState<StrandSpec[]>(() => createDefaultStrands(32, 16));
  const [moveText, setMoveText] = useState(() => compoundMovesToJSON(createDefaultCompoundMoves(32)));
  const [selectedStep, setSelectedStep] = useState(0);

  const parsedMoves = useMemo(() => parseCompoundMoves(moveText, config.slotCount), [config.slotCount, moveText]);
  const simulation = useMemo(
    () => simulateKumihimo(config, strands, parsedMoves.compounds),
    [config, parsedMoves.compounds, strands],
  );

  useEffect(() => {
    setSelectedStep(previous => Math.min(previous, simulation.snapshots.length - 1));
  }, [simulation.snapshots.length]);

  const snapshot = simulation.snapshots[selectedStep] ?? simulation.snapshots[0];
  const totalVisibleSegments = simulation.visibleSegments.length;

  function updateConfig<K extends keyof KumihimoConfig>(key: K, value: KumihimoConfig[K]) {
    setConfig(previous => ({ ...previous, [key]: value }));
  }

  function updateStrand(index: number, patch: Partial<StrandSpec>) {
    setStrands(previous => previous.map((strand, strandIndex) => (
      strandIndex === index ? { ...strand, ...patch } : strand
    )));
  }

  function handleSlotCountChange(value: number) {
    if (!Number.isFinite(value)) return;
    const slotCount = Math.max(8, value);
    setConfig(previous => ({ ...previous, slotCount }));
    setStrands(previous => resizeStrands(previous, config.strandCount, slotCount));
    setMoveText(compoundMovesToJSON(createDefaultCompoundMoves(slotCount)));
    setSelectedStep(0);
  }

  function handleStrandCountChange(value: number) {
    if (!Number.isFinite(value)) return;
    const strandCount = Math.max(4, value - (value % 4));
    setConfig(previous => ({ ...previous, strandCount }));
    setStrands(previous => resizeStrands(previous, strandCount, config.slotCount));
    setSelectedStep(0);
  }

  function resetDefaults() {
    const nextConfig = createDefaultKumihimoConfig();
    setConfig(nextConfig);
    setStrands(createDefaultStrands(nextConfig.slotCount, nextConfig.strandCount));
    setMoveText(compoundMovesToJSON(createDefaultCompoundMoves(nextConfig.slotCount)));
    setSelectedStep(0);
  }

  return (
    <div className="kumihimo-page">
      <div className="page-header">
        <div>
          <h1>Kumihimo Pattern Modeler</h1>
          <p className="page-description">
            Explore slot occupancy, center drift, twist, and a surface-color estimate for generalized (4n)-strand kumihimo.
          </p>
        </div>
        <button type="button" onClick={resetDefaults}>Reset defaults</button>
      </div>

      <div className="kumihimo-grid">
        <section className="panel">
          <h2>Configuration</h2>
          <div className="field-grid">
            <label>
              Slots
              <input
                type="number"
                min={8}
                step={4}
                value={config.slotCount}
                onChange={event => handleSlotCountChange(parseInt(event.target.value, 10))}
              />
            </label>
            <label>
              Strands (4n)
              <input
                type="number"
                min={4}
                step={4}
                value={config.strandCount}
                onChange={event => handleStrandCountChange(parseInt(event.target.value, 10))}
              />
            </label>
            <label>
              Compound repeats
              <input
                type="number"
                min={1}
                max={64}
                value={config.repeats}
                onChange={event => {
                  const value = parseInt(event.target.value, 10);
                  if (!Number.isFinite(value)) return;
                  updateConfig('repeats', Math.max(1, value));
                }}
              />
            </label>
            <label>
              Center scale
              <input
                type="number"
                min={0}
                step={0.1}
                value={config.centerScale}
                onChange={event => {
                  const value = parseFloat(event.target.value);
                  if (!Number.isFinite(value)) return;
                  updateConfig('centerScale', Math.max(0, value));
                }}
              />
            </label>
            <label>
              Twist scale
              <input
                type="number"
                min={0}
                step={0.05}
                value={config.twistScale}
                onChange={event => {
                  const value = parseFloat(event.target.value);
                  if (!Number.isFinite(value)) return;
                  updateConfig('twistScale', Math.max(0, value));
                }}
              />
            </label>
          </div>
          <p className="note">
            The simulator uses the chord-midpoint center model and the crossing-order twist estimate from <code>kumihimo_plan.txt</code>.
          </p>
        </section>

        <section className="panel">
          <h2>Initial strands</h2>
          <div className="strand-editor">
            {strands.map((strand, index) => (
              <div key={strand.id} className="strand-editor-row">
                <span>#{strand.id}</span>
                <input
                  type="color"
                  value={strand.color}
                  onChange={event => updateStrand(index, { color: event.target.value })}
                  aria-label={`Color for strand ${strand.id}`}
                />
                <label>
                  Slot
                  <input
                    type="number"
                    min={0}
                    max={config.slotCount - 1}
                    value={strand.slot}
                    onChange={event => {
                      const value = parseInt(event.target.value, 10);
                      if (!Number.isFinite(value)) return;
                      updateStrand(index, { slot: value });
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Compound move pattern</h2>
          <button type="button" onClick={() => setMoveText(compoundMovesToJSON(createDefaultCompoundMoves(config.slotCount)))}>
            Load default pattern
          </button>
        </div>
        <textarea
          className="code-editor"
          value={moveText}
          onChange={event => setMoveText(event.target.value)}
          spellCheck={false}
          aria-label="Compound move pattern JSON"
        />
        {parsedMoves.errors.length > 0 ? (
          <div className="error-list">
            {parsedMoves.errors.map(error => <div key={error}>{error}</div>)}
          </div>
        ) : (
          <p className="note">
            {parsedMoves.compounds.length} compound move{parsedMoves.compounds.length === 1 ? '' : 's'} loaded.
            Selectors support <code>top</code>, <code>bottom</code>, <code>index</code>, and <code>specific_id</code>.
          </p>
        )}
        {simulation.errors.length > 0 ? (
          <div className="error-list">
            {simulation.errors.map(error => <div key={error}>{error}</div>)}
          </div>
        ) : null}
      </section>

      <div className="kumihimo-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Disk view</h2>
            <span>{snapshot?.compoundName ?? 'Initial layout'}</span>
          </div>
          <label className="timeline-label">
            Step {selectedStep} / {Math.max(simulation.snapshots.length - 1, 0)}
            <input
              type="range"
              min={0}
              max={Math.max(simulation.snapshots.length - 1, 0)}
              value={selectedStep}
              onChange={event => setSelectedStep(parseInt(event.target.value, 10))}
            />
          </label>
          {snapshot ? <KumihimoDisk snapshot={snapshot} strands={strands} slotCount={config.slotCount} /> : null}
        </section>

        <section className="panel">
          <h2>Center trace</h2>
          <CenterTrace history={simulation.centerHistory} />
          <div className="metric-grid">
            <Metric label="Current center" value={`${formatNumber(snapshot?.center.x ?? 0)}, ${formatNumber(snapshot?.center.y ?? 0)}`} />
            <Metric label="Max radius" value={formatNumber(simulation.diagnostics.maxCenterRadius)} />
            <Metric label="Period drift" value={formatNumber(simulation.diagnostics.periodCenterDriftMagnitude)} />
            <Metric label="Rebalance step" value={simulation.diagnostics.timeToRebalance === null ? '—' : String(simulation.diagnostics.timeToRebalance)} />
          </div>
        </section>
      </div>

      <div className="kumihimo-grid">
        <section className="panel">
          <h2>Twist</h2>
          <TwistTrace history={simulation.twistHistory} />
          <div className="metric-grid">
            <Metric label="Current twist" value={formatNumber(snapshot?.twist ?? 0)} />
            <Metric label="Per period" value={formatNumber(simulation.diagnostics.periodTwist)} />
            <Metric label="Avg / compound" value={formatNumber(simulation.diagnostics.averageTwistPerCompound)} />
            <Metric label="Residual max" value={formatNumber(simulation.diagnostics.residualTwistMax)} />
          </div>
        </section>

        <section className="panel">
          <h2>Surface texture estimate</h2>
          <TexturePreview segments={simulation.visibleSegments} />
          <div className="metric-grid">
            <Metric label="Visible segments" value={String(totalVisibleSegments)} />
            <Metric label="Shortest move" value={simulation.diagnostics.shortestMove === null ? '—' : String(simulation.diagnostics.shortestMove)} />
            <Metric label="Longest move" value={simulation.diagnostics.longestMove === null ? '—' : String(simulation.diagnostics.longestMove)} />
            <Metric label="Float risk" value={formatNumber(simulation.diagnostics.averageFloatRisk)} />
          </div>
        </section>
      </div>

      <div className="kumihimo-grid">
        <section className="panel">
          <h2>Occupancy diagnostics</h2>
          <div className="metric-grid">
            <Metric label="Slot-balanced" value={simulation.diagnostics.slotBalanced ? 'Yes' : 'No'} />
            <Metric label="Sector-balanced" value={simulation.diagnostics.sectorBalanced ? 'Yes' : 'No'} />
            <Metric label="Max imbalance" value={String(simulation.diagnostics.maxTemporaryImbalance)} />
            <Metric
              label="Sector delta"
              value={`N ${simulation.diagnostics.sectorDelta.N}, E ${simulation.diagnostics.sectorDelta.E}, S ${simulation.diagnostics.sectorDelta.S}, W ${simulation.diagnostics.sectorDelta.W}`}
            />
          </div>
          <div className="chip-list">
            {simulation.diagnostics.slotDelta.map((delta, slot) => (
              <span key={slot} className={`chip ${delta === 0 ? '' : 'chip-warn'}`}>
                {slot}: {delta > 0 ? '+' : ''}{delta}
              </span>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Fairness + color visibility</h2>
          <div className="metric-grid">
            <Metric label="Max wait" value={String(simulation.diagnostics.maxWaitingTime)} />
            <Metric label="Avg wait" value={formatNumber(simulation.diagnostics.averageWaitingTime)} />
            <Metric label="Never moved" value={simulation.diagnostics.neverMoved.length === 0 ? 'None' : simulation.diagnostics.neverMoved.join(', ')} />
            <Metric label="Overused" value={simulation.diagnostics.overused.length === 0 ? 'None' : simulation.diagnostics.overused.join(', ')} />
          </div>
          <div className="chip-list">
            {Object.entries(simulation.diagnostics.colorHistogram).map(([color, count]) => (
              <span key={color} className="chip chip-color">
                <span className="color-swatch" style={{ backgroundColor: color }} aria-hidden="true" />
                {count}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Move distance histogram</h2>
        <div className="chip-list">
          {Object.entries(simulation.diagnostics.moveDistanceHistogram).map(([distance, count]) => (
            <span key={distance} className="chip">{distance}: {count}</span>
          ))}
        </div>
      </section>
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

function KumihimoDisk({
  snapshot,
  strands,
  slotCount,
}: {
  snapshot: StepSnapshot;
  strands: StrandSpec[];
  slotCount: number;
}) {
  const strandLookup = new Map(strands.map(strand => [strand.id, strand]));

  return (
    <svg width={DISK_SIZE} height={DISK_SIZE} viewBox={`0 0 ${DISK_SIZE} ${DISK_SIZE}`} className="kumihimo-disk">
      <circle cx={DISK_SIZE / 2} cy={DISK_SIZE / 2} r={RING_RADIUS + 18} fill="var(--bg-secondary)" stroke="var(--border)" />
      <circle cx={DISK_SIZE / 2} cy={DISK_SIZE / 2} r={52} fill="var(--bg)" stroke="var(--border)" />
      {snapshot.slots.map(slot => {
        const position = polar(slot.slotIndex, slotCount, RING_RADIUS);
        return (
          <g key={slot.slotIndex}>
            <circle
              cx={position.x}
              cy={position.y}
              r={12}
              fill={slot.strands.length > 0 ? 'var(--bg)' : 'transparent'}
              stroke="var(--border)"
            />
            <text x={position.x} y={position.y - 18} textAnchor="middle" className="slot-label">
              {slot.slotIndex}
            </text>
            {slot.strands.map((strandId, stackIndex) => {
              const strand = strandLookup.get(strandId);
              return (
                <circle
                  key={strandId}
                  cx={position.x}
                  cy={position.y - stackIndex * 5}
                  r={6}
                  fill={strand?.color ?? '#999999'}
                  stroke="var(--fg)"
                  strokeWidth={1}
                />
              );
            })}
          </g>
        );
      })}
      <text x={DISK_SIZE / 2} y={DISK_SIZE / 2 - 8} textAnchor="middle" className="disk-center-label">
        C=({formatNumber(snapshot.center.x)}, {formatNumber(snapshot.center.y)})
      </text>
      <text x={DISK_SIZE / 2} y={DISK_SIZE / 2 + 12} textAnchor="middle" className="disk-center-label">
        H={formatNumber(snapshot.twist)}
      </text>
    </svg>
  );
}

function CenterTrace({ history }: { history: { x: number; y: number }[] }) {
  const center = 90;
  const radius = 78;
  const maxValue = history.reduce((max, point) => Math.max(max, Math.abs(point.x), Math.abs(point.y)), 1);
  const scale = radius / maxValue;
  const path = history
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${center + point.x * scale} ${center - point.y * scale}`)
    .join(' ');

  return (
    <svg width="100%" viewBox="0 0 180 180" className="trace-svg">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" />
      <line x1={center} y1={12} x2={center} y2={168} stroke="var(--border)" />
      <line x1={12} y1={center} x2={168} y2={center} stroke="var(--border)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
      {history.length > 0 ? (
        <circle
          cx={center + history[history.length - 1].x * scale}
          cy={center - history[history.length - 1].y * scale}
          r={3.5}
          fill="var(--accent)"
        />
      ) : null}
    </svg>
  );
}

function TwistTrace({ history }: { history: number[] }) {
  const width = 320;
  const height = 180;
  const min = Math.min(...history, 0);
  const max = Math.max(...history, 0);
  const range = Math.max(max - min, 1);
  const path = history
    .map((value, index) => {
      const x = history.length === 1
        ? CHART_PADDING
        : (index / (history.length - 1)) * (width - CHART_INSET) + CHART_PADDING;
      const y = height - CHART_PADDING - ((value - min) / range) * (height - CHART_INSET);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const zeroY = height - CHART_PADDING - ((0 - min) / range) * (height - CHART_INSET);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="trace-svg">
      <line x1={CHART_PADDING} y1={zeroY} x2={width - CHART_PADDING} y2={zeroY} stroke="var(--border)" />
      <path d={path} fill="none" stroke="var(--accent-2)" strokeWidth={2.5} />
    </svg>
  );
}

function TexturePreview({ segments }: { segments: { surfaceAngle: number; color: string; time: number }[] }) {
  const width = 320;
  const height = 220;
  const maxTime = Math.max(...segments.map(segment => segment.time), 1);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="texture-svg">
      <rect x={0} y={0} width={width} height={height} fill="var(--bg-secondary)" rx={8} />
      {segments.map((segment, index) => {
        const x = 12 + (segment.surfaceAngle / (2 * Math.PI)) * (width - 24);
        const y = 12 + ((segment.time - 1) / maxTime) * (height - 24);
        return (
          <line
            key={`${segment.time}-${index}`}
            x1={x - 5}
            y1={y + 4}
            x2={x + 5}
            y2={y - 4}
            stroke={segment.color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function polar(slotIndex: number, slotCount: number, radius: number) {
  const angle = (2 * Math.PI * slotIndex) / slotCount - Math.PI / 2;
  return {
    x: DISK_SIZE / 2 + Math.cos(angle) * radius,
    y: DISK_SIZE / 2 + Math.sin(angle) * radius,
  };
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}
