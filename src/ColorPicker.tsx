import { createSignal, Show } from "solid-js";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return [h, s * 100, l * 100];
}

export default function ColorPicker(props: ColorPickerProps) {
  const [open, setOpen] = createSignal(false);
  const [hsl, setHsl] = createSignal<[number, number, number]>(
    hexToHsl(props.color)
  );

  const updateColor = (h: number, s: number, l: number) => {
    setHsl([h, s, l]);
    props.onChange(hslToHex(h, s, l));
  };

  const handleHueClick = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    const h = (angle + 360) % 360;
    const [, s, l] = hsl();
    updateColor(h, s, l);
  };

  const handleSLClick = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = x * 100;
    const l = (1 - y) * 100;
    const [h] = hsl();
    updateColor(h, s, l);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          width: "28px",
          height: "28px",
          "border-radius": "50%",
          background: props.color,
          border: "2px solid var(--border-color)",
          cursor: "pointer",
        }}
        onClick={() => {
          setHsl(hexToHsl(props.color));
          setOpen(!open());
        }}
      />
      <Show when={open()}>
        <div
          style={{
            position: "absolute",
            top: "34px",
            left: "50%",
            transform: "translateX(-50%)",
            "z-index": "1000",
            background: "var(--bg-color)",
            border: "1px solid var(--border-color)",
            "border-radius": "8px",
            padding: "12px",
            "box-shadow": "0 4px 12px rgba(0,0,0,0.3)",
            "min-width": "160px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hue wheel */}
          <div
            style={{
              width: "120px",
              height: "120px",
              "border-radius": "50%",
              background:
                "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
              margin: "0 auto 12px",
              cursor: "crosshair",
              position: "relative",
            }}
            onClick={handleHueClick}
          >
            <div
              style={{
                position: "absolute",
                width: "60px",
                height: "60px",
                "border-radius": "50%",
                background: "var(--bg-color)",
                top: "30px",
                left: "30px",
              }}
            />
            {/* Hue indicator */}
            <div
              style={{
                position: "absolute",
                width: "8px",
                height: "8px",
                "border-radius": "50%",
                background: "white",
                border: "2px solid black",
                top: `${50 - 40 * Math.sin((hsl()[0] * Math.PI) / 180)}%`,
                left: `${50 + 40 * Math.cos((hsl()[0] * Math.PI) / 180)}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
          {/* Saturation/Lightness square */}
          <div
            style={{
              width: "120px",
              height: "80px",
              margin: "0 auto",
              cursor: "crosshair",
              position: "relative",
              background: `linear-gradient(to bottom, white, transparent, black), linear-gradient(to right, gray, hsl(${hsl()[0]}, 100%, 50%))`,
              "border-radius": "4px",
              border: "1px solid var(--border-color)",
            }}
            onClick={handleSLClick}
          >
            {/* SL indicator */}
            <div
              style={{
                position: "absolute",
                width: "8px",
                height: "8px",
                "border-radius": "50%",
                background: "white",
                border: "2px solid black",
                left: `${hsl()[1]}%`,
                top: `${100 - hsl()[2]}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
          <button
            style={{
              display: "block",
              margin: "8px auto 0",
              padding: "4px 12px",
              cursor: "pointer",
              "border-radius": "4px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-color)",
              color: "var(--text-color)",
            }}
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      </Show>
    </div>
  );
}
