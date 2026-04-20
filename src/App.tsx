import { useCallback, useEffect, useRef, useState } from 'react';
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

function isValidStrands(val: string): boolean {
  const n = parseInt(val, 10);
  return !isNaN(n) && n >= 2 && n <= 20 && n % 2 === 0;
}

function isValidRows(val: string): boolean {
  const n = parseInt(val, 10);
  return !isNaN(n) && n >= 1 && n <= 100;
}

export default function App() {
  const [state, setState] = useState<BraceletState>(initialState);
  const [jsonInput, setJsonInput] = useState('');
  const [strandsInput, setStrandsInput] = useState(() => String(initialState().numStrands));
  const [rowsInput, setRowsInput] = useState(() => String(initialState().numRows));

  // Sync draft inputs when state changes externally (e.g., after loading JSON)
  useEffect(() => {
    setStrandsInput(String(state.numStrands));
  }, [state.numStrands]);

  useEffect(() => {
    setRowsInput(String(state.numRows));
  }, [state.numRows]);

  const strandsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-apply valid strands value after 500ms
  useEffect(() => {
    if (!isValidStrands(strandsInput)) return;
    if (strandsDebounceRef.current !== null) clearTimeout(strandsDebounceRef.current);
    strandsDebounceRef.current = setTimeout(() => {
      handleNumStrandsChange(parseInt(strandsInput, 10));
      strandsDebounceRef.current = null;
    }, 500);
    return () => {
      if (strandsDebounceRef.current !== null) clearTimeout(strandsDebounceRef.current);
    };
  }, [strandsInput, handleNumStrandsChange]);

  // Auto-apply valid rows value after 500ms
  useEffect(() => {
    if (!isValidRows(rowsInput)) return;
    if (rowsDebounceRef.current !== null) clearTimeout(rowsDebounceRef.current);
    rowsDebounceRef.current = setTimeout(() => {
      handleNumRowsChange(parseInt(rowsInput, 10));
      rowsDebounceRef.current = null;
    }, 500);
    return () => {
      if (rowsDebounceRef.current !== null) clearTimeout(rowsDebounceRef.current);
    };
  }, [rowsInput, handleNumRowsChange]);

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
        <label>
          Strands:
          <input
            type="number"
            min={2}
            max={20}
            step={2}
            value={strandsInput}
            className={isValidStrands(strandsInput) ? undefined : 'input-invalid'}
            onChange={e => setStrandsInput(e.target.value)}
            onBlur={() => {
              if (isValidStrands(strandsInput)) {
                handleNumStrandsChange(parseInt(strandsInput, 10));
              } else {
                setStrandsInput(String(state.numStrands));
              }
            }}
          />
        </label>
        <label>
          Rows:
          <input
            type="number"
            min={1}
            max={100}
            value={rowsInput}
            className={isValidRows(rowsInput) ? undefined : 'input-invalid'}
            onChange={e => setRowsInput(e.target.value)}
            onBlur={() => {
              if (isValidRows(rowsInput)) {
                handleNumRowsChange(parseInt(rowsInput, 10));
              } else {
                setRowsInput(String(state.numRows));
              }
            }}
          />
        </label>
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
