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
  stateToJSON,
  stateFromJSON,
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

export default function App() {
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

      // If lock pattern is on, propagate to rows with same parity that are offset by 2
      if (prev.lockPattern) {
        for (let r = row % 2; r < prev.numRows; r += 2) {
          if (r !== row && (r % 2 === row % 2)) {
            // same position in the repeating pattern
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
      return {
        ...prev,
        numStrands: n,
        colors,
        knots: generateDefaultKnots(n, prev.numRows),
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
          // When lock is on, copy from the source row (row 0 for even, row 1 for odd)
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
  }, [state.numStrands, state.numRows]);

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
  }, [dialogType, dialogValue, handleNumStrandsChange, handleNumRowsChange, closeDialog]);

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
      // When enabling lock, enforce pattern: copy row 0 to all even rows, row 1 to all odd rows
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

  return (
    <div>
      <h1>Friendship Bracelet Designer</h1>

      {/* Controls */}
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
      </div>

      {/* Strand/row edit dialog */}
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

      {/* Strand color selectors */}
      <div className="strand-colors">
        {state.colors.map((color, idx) => (
          <input
            key={idx}
            type="color"
            value={color}
            onChange={(e) => handleColorChange(idx, e.target.value)}
            className="strand-color-btn"
            aria-label={`Change color of strand ${idx + 1}`}
            title={`Strand ${idx + 1}`}
          />
        ))}
      </div>

      {/* Knot diagram */}
      <KnotDiagram
        state={state}
        strandOrder={strandOrder}
        onKnotClick={handleKnotClick}
      />

      {/* Pattern display */}
      <PatternDisplay pattern={pattern} />
    </div>
  );
}
