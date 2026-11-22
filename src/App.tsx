import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Keyboard, Settings, Command, Sparkles, Gamepad2, Trophy, Zap, Moon, Sun, BookOpen,
  FileText, Code2, Target, Clock, Type, Flame,
} from "lucide-react";
import { AppProvider, useApp, getRank, getLevel, ACHIEVEMENTS, type ModeId, type ArcadeId } from "@/context/AppContext";
import TypingEngine, { type TestResult } from "@/components/TypingEngine";
import GhostRace from "@/components/GhostRace";
import AnalyticsView from "@/components/AnalyticsView";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import CommandPalette from "@/components/CommandPalette";
import ArcadeMode from "@/components/ArcadeMode";

function Shell() {
  const { prefs, setPrefs, setTestPrefs, stats, newlyUnlocked, clearUnlocked } = useApp();
  const [result, setResult] = useState<TestResult | null>(null);
  const [restartSignal, setRestartSignal] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [arcade, setArcade] = useState<ArcadeId>(null);
  const [customText, setCustomText] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const rank = getRank(stats.totalXp);
  const level = getLevel(stats.totalXp);

  // Esc toggles command palette (handled globally here, TypingEngine also calls onEsc)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !arcade) {
        if (result) { setResult(null); return; }
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arcade, result]);

  const handleComplete = useCallback((r: TestResult) => {
    setResult(r);
  }, []);

  const handleRestart = useCallback(() => {
    setResult(null);
    setRestartSignal((s) => s + 1);
  }, []);

  const handleNext = useCallback(() => {
    setResult(null);
    setRestartSignal((s) => s + 1);
  }, []);

  const triggerRestart = () => {
    setResult(null);
    setRestartSignal((s) => s + 1);
  };

  const t = prefs.test;

  const modeTabs: { id: ModeId; label: string; icon: React.ReactNode }[] = [
    { id: "time", label: "Time", icon: <Clock size={14} /> },
    { id: "words", label: "Words", icon: <Type size={14} /> },
    { id: "quote", label: "Quote", icon: <BookOpen size={14} /> },
    { id: "code", label: "Code", icon: <Code2 size={14} /> },
    { id: "weakness", label: "Weakness", icon: <Target size={14} /> },
    { id: "custom", label: "Custom", icon: <FileText size={14} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ color: "var(--fg)" }}>
      {/* Header */}
      <AnimatePresence>
        {!prefs.zenMode && !arcade && (
          <motion.header
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Keyboard size={22} style={{ color: "var(--accent)" }} />
              <span className="font-ui-app font-bold text-lg" style={{ color: "var(--fg)" }}>Keyforge</span>
              <span className="text-[10px] font-ui-app px-2 py-0.5 rounded-full ml-1" style={{ background: "var(--bg-elev)", color: "var(--fg-muted)" }}>v1.0</span>
            </div>

            <div className="flex items-center gap-4">
              {/* XP / Level */}
              <div className="hidden md:flex items-center gap-2 text-xs font-ui-app" style={{ color: "var(--fg-muted)" }}>
                <Sparkles size={14} style={{ color: "var(--accent)" }} />
                <span>Lv {level.level}</span>
                <span style={{ color: "var(--fg)" }}>{rank.title}</span>
              </div>
              {/* Streak */}
              <div className="flex items-center gap-1 text-xs font-ui-app" style={{ color: "var(--fg-muted)" }}>
                <Flame size={14} style={{ color: "var(--accent)" }} />
                <span>{stats.dailyStreak}d</span>
              </div>

              <button
                onClick={() => setArcade("rain")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui-app text-xs"
                style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                title="Arcade"
              >
                <Gamepad2 size={14} /> Arcade
              </button>
              <button
                onClick={() => setPrefs({ zenMode: !prefs.zenMode })}
                className="p-2 rounded-lg" style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                title="Zen mode"
              >
                {prefs.zenMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui-app text-xs"
                style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                title="Command palette (Esc)"
              >
                <Command size={14} /> Cmd
                <kbd className="text-[9px] opacity-60">Esc</kbd>
              </button>
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="p-2 rounded-lg" style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && !prefs.zenMode && !arcade && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <SettingsPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center relative" style={{ minHeight: "70vh" }}>
        {arcade ? (
          <div className="w-full max-w-5xl mx-auto px-4 py-6">
            <ArcadeMode
              mode={arcade === "suddendeath" ? "suddendeath" : "rain"}
              onExit={() => setArcade(null)}
            />
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={() => setArcade("rain")} className="px-4 py-2 rounded-xl font-ui-app text-sm" style={{ background: arcade === "rain" ? "var(--accent)" : "var(--bg-elev)", color: arcade === "rain" ? "var(--bg)" : "var(--fg-muted)", border: "1px solid var(--border)" }}>Word Rain</button>
              <button onClick={() => setArcade("suddendeath")} className="px-4 py-2 rounded-xl font-ui-app text-sm" style={{ background: arcade === "suddendeath" ? "var(--error)" : "var(--bg-elev)", color: arcade === "suddendeath" ? "white" : "var(--fg-muted)", border: "1px solid var(--border)" }}>Sudden Death</button>
            </div>
          </div>
        ) : result ? (
          <AnalyticsView result={result} onRestart={handleRestart} onNext={handleNext} />
        ) : (
          <>
            {/* Mode tabs + config bar */}
            {!prefs.zenMode && (
              <div className="w-full max-w-5xl mx-auto px-4 pt-4">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                  {modeTabs.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        if (m.id === "custom" && !customText) { setShowCustomModal(true); }
                        setTestPrefs({ mode: m.id });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui-app text-xs transition"
                      style={{
                        background: t.mode === m.id ? "var(--accent)" : "var(--bg-elev)",
                        color: t.mode === m.id ? "var(--bg)" : "var(--fg-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                {/* Mode-specific config */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-4 text-xs font-ui-app">
                  {t.mode === "time" && (
                    <SegmentGroup
                      options={[15, 30, 60, 120]}
                      value={t.timeSeconds}
                      onChange={(v) => setTestPrefs({ timeSeconds: v as number })}
                      suffix="s"
                    />
                  )}
                  {t.mode === "words" && (
                    <SegmentGroup
                      options={[10, 25, 50, 100]}
                      value={t.wordCount}
                      onChange={(v) => setTestPrefs({ wordCount: v as number })}
                      suffix=""
                    />
                  )}
                  {t.mode === "quote" && (
                    <SegmentGroup
                      options={["short", "medium", "long"]}
                      value={t.quoteLength}
                      onChange={(v) => setTestPrefs({ quoteLength: v as "short" | "medium" | "long" })}
                      suffix=""
                      capitalize
                    />
                  )}
                  {t.mode === "code" && (
                    <SegmentGroup
                      options={["random", "JavaScript", "TypeScript", "Python", "HTML/CSS", "C++", "SQL"]}
                      value={t.codeLang}
                      onChange={(v) => setTestPrefs({ codeLang: v as string })}
                      suffix=""
                    />
                  )}
                  {(t.mode === "time" || t.mode === "words") && (
                    <>
                      <SegmentGroup
                        options={["common", "indian", "hinglish"]}
                        value={t.pack}
                        onChange={(v) => setTestPrefs({ pack: v as "common" | "indian" | "hinglish" })}
                        suffix=""
                        capitalize
                      />
                      <ToggleChip label="Punctuation" on={t.punctuation} onClick={() => setTestPrefs({ punctuation: !t.punctuation })} />
                      <ToggleChip label="Numbers" on={t.numbers} onClick={() => setTestPrefs({ numbers: !t.numbers })} />
                    </>
                  )}
                  {/* Ghost pacemaker */}
                  <SegmentGroup
                    options={[0, 40, 60, 80, 100, 120]}
                    value={t.ghostWpm}
                    onChange={(v) => setTestPrefs({ ghostWpm: v as number })}
                    prefix="Ghost "
                    suffix=""
                    zeroLabel="off"
                  />
                  {t.mode === "custom" && (
                    <button onClick={() => setShowCustomModal(true)} className="px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>Edit custom text</button>
                  )}
                </div>
              </div>
            )}

            {/* Ghost race */}
            <GhostRace
              active={t.ghostWpm > 0 && !result}
              targetWpm={t.ghostWpm}
              userProgress={0}
              duration={t.mode === "time" ? t.timeSeconds : 60}
            />

            {/* Typing engine */}
            <TypingEngine
              onComplete={handleComplete}
              onRestart={handleRestart}
              onEsc={() => setPaletteOpen(true)}
              signalRestart={restartSignal}
              customText={customText}
              zen={prefs.zenMode}
            />

            {/* Virtual keyboard */}
            {prefs.showKeyboard && !prefs.zenMode && (
              <div className="w-full max-w-3xl mx-auto px-4 mt-4">
                <VirtualKeyboard showFingerGuide />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <AnimatePresence>
        {!prefs.zenMode && !arcade && (
          <motion.footer
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-4 px-6 py-3 border-t text-[10px] font-ui-app"
            style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
          >
            <span className="flex items-center gap-1"><Trophy size={11} /> {stats.achievements.length}/{ACHIEVEMENTS.length} badges</span>
            <span className="flex items-center gap-1"><Zap size={11} /> Best: {stats.bestWpm} WPM</span>
            <span>Tab+Enter to restart · Esc for commands</span>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Command palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Custom text modal */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCustomModal(false)}
          >
            <motion.div
              className="w-full max-w-xl rounded-2xl p-5"
              style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-ui-app font-bold mb-3" style={{ color: "var(--fg)" }}>Custom Text</h3>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste text or upload a .txt file to practice..."
                className="w-full h-40 rounded-xl p-3 font-mono-app text-sm resize-none outline-none"
                style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", color: "var(--fg)" }}
              />
              <div className="flex items-center justify-between mt-3">
                <label className="text-xs font-ui-app cursor-pointer px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-soft)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>
                  Upload .txt
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => setCustomText(String(reader.result || ""));
                      reader.readAsText(f);
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setShowCustomModal(false)} className="px-4 py-2 rounded-xl font-ui-app text-sm" style={{ background: "var(--bg-soft)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>Cancel</button>
                  <button
                    onClick={() => { if (customText.trim()) { setTestPrefs({ mode: "custom" }); setShowCustomModal(false); triggerRestart(); } }}
                    className="px-4 py-2 rounded-xl font-ui-app text-sm font-medium"
                    style={{ background: "var(--accent)", color: "var(--bg)" }}
                  >Practice</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement toast */}
      <AnimatePresence>
        {newlyUnlocked.length > 0 && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
            style={{ background: "var(--bg-elev)", border: "1px solid var(--accent)" }}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            onClick={clearUnlocked}
          >
            <Trophy size={20} style={{ color: "var(--accent)" }} />
            <div>
              <div className="font-ui-app text-sm font-bold" style={{ color: "var(--fg)" }}>Achievement Unlocked!</div>
              <div className="font-ui-app text-xs" style={{ color: "var(--fg-muted)" }}>
                {newlyUnlocked.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name).join(", ")}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SegmentGroup({
  options, value, onChange, suffix, prefix, capitalize, zeroLabel,
}: {
  options: (string | number)[];
  value: string | number;
  onChange: (v: string | number) => void;
  suffix?: string;
  prefix?: string;
  capitalize?: boolean;
  zeroLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
      {options.map((o) => {
        const active = value === o;
        const label = o === 0 && zeroLabel ? zeroLabel : `${prefix || ""}${capitalize ? String(o).charAt(0).toUpperCase() + String(o).slice(1) : o}${suffix || ""}`;
        return (
          <button
            key={String(o)}
            onClick={() => onChange(o)}
            className="px-2.5 py-1 rounded-md font-ui-app transition"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--bg)" : "var(--fg-muted)",
              fontSize: 11,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-ui-app transition"
      style={{
        background: on ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--bg-soft)",
        color: on ? "var(--accent)" : "var(--fg-muted)",
        border: "1px solid var(--border)",
        fontSize: 11,
      }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: on ? "var(--accent)" : "var(--fg-subtle)" }} />
      {label}
    </button>
  );
}

function SettingsPanel() {
  const { prefs, setPrefs } = useApp();
  const themes: { id: string; label: string; preview: string }[] = [
    { id: "obsidian", label: "Obsidian", preview: "#181818" },
    { id: "paper", label: "Paper", preview: "#f5f1e8" },
    { id: "cyberpunk", label: "Cyberpunk", preview: "#0d001a" },
    { id: "matrix", label: "Matrix", preview: "#000000" },
    { id: "matcha", label: "Matcha", preview: "#e8eae0" },
    { id: "dracula", label: "Dracula", preview: "#282a36" },
  ];

  return (
    <div className="px-6 py-4 flex flex-wrap items-center justify-center gap-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-ui-app" style={{ color: "var(--fg-muted)" }}>Theme</span>
        <div className="flex gap-1.5">
          {themes.map((th) => (
            <button
              key={th.id}
              onClick={() => setPrefs({ theme: th.id as typeof prefs.theme })}
              className="w-7 h-7 rounded-full border-2 transition"
              style={{
                background: th.preview,
                borderColor: prefs.theme === th.id ? "var(--accent)" : "var(--border)",
              }}
              title={th.label}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-ui-app" style={{ color: "var(--fg-muted)" }}>Font</span>
        <SegmentGroup options={["jetbrains", "fira", "roboto", "inter"]} value={prefs.font} onChange={(v) => setPrefs({ font: v as typeof prefs.font })} capitalize />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-ui-app" style={{ color: "var(--fg-muted)" }}>Size</span>
        <SegmentGroup options={["S", "M", "L", "XL"]} value={prefs.fontSize} onChange={(v) => setPrefs({ fontSize: v as typeof prefs.fontSize })} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-ui-app" style={{ color: "var(--fg-muted)" }}>Caret</span>
        <SegmentGroup options={["bar", "block", "underline"]} value={prefs.caret} onChange={(v) => setPrefs({ caret: v as typeof prefs.caret })} capitalize />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-ui-app" style={{ color: "var(--fg-muted)" }}>Sound</span>
        <SegmentGroup
          options={["off", "blue", "brown", "topre", "typewriter"]}
          value={prefs.sound}
          onChange={(v) => setPrefs({ sound: v as typeof prefs.sound })}
          capitalize
        />
      </div>

      <div className="flex items-center gap-3">
        <ToggleChip label="Virtual Keyboard" on={prefs.showKeyboard} onClick={() => setPrefs({ showKeyboard: !prefs.showKeyboard })} />
        <ToggleChip label="Hide Stats Typing" on={prefs.hideStatsWhileTyping} onClick={() => setPrefs({ hideStatsWhileTyping: !prefs.hideStatsWhileTyping })} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
