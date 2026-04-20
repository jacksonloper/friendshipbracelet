import { useState, useRef, useCallback, useEffect } from 'react';

interface ColorPickerProps {
  currentColor: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;

  return [h, s, l];
}

export default function ColorPicker({ currentColor, onChange, onClose }: ColorPickerProps) {
  const [hsl, setHsl] = useState<[number, number, number]>(() => hexToHsl(currentColor));
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const lsCanvasRef = useRef<HTMLCanvasElement>(null);

  const [hue, sat, light] = hsl;

  // Draw hue wheel
  useEffect(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const size = 200;
    const center = size / 2;
    const outerR = size / 2 - 5;
    const innerR = outerR - 25;

    ctx.clearRect(0, 0, size, size);

    // Draw hue ring
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(center, center, outerR, startAngle, endAngle);
      ctx.arc(center, center, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    // Draw indicator
    const indicatorAngle = (hue - 90) * Math.PI / 180;
    const indicatorR = (outerR + innerR) / 2;
    const ix = center + indicatorR * Math.cos(indicatorAngle);
    const iy = center + indicatorR * Math.sin(indicatorAngle);
    ctx.beginPath();
    ctx.arc(ix, iy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue]);

  // Draw saturation/lightness square
  useEffect(() => {
    const canvas = lsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = 200;
    const h = 80;

    ctx.clearRect(0, 0, w, h);

    // Top half: saturation (full lightness)
    for (let x = 0; x < w; x++) {
      const s = x / w;
      const l = 0.5; // middle lightness for saturation display
      ctx.fillStyle = hslToHex(hue, s, l);
      ctx.fillRect(x, 0, 1, h / 2);
    }

    // Bottom half: lightness (full saturation)
    for (let x = 0; x < w; x++) {
      const l = x / w;
      ctx.fillStyle = hslToHex(hue, sat, l);
      ctx.fillRect(x, h / 2, 1, h / 2);
    }

    // Draw indicators
    // Saturation indicator
    const sx = sat * w;
    ctx.beginPath();
    ctx.arc(sx, h / 4, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lightness indicator
    const lx = light * w;
    ctx.beginPath();
    ctx.arc(lx, h * 3 / 4, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hue, sat, light]);

  const handleHueClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 100;
    const y = e.clientY - rect.top - 100;
    const angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    const newHue = ((angle % 360) + 360) % 360;
    const newHsl: [number, number, number] = [newHue, sat, light];
    setHsl(newHsl);
    onChange(hslToHex(newHue, sat, light));
  }, [sat, light, onChange]);

  const handleLSClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = lsCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = 200;
    const h = 80;

    if (y < h / 2) {
      // Saturation
      const newSat = Math.max(0, Math.min(1, x / w));
      const newHsl: [number, number, number] = [hue, newSat, light];
      setHsl(newHsl);
      onChange(hslToHex(hue, newSat, light));
    } else {
      // Lightness
      const newLight = Math.max(0, Math.min(1, x / w));
      const newHsl: [number, number, number] = [hue, sat, newLight];
      setHsl(newHsl);
      onChange(hslToHex(hue, sat, newLight));
    }
  }, [hue, sat, light, onChange]);

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker-modal" onClick={e => e.stopPropagation()}>
        <canvas
          ref={hueCanvasRef}
          width={200}
          height={200}
          className="hue-wheel"
          onClick={handleHueClick}
        />
        <canvas
          ref={lsCanvasRef}
          width={200}
          height={80}
          className="lightness-square"
          onClick={handleLSClick}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="color-preview"
            style={{ background: hslToHex(hue, sat, light) }}
          />
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
