import { useCallback, useRef, useState } from 'react';
import {
  BraceletState,
  KnotType,
  knotsInRow,
  cycleKnot,
  generateDefaultKnots,
  defaultColors,
  computeStrandOrder,
  computePattern,
  computeLongestUnwovenStretches,
  stateToJSON,
  stateFromJSON,
  presents,
} from './braceletModel';
import KnotDiagram from './KnotDiagram';
import PatternDisplay from './PatternDisplay';

function isValidStrands(val: string): boolean {
  const n = parseInt(val, 10);
  return !isNaN(n) && n >= 2 && n <= 20 && n % 2 === 0;
}

function isValidRows(val: string): boolean {
  const n = parseInt(val, 10);
  return !isNaN(n) && n >= 1 && n <= 100;
}

function initialState(): BraceletState {
  const numStrands = 6;
  const numRows = 7;
  return {
    numStrands,
    numRows,
    colors: defaultColors(),
    knots: generateDefaultKnots(numStrands, numRows),
    lockPattern: true,
  };
}

export default function BraceletDesigner() {
  const [state, setState] = useState<BraceletState>(initialState);
  const [jsonInput, setJsonInput] = useState('');
  const [dialogType, setDialogType] = useState<'strands' | 'rows' | null>(null);
  const [dialogValue, setDialogValue] = useState('');
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const handleKnotClick = useCallback((row: number, col: number) => {
    setState(prev => {
      const newKnots = prev.knots.map(r => [...r]);
      const newType = cycleKnot(newKnots[row][col]);
      newKnots[row][col] = newType;

      if (prev.lockPattern) {
        for (let r = row % 2; r < prev.numRows; r += 2) {
          if (r !== row && (r % 2 === row % 2)) {
            if (col < knotsInRow(prev.numStrands, r)) {
              newKnots[r][col] = newType;
            }
          }
        }
      }

      return { ...prev, knots: newKnots };
    });
  }, []);

  const handleColorChange = useCallback((idx: number, color: string) => {
    setState(prev => {
      const newColors = [...prev.colors];
      newColors[idx] = color;
      return { ...prev, colors: newColors };
    });
  }, []);

  const handleNumStrandsChange = useCallback((n: number) => {
    if (n < 2 || n % 2 !== 0 || n > 20) return;
    setState(prev => {
      const colors = Array.from({ length: n }, (_, i) =>
        prev.colors[i % prev.colors.length] || defaultColors()[i % 6]
      );
      const knots: KnotType[][] = [];
      for (let row = 0; row < prev.numRows; row++) {
        const nk = knotsInRow(n, row);
        const existing = prev.knots[row] ?? [];
        knots.push(Array.from({ length: nk }, (_, k) => existing[k] ?? 'FF'));
      }
      return {
        ...prev,
        numStrands: n,
        colors,
        knots,
      };
    });
  }, []);

  const handleNumRowsChange = useCallback((n: number) => {
    if (n < 1 || n > 100) return;
    setState(prev => {
      const knots: KnotType[][] = [];
      for (let row = 0; row < n; row++) {
        const nk = knotsInRow(prev.numStrands, row);
        if (row < prev.knots.length && prev.knots[row].length === nk) {
          knots.push([...prev.knots[row]]);
        } else if (prev.lockPattern) {
          const srcRow = row % 2 === 0 ? 0 : 1;
          const srcKnots = prev.knots[srcRow];
          if (srcKnots) {
            knots.push(Array.from({ length: nk }, (_, k) => srcKnots[k] ?? 'FF'));
          } else {
            knots.push(Array(nk).fill('FF') as KnotType[]);
          }
        } else {
          knots.push(Array(nk).fill('FF') as KnotType[]);
        }
      }
      return { ...prev, numRows: n, knots };
    });
  }, []);

  const openDialog = useCallback((type: 'strands' | 'rows') => {
    setDialogType(type);
    setDialogValue(type === 'strands' ? String(state.numStrands) : String(state.numRows));
    dialogRef.current?.showModal();
  }, [state.numRows, state.numStrands]);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
    setDialogType(null);
  }, []);

  const confirmDialog = useCallback(() => {
    if (dialogType === 'strands' && isValidStrands(dialogValue)) {
      handleNumStrandsChange(parseInt(dialogValue, 10));
    } else if (dialogType === 'rows' && isValidRows(dialogValue)) {
      handleNumRowsChange(parseInt(dialogValue, 10));
    }
    closeDialog();
  }, [closeDialog, dialogType, dialogValue, handleNumRowsChange, handleNumStrandsChange]);

  const handleCopyJSON = useCallback(() => {
    navigator.clipboard.writeText(stateToJSON(state));
  }, [state]);

  const handleLoadJSON = useCallback(() => {
    const loaded = stateFromJSON(jsonInput);
    if (loaded) {
      setState(loaded);
      setJsonInput('');
    } else {
      alert('Invalid JSON');
    }
  }, [jsonInput]);

  const handleLockChange = useCallback((locked: boolean) => {
    setState(prev => {
      if (!locked) return { ...prev, lockPattern: false };
      const newKnots = prev.knots.map(r => [...r]);
      for (let row = 2; row < prev.numRows; row++) {
        const srcRow = row % 2 === 0 ? 0 : 1;
        if (srcRow < newKnots.length) {
          const nk = knotsInRow(prev.numStrands, row);
          for (let k = 0; k < nk; k++) {
            newKnots[row][k] = newKnots[srcRow]?.[k] ?? 'FF';
          }
        }
      }
      return { ...prev, lockPattern: true, knots: newKnots };
    });
  }, []);

  const strandOrder = computeStrandOrder(state);
  const pattern = computePattern(state);
  const backPattern = computePattern(state, true);
  const longestUnwovenStretches = computeLongestUnwovenStretches(state);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Friendship Bracelet Designer</h1>
          <p className="page-description">Design straight-knot bracelet patterns and inspect front/back color layouts.</p>
        </div>
      </div>

      <div className="controls">
        <button onClick={() => openDialog('strands')}>Strands: {state.numStrands}</button>
        <button onClick={() => openDialog('rows')}>Rows: {state.numRows}</button>
        <label>
          <input
            type="checkbox"
            checked={state.lockPattern}
            onChange={e => handleLockChange(e.target.checked)}
          />
          Lock pattern
        </label>
        <button onClick={handleCopyJSON}>Copy JSON</button>
        <div className="json-area">
          <textarea
            placeholder="Paste JSON here..."
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
          />
          <button onClick={handleLoadJSON}>Load</button>
        </div>
        <div className="presents-area">
          <select
            defaultValue=""
            onChange={e => {
              const found = presents.find(p => p.name === e.target.value);
              if (found) setState(found.state);
              e.target.value = '';
            }}
          >
            <option value="" disabled>Load preset…</option>
            {presents.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="edit-dialog"
        onClose={closeDialog}
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            confirmDialog();
          }}
        >
          <p className="edit-dialog-label">
            {dialogType === 'strands'
              ? 'Number of strands (even, 2–20):'
              : 'Number of rows (1–100):'}
          </p>
          <input
            className="edit-dialog-input"
            type="number"
            value={dialogValue}
            min={dialogType === 'strands' ? 2 : 1}
            max={dialogType === 'strands' ? 20 : 100}
            step={dialogType === 'strands' ? 2 : 1}
            autoFocus
            onChange={e => setDialogValue(e.target.value)}
          />
          <div className="edit-dialog-buttons">
            <button type="submit">OK</button>
            <button type="button" onClick={closeDialog}>Cancel</button>
          </div>
        </form>
      </dialog>

      <div className="strand-colors">
        {state.colors.map((color, idx) => (
          <input
            key={idx}
            type="color"
            value={color}
            onChange={e => handleColorChange(idx, e.target.value)}
            className="strand-color-btn"
            aria-label={`Change color of strand ${idx + 1}`}
            title={`Strand ${idx + 1}`}
          />
        ))}
      </div>

      <KnotDiagram
        state={state}
        strandOrder={strandOrder}
        onKnotClick={handleKnotClick}
      />

      <PatternDisplay
        pattern={pattern}
        backPattern={backPattern}
        knots={state.knots}
        numStrands={state.numStrands}
      />

      <div className="strand-stats">
        <h3>Longest unwoven stretch</h3>
        <div className="strand-stats-grid">
          {longestUnwovenStretches.map((stretch, idx) => (
            <div key={idx} className="strand-stat">
              <span
                className="strand-stat-swatch"
                style={{ backgroundColor: state.colors[idx] }}
                aria-hidden="true"
              />
              <span>Strand {idx + 1}: {stretch}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
