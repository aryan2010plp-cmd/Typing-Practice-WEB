import { useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { useApp, getRank, getLevel, ACHIEVEMENTS } from "@/context/AppContext";
import type { TestResult } from "@/components/TypingEngine";
import { keyErrorScore, keyAccuracy } from "@/utils/stats";
import { Download, Copy, Check, RotateCcw, Flame, Target, Gauge, TrendingUp } from "lucide-react";

interface Props {
  result: TestResult;
  onRestart: () => void;
  onNext: () => void;
}

const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

function scoreColor(score: number): string {
  // 0 = green, 1 = red
  if (score < 0) return "var(--bg-elev)";
  const r = Math.round(255 * Math.min(1, score * 2));
  const g = Math.round(255 * Math.min(1, (1 - score) * 2));
  return `rgb(${r}, ${g}, 80)`;
}

export default function AnalyticsView({ result, onRestart, onNext }: Props) {
  const { stats, prefs } = useApp();
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const rank = getRank(stats.totalXp);
  const level = getLevel(stats.totalXp);
  const levelPct = Math.round((level.into / level.span) * 100);

  const chartData = result.wpmSeries.map((p) => ({ ...p, name: `${p.t}s` }));

  // Build heatmap from all key stats
  const keyMap = stats.keyStats;
  const maxErrors = Math.max(1, ...Object.values(keyMap).map((v) => v.errors));

  const shareText = useMemo(() => {
    return `Keyforge Test — ${result.wpm} WPM | ${result.accuracy}% Acc | ${result.consistency}% Consistency | ${result.mode} mode | Rank: ${rank.title}`;
  }, [result, rank]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const svg = cardRef.current?.querySelector("svg")?.outerHTML;
    if (!svg) return;
    const blob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300">${svg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}</svg>`], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyforge-result.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto px-4 py-6"
    >
      {/* Big stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <BigStat icon={<Gauge size={18} />} label="WPM" value={result.wpm} accent />
        <BigStat icon={<Target size={18} />} label="Accuracy" value={`${result.accuracy}%`} />
        <BigStat icon={<TrendingUp size={18} />} label="Consistency" value={`${result.consistency}%`} />
        <BigStat icon={<Flame size={18} />} label="Raw WPM" value={result.rawWpm} />
      </div>

      {result.quote && (
        <div className="text-center mb-6 font-ui-app">
          <p className="text-sm italic" style={{ color: "var(--fg-muted)" }}>"{result.quote.text}"</p>
          <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>— {result.quote.author}, {result.quote.source}</p>
        </div>
      )}

      {/* WPM chart */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
        <h3 className="font-ui-app text-sm mb-3" style={{ color: "var(--fg-muted)" }}>Performance Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--fg-muted)" fontSize={11} />
            <YAxis stroke="var(--fg-muted)" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--fg-muted)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="wpm" stroke="var(--accent)" strokeWidth={2} dot={false} name="WPM" />
            <Line type="monotone" dataKey="raw" stroke="var(--fg-muted)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Raw WPM" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Key heatmap */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
        <h3 className="font-ui-app text-sm mb-4" style={{ color: "var(--fg-muted)" }}>Key Heatmap (all sessions)</h3>
        <div className="flex flex-col items-center gap-1.5">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1.5" style={{ marginLeft: ri === 1 ? 22 : ri === 2 ? 50 : 0 }}>
              {row.map((k) => {
                const ks = keyMap[k];
                const score = keyErrorScore(ks);
                const acc = keyAccuracy(ks || { correct: 0, errors: 0 });
                return (
                  <div
                    key={k}
                    className="relative group flex items-center justify-center rounded-lg font-mono-app text-sm capitalize"
                    style={{
                      width: 38, height: 38,
                      background: scoreColor(score),
                      color: score > 0.4 ? "white" : "var(--bg)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {k}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap px-2 py-1 rounded text-xs z-10" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--fg)" }}>
                      {ks ? `${acc.toFixed(0)}% acc · ${ks.errors} errs` : "no data"}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 text-[10px] font-ui-app" style={{ color: "var(--fg-muted)" }}>
          <span>100% acc</span>
          <div className="h-2 w-32 rounded-full" style={{ background: "linear-gradient(to right, rgb(80,255,80), rgb(255,255,80), rgb(255,80,80))" }} />
          <span>high error</span>
        </div>
      </div>

      {/* Share card */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div
          ref={cardRef}
          className="w-full max-w-md rounded-2xl p-6 text-center"
          style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
        >
          <div className="text-xs font-ui-app uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>Keyforge Typing Test</div>
          <div className="text-5xl font-mono-app font-bold my-3" style={{ color: "var(--accent)" }}>{result.wpm}<span className="text-lg ml-1" style={{ color: "var(--fg-muted)" }}>WPM</span></div>
          <div className="flex justify-center gap-6 my-4">
            <div>
              <div className="text-xl font-mono-app font-bold" style={{ color: "var(--fg)" }}>{result.accuracy}%</div>
              <div className="text-[10px] font-ui-app" style={{ color: "var(--fg-muted)" }}>accuracy</div>
            </div>
            <div>
              <div className="text-xl font-mono-app font-bold" style={{ color: "var(--fg)" }}>{result.consistency}%</div>
              <div className="text-[10px] font-ui-app" style={{ color: "var(--fg-muted)" }}>consistency</div>
            </div>
            <div>
              <div className="text-xl font-mono-app font-bold" style={{ color: "var(--fg)" }}>{result.mode}</div>
              <div className="text-[10px] font-ui-app" style={{ color: "var(--fg-muted)" }}>mode</div>
            </div>
          </div>
          <div className="text-xs font-ui-app" style={{ color: "var(--accent)" }}>{rank.title}</div>
          <svg width="0" height="0" />
        </div>
        <div className="flex gap-3">
          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 rounded-xl font-ui-app text-sm" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--fg)" }}>
            {copied ? <Check size={14} style={{ color: "var(--success)" }} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl font-ui-app text-sm" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--fg)" }}>
            <Download size={14} /> SVG
          </button>
        </div>
      </div>

      {/* XP & Rank progress */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-ui-app text-sm" style={{ color: "var(--fg)" }}>Level {level.level} · {rank.title}</span>
          <span className="font-mono-app text-xs" style={{ color: "var(--fg-muted)" }}>{stats.totalXp} XP</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elev)" }}>
          <div className="h-full rounded-full" style={{ width: `${levelPct}%`, background: "var(--accent)" }} />
        </div>
        <div className="text-[10px] font-ui-app mt-1" style={{ color: "var(--fg-muted)" }}>{level.into} / {level.span} XP to next level</div>
      </div>

      {/* Achievements */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
        <h3 className="font-ui-app text-sm mb-3" style={{ color: "var(--fg-muted)" }}>Achievements ({stats.achievements.length}/{ACHIEVEMENTS.length})</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = stats.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className="flex flex-col items-center text-center p-2 rounded-lg"
                style={{ background: unlocked ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--bg-elev)", opacity: unlocked ? 1 : 0.4 }}
                title={a.desc}
              >
                <div className="text-lg" style={{ color: unlocked ? "var(--accent)" : "var(--fg-muted)" }}>{a.icon.slice(0, 1)}</div>
                <div className="text-[9px] font-ui-app mt-1 leading-tight" style={{ color: "var(--fg-muted)" }}>{a.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={onRestart} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-ui-app text-sm font-medium" style={{ background: "var(--accent)", color: "var(--bg)" }}>
          <RotateCcw size={14} /> Restart
        </button>
        <button onClick={onNext} className="px-5 py-2.5 rounded-xl font-ui-app text-sm" style={{ background: "var(--bg-elev)", color: "var(--fg)", border: "1px solid var(--border)" }}>
          Next Test
        </button>
      </div>
    </motion.div>
  );
}

function BigStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
      <div style={{ color: accent ? "var(--accent)" : "var(--fg-muted)" }}>{icon}</div>
      <div className="text-3xl font-mono-app font-bold mt-1" style={{ color: accent ? "var(--accent)" : "var(--fg)" }}>{value}</div>
      <div className="text-[10px] font-ui-app uppercase tracking-wider mt-1" style={{ color: "var(--fg-muted)" }}>{label}</div>
    </div>
  );
}
