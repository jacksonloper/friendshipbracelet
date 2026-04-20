import { createSignal, createMemo, For } from "solid-js";
import type { BraceletState, KnotType } from "./bracelet";
import {
  computeStrandColors,
  cycleKnot,
  generateDefaultKnots,
  defaultColors,
  knotsInRow,
  stateToJSON,
  jsonToState,
} from "./bracelet";
import KnotDiagram from "./KnotDiagram";
import PatternView from "./PatternView";
import ColorPicker from "./ColorPicker";

export default function App() {
  const [numStrands, setNumStrands] = createSignal(6);
  const [numRows, setNumRows] = createSignal(4);
  const [colors, setColors] = createSignal<string[]>(defaultColors());
  const [knots, setKnots] = createSignal<KnotType[][]>(
    generateDefaultKnots(4, 6)
  );
  const [jsonInput, setJsonInput] = createSignal("");
  const [copyMsg, setCopyMsg] = createSignal("");

  const strandColors = createMemo(() =>
    computeStrandColors(colors(), knots(), numRows(), numStrands())
  );

  const handleKnotClick = (row: number, col: number) => {
    setKnots((prev) => {
      const newKnots = prev.map((r) => [...r]);
      if (newKnots[row] && col < newKnots[row].length) {
        newKnots[row][col] = cycleKnot(newKnots[row][col]);
      }
      return newKnots;
    });
  };

  const handleStrandsChange = (newCount: number) => {
    if (newCount < 4 || newCount % 2 !== 0) return;
    const currentColors = colors();
    let newColors: string[];
    if (newCount > currentColors.length) {
      // Add colors by cycling hue
      newColors = [...currentColors];
      for (let i = currentColors.length; i < newCount; i++) {
        const hue = (i * 360) / newCount;
        newColors.push(`hsl(${hue}, 80%, 50%)`);
      }
    } else {
      newColors = currentColors.slice(0, newCount);
    }
    setColors(newColors);
    setNumStrands(newCount);
    setKnots(generateDefaultKnots(numRows(), newCount));
  };

  const handleRowsChange = (newCount: number) => {
    if (newCount < 1) return;
    const currentKnots = knots();
    const ns = numStrands();
    let newKnots: KnotType[][];
    if (newCount > currentKnots.length) {
      newKnots = [...currentKnots];
      for (let r = currentKnots.length; r < newCount; r++) {
        const nk = knotsInRow(r, ns);
        newKnots.push(Array(nk).fill("FF") as KnotType[]);
      }
    } else {
      newKnots = currentKnots.slice(0, newCount);
    }
    setNumRows(newCount);
    setKnots(newKnots);
  };

  const handleColorChange = (index: number, color: string) => {
    setColors((prev) => {
      const next = [...prev];
      next[index] = color;
      return next;
    });
  };

  const handleCopyJSON = () => {
    const state: BraceletState = {
      numStrands: numStrands(),
      numRows: numRows(),
      colors: colors(),
      knots: knots(),
    };
    navigator.clipboard.writeText(stateToJSON(state)).then(() => {
      setCopyMsg("Copied!");
      setTimeout(() => setCopyMsg(""), 2000);
    });
  };

  const handleLoadJSON = () => {
    const state = jsonToState(jsonInput());
    if (state) {
      setNumStrands(state.numStrands);
      setNumRows(state.numRows);
      setColors(state.colors);
      setKnots(state.knots);
      setJsonInput("");
    } else {
      alert("Invalid JSON format");
    }
  };

  return (
    <div class="app-container">
      <h1>Friendship Bracelet Designer</h1>

      {/* Controls */}
      <div class="controls">
        <label>
          Strands:
          <select
            value={numStrands()}
            onChange={(e) =>
              handleStrandsChange(parseInt(e.currentTarget.value))
            }
          >
            <For each={[4, 6, 8, 10, 12, 14, 16]}>
              {(n) => <option value={n}>{n}</option>}
            </For>
          </select>
        </label>
        <label>
          Rows:
          <input
            type="number"
            min="1"
            max="50"
            value={numRows()}
            onChange={(e) => handleRowsChange(parseInt(e.currentTarget.value))}
            style={{ width: "60px" }}
          />
        </label>
      </div>

      {/* Color swatches */}
      <div class="color-row">
        <For each={colors()}>
          {(color, idx) => (
            <ColorPicker
              color={color}
              onChange={(c) => handleColorChange(idx(), c)}
            />
          )}
        </For>
      </div>

      {/* Knot diagram */}
      <div class="diagram-section">
        <KnotDiagram
          numStrands={numStrands()}
          numRows={numRows()}
          knots={knots()}
          strandColors={strandColors()}
          onKnotClick={handleKnotClick}
        />
      </div>

      {/* Pattern preview */}
      <PatternView
        numStrands={numStrands()}
        numRows={numRows()}
        knots={knots()}
        strandColors={strandColors()}
      />

      {/* JSON controls */}
      <div class="json-section">
        <button onClick={handleCopyJSON}>
          Copy JSON {copyMsg() && <span>✓ {copyMsg()}</span>}
        </button>
        <div class="json-import">
          <textarea
            placeholder="Paste JSON here to load..."
            value={jsonInput()}
            onInput={(e) => setJsonInput(e.currentTarget.value)}
            rows={3}
          />
          <button onClick={handleLoadJSON}>Load JSON</button>
        </div>
      </div>
    </div>
  );
}
