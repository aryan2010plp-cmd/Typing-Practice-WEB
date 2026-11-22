import { useEffect, useState } from "react";

interface Props {
  nextKey?: string; // the next required character
  pressedKey?: string | null;
  showFingerGuide?: boolean;
}

// QWERTY layout rows
const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

// Finger color assignments (touch typing)
const FINGER_COLORS: Record<string, string> = {
  // left pinky
  q: "#ef4444", a: "#ef4444", z: "#ef4444",
  // left ring
  w: "#f59e0b", s: "#f59e0b", x: "#f59e0b",
  // left middle
  e: "#eab308", d: "#eab308", c: "#eab308",
  // left index
  r: "#22c55e", f: "#22c55e", v: "#22c55e", t: "#22c55e", g: "#22c55e", b: "#22c55e",
  // right index
  y: "#06b6d4", h: "#06b6d4", n: "#06b6d4", u: "#06b6d4", j: "#06b6d4", m: "#06b6d4",
  // right middle
  i: "#3b82f6", k: "#3b82f6", ",": "#3b82f6",
  // right ring
  o: "#8b5cf6", l: "#8b5cf6", ".": "#8b5cf6",
  // right pinky
  p: "#ec4899", ";": "#ec4899", "/": "#ec4899",
};

export default function VirtualKeyboard({ nextKey, pressedKey, showFingerGuide = true }: Props) {
  const [recentPress, setRecentPress] = useState<string | null>(null);

  useEffect(() => {
    if (pressedKey) {
      setRecentPress(pressedKey.toLowerCase());
      const t = setTimeout(() => setRecentPress(null), 150);
      return () => clearTimeout(t);
    }
  }, [pressedKey]);

  const renderRow = (row: string[], offset: number) => (
    <div className="flex gap-1.5 justify-center" style={{ marginLeft: offset }}>
      {row.map((k) => {
        const isNext = nextKey?.toLowerCase() === k;
        const isPressed = recentPress === k;
        const fingerColor = FINGER_COLORS[k];
        return (
          <div
            key={k}
            className="relative flex items-center justify-center rounded-lg font-mono-app text-sm transition-all duration-100"
            style={{
              width: 40,
              height: 40,
              background: isPressed
                ? "var(--accent)"
                : isNext
                ? "color-mix(in srgb, var(--accent) 30%, var(--bg-elev))"
                : "var(--bg-elev)",
              color: isPressed ? "var(--bg)" : "var(--fg)",
              border: isNext ? "2px solid var(--accent)" : "1px solid var(--border)",
              boxShadow: isPressed ? "0 0 16px var(--accent)" : "none",
              transform: isPressed ? "translateY(2px)" : "translateY(0)",
            }}
          >
            {k.toUpperCase()}
            {showFingerGuide && fingerColor && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                style={{ width: 8, height: 3, background: fingerColor, opacity: 0.8 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1.5 py-4">
      {renderRow(ROWS[0], 0)}
      {renderRow(ROWS[1], 24)}
      {renderRow(ROWS[2], 56)}
      <div className="flex gap-1.5 justify-center" style={{ marginTop: 2 }}>
        <div
          className="flex items-center justify-center rounded-lg font-mono-app text-xs"
          style={{ width: 200, height: 40, background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}
        >
          space
        </div>
      </div>
      {showFingerGuide && (
        <div className="flex flex-wrap gap-2 justify-center mt-2 text-[10px] font-ui-app" style={{ color: "var(--fg-muted)" }}>
          {[
            ["L Pinky", "#ef4444"], ["L Ring", "#f59e0b"], ["L Middle", "#eab308"], ["L Index", "#22c55e"],
            ["R Index", "#06b6d4"], ["R Middle", "#3b82f6"], ["R Ring", "#8b5cf6"], ["R Pinky", "#ec4899"],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
