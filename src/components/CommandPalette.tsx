import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft } from "lucide-react";
import { useApp, type ThemeId, type ModeId, type FontId, type FontSize, type CaretStyle } from "@/context/AppContext";
import type { SoundProfile } from "@/utils/soundEngine";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  category: string;
  action: () => void;
  keywords?: string;
}

export default function CommandPalette({ open, onClose }: Props) {
  const { prefs, setPrefs, setTestPrefs } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    const modes: { id: ModeId; label: string }[] = [
      { id: "time", label: "Time Test" },
      { id: "words", label: "Word Count Test" },
      { id: "quote", label: "Quote Mode" },
      { id: "code", label: "Developer Code Mode" },
      { id: "weakness", label: "AI Weakness Drill" },
      { id: "custom", label: "Custom Text" },
    ];
    modes.forEach((m) =>
      cmds.push({
        id: `mode-${m.id}`,
        label: m.label,
        category: "Mode",
        action: () => setTestPrefs({ mode: m.id }),
      })
    );

    const themes: { id: ThemeId; label: string }[] = [
      { id: "obsidian", label: "Obsidian Amber" },
      { id: "paper", label: "Crisp Paper" },
      { id: "cyberpunk", label: "Cyberpunk Neon" },
      { id: "matrix", label: "Matrix Terminal" },
      { id: "matcha", label: "Matcha Calm" },
      { id: "dracula", label: "Dracula" },
    ];
    themes.forEach((th) =>
      cmds.push({
        id: `theme-${th.id}`,
        label: th.label,
        category: "Theme",
        action: () => setPrefs({ theme: th.id }),
      })
    );

    const sounds: { id: SoundProfile; label: string }[] = [
      { id: "off", label: "Sound Off" },
      { id: "blue", label: "Cherry MX Blue (Clicky)" },
      { id: "brown", label: "Cherry MX Brown (Tactile)" },
      { id: "topre", label: "Topre (Thocky)" },
      { id: "typewriter", label: "Typewriter" },
    ];
    sounds.forEach((s) =>
      cmds.push({
        id: `sound-${s.id}`,
        label: s.label,
        category: "Sound",
        action: () => setPrefs({ sound: s.id }),
      })
    );

    const fonts: { id: FontId; label: string }[] = [
      { id: "jetbrains", label: "JetBrains Mono" },
      { id: "fira", label: "Fira Code" },
      { id: "roboto", label: "Roboto Mono" },
      { id: "inter", label: "Inter" },
    ];
    fonts.forEach((f) =>
      cmds.push({ id: `font-${f.id}`, label: f.label, category: "Font", action: () => setPrefs({ font: f.id }) })
    );

    const sizes: FontSize[] = ["S", "M", "L", "XL"];
    sizes.forEach((s) =>
      cmds.push({ id: `size-${s}`, label: `Font Size ${s}`, category: "Font", action: () => setPrefs({ fontSize: s }) })
    );

    const carets: CaretStyle[] = ["bar", "block", "underline"];
    carets.forEach((c) =>
      cmds.push({ id: `caret-${c}`, label: `Caret: ${c}`, category: "Appearance", action: () => setPrefs({ caret: c }) })
    );

    cmds.push({ id: "toggle-keyboard", label: "Toggle Virtual Keyboard", category: "View", action: () => setPrefs({ showKeyboard: !prefs.showKeyboard }) });
    cmds.push({ id: "toggle-hud", label: "Toggle Live HUD", category: "View", action: () => setPrefs({ showHud: !prefs.showHud }) });
    cmds.push({ id: "toggle-zen", label: "Toggle Zen Mode", category: "View", action: () => setPrefs({ zenMode: !prefs.zenMode }) });
    cmds.push({ id: "toggle-hide-stats", label: "Toggle Hide Stats While Typing", category: "View", action: () => setPrefs({ hideStatsWhileTyping: !prefs.hideStatsWhileTyping }) });

    const times = [15, 30, 60, 120];
    times.forEach((tm) =>
      cmds.push({ id: `time-${tm}`, label: `Time: ${tm}s`, category: "Test Config", action: () => setTestPrefs({ mode: "time", timeSeconds: tm }) })
    );
    const wcs = [10, 25, 50, 100];
    wcs.forEach((w) =>
      cmds.push({ id: `words-${w}`, label: `Words: ${w}`, category: "Test Config", action: () => setTestPrefs({ mode: "words", wordCount: w }) })
    );

    cmds.push({ id: "toggle-punct", label: `Punctuation: ${prefs.test.punctuation ? "On" : "Off"}`, category: "Test Config", action: () => setTestPrefs({ punctuation: !prefs.test.punctuation }) });
    cmds.push({ id: "toggle-numbers", label: `Numbers: ${prefs.test.numbers ? "On" : "Off"}`, category: "Test Config", action: () => setTestPrefs({ numbers: !prefs.test.numbers }) });

    return cmds;
  }, [prefs, setPrefs, setTestPrefs]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter((c) => (c.label + " " + c.category + " " + (c.keywords || "")).toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open) { setQuery(""); }
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[selected]) { filtered[selected].action(); onClose(); } }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
            initial={{ scale: 0.95, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <Search size={18} style={{ color: "var(--fg-muted)" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search commands, themes, sounds..."
                className="flex-1 bg-transparent outline-none font-ui-app text-sm"
                style={{ color: "var(--fg)" }}
              />
              <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}>esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-sm font-ui-app" style={{ color: "var(--fg-muted)" }}>No commands found</div>
              )}
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => { c.action(); onClose(); }}
                  className="w-full flex items-center justify-between px-4 py-2 text-left transition"
                  style={{ background: i === selected ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent" }}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "var(--bg-soft)", color: "var(--fg-muted)" }}>{c.category}</span>
                    <span className="font-ui-app text-sm" style={{ color: "var(--fg)" }}>{c.label}</span>
                  </span>
                  {i === selected && <CornerDownLeft size={14} style={{ color: "var(--fg-muted)" }} />}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
