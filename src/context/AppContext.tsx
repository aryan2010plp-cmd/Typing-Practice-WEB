import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { resumeAudio, type SoundProfile } from "@/utils/soundEngine";

export type ThemeId = "obsidian" | "paper" | "cyberpunk" | "matrix" | "matcha" | "dracula";
export type FontId = "jetbrains" | "fira" | "roboto" | "inter";
export type FontSize = "S" | "M" | "L" | "XL";
export type CaretStyle = "bar" | "block" | "underline";
export type ModeId = "time" | "words" | "quote" | "code" | "weakness" | "custom";
export type ArcadeId = "rain" | "suddendeath" | null;

export interface TestPrefs {
  mode: ModeId;
  timeSeconds: number;
  wordCount: number;
  quoteLength: "short" | "medium" | "long";
  codeLang: string;
  punctuation: boolean;
  numbers: boolean;
  pack: "common" | "indian" | "hinglish";
  ghostWpm: number; // 0 = off
}

export interface Prefs {
  theme: ThemeId;
  font: FontId;
  fontSize: FontSize;
  caret: CaretStyle;
  sound: SoundProfile;
  showKeyboard: boolean;
  showHud: boolean;
  zenMode: boolean;
  hideStatsWhileTyping: boolean;
  test: TestPrefs;
}

export interface KeyStat {
  correct: number;
  errors: number;
}

export interface TestRecord {
  id: string;
  date: number;
  mode: ModeId;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  duration: number;
  xp: number;
}

export interface Stats {
  totalXp: number;
  keyStats: Record<string, KeyStat>;
  history: TestRecord[];
  bestWpm: number;
  dailyStreak: number;
  lastPlayedDay: string; // yyyy-mm-dd
  achievements: string[]; // unlocked ids
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (stats: Stats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_test", name: "First Steps", desc: "Complete your first test", icon: "Footprints", check: (s) => s.history.length >= 1 },
  { id: "wpm_30", name: "Getting Warm", desc: "Reach 30 WPM", icon: "Flame", check: (s) => s.bestWpm >= 30 },
  { id: "wpm_50", name: "Quick Fingers", desc: "Reach 50 WPM", icon: "Zap", check: (s) => s.bestWpm >= 50 },
  { id: "wpm_80", name: "Speed Demon", desc: "Reach 80 WPM", icon: "Rocket", check: (s) => s.bestWpm >= 80 },
  { id: "wpm_100", name: "Centurion", desc: "Reach 100 WPM", icon: "Crown", check: (s) => s.bestWpm >= 100 },
  { id: "acc_98", name: "Sharpshooter", desc: "Get 98%+ accuracy on a 60s test", icon: "Target", check: (s) => s.history.some((h) => h.accuracy >= 98 && h.duration >= 60) },
  { id: "streak_3", name: "Warming Up", desc: "3-day streak", icon: "CalendarCheck", check: (s) => s.dailyStreak >= 3 },
  { id: "streak_7", name: "Weekly Warrior", desc: "7-day streak", icon: "Flame", check: (s) => s.dailyStreak >= 7 },
  { id: "tests_25", name: "Dedicated", desc: "Complete 25 tests", icon: "Medal", check: (s) => s.history.length >= 25 },
  { id: "tests_100", name: "Centurion Typist", desc: "Complete 100 tests", icon: "Award", check: (s) => s.history.length >= 100 },
  { id: "xp_1000", name: "Rising Star", desc: "Earn 1000 XP", icon: "Star", check: (s) => s.totalXp >= 1000 },
  { id: "xp_5000", name: "Keyboard Wizard", desc: "Earn 5000 XP", icon: "Wand2", check: (s) => s.totalXp >= 5000 },
];

export interface Rank {
  title: string;
  minXp: number;
}

export const RANKS: Rank[] = [
  { title: "Novice Typist", minXp: 0 },
  { title: "Apprentice", minXp: 500 },
  { title: "Journeyman", minXp: 1500 },
  { title: "Skilled Typist", minXp: 3000 },
  { title: "Expert Typist", minXp: 6000 },
  { title: "Keyboard Wizard", minXp: 10000 },
  { title: "Grandmaster", minXp: 20000 },
];

export function getRank(xp: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (xp >= rank.minXp) r = rank;
  return r;
}

export function getLevel(xp: number): { level: number; into: number; span: number } {
  // Each level needs 250 + level*100 XP
  let level = 1;
  let rem = xp;
  while (rem > 0) {
    const need = 250 + (level - 1) * 100;
    if (rem >= need) {
      rem -= need;
      level++;
    } else {
      return { level, into: rem, span: need };
    }
  }
  return { level, into: 0, span: 250 };
}

const DEFAULT_PREFS: Prefs = {
  theme: "obsidian",
  font: "jetbrains",
  fontSize: "M",
  caret: "bar",
  sound: "off",
  showKeyboard: false,
  showHud: true,
  zenMode: false,
  hideStatsWhileTyping: false,
  test: {
    mode: "time",
    timeSeconds: 30,
    wordCount: 25,
    quoteLength: "short",
    codeLang: "random",
    punctuation: false,
    numbers: false,
    pack: "common",
    ghostWpm: 0,
  },
};

const DEFAULT_STATS: Stats = {
  totalXp: 0,
  keyStats: {},
  history: [],
  bestWpm: 0,
  dailyStreak: 0,
  lastPlayedDay: "",
  achievements: [],
};

const PREFS_KEY = "keyforge_prefs";
const STATS_KEY = "keyforge_stats";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayDiff(a: string, b: string): number {
  if (!a || !b) return 99;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

interface AppContextValue {
  prefs: Prefs;
  stats: Stats;
  setPrefs: (p: Partial<Prefs>) => void;
  setTestPrefs: (p: Partial<TestPrefs>) => void;
  recordTest: (rec: Omit<TestRecord, "id" | "date" | "xp"> & { keyStatsDelta: Record<string, KeyStat> }) => TestRecord;
  resetStats: () => void;
  newlyUnlocked: string[];
  clearUnlocked: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(() => load(PREFS_KEY, DEFAULT_PREFS));
  const [stats, setStats] = useState<Stats>(() => load(STATS_KEY, DEFAULT_STATS));
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    document.documentElement.setAttribute("data-theme", prefs.theme);
    const fontMap: Record<FontId, string> = {
      jetbrains: "'JetBrains Mono', monospace",
      fira: "'Fira Code', monospace",
      roboto: "'Roboto Mono', monospace",
      inter: "'Inter', monospace",
    };
    document.documentElement.style.setProperty("--font-mono", fontMap[prefs.font]);
  }, [prefs]);

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((prev) => ({ ...prev, ...p }));
  }, []);

  const setTestPrefs = useCallback((p: Partial<TestPrefs>) => {
    setPrefsState((prev) => ({ ...prev, test: { ...prev.test, ...p } }));
  }, []);

  const recordTest = useCallback(
    (rec: Omit<TestRecord, "id" | "date" | "xp"> & { keyStatsDelta: Record<string, KeyStat> }) => {
      const xp = Math.round(rec.wpm * 2 + rec.accuracy * 0.5 + rec.consistency * 0.3);
      const record: TestRecord = {
        id: Math.random().toString(36).slice(2),
        date: Date.now(),
        mode: rec.mode,
        wpm: rec.wpm,
        rawWpm: rec.rawWpm,
        accuracy: rec.accuracy,
        consistency: rec.consistency,
        duration: rec.duration,
        xp,
      };

      setStats((prev) => {
        const keyStats = { ...prev.keyStats };
        for (const [k, delta] of Object.entries(rec.keyStatsDelta)) {
          const cur = keyStats[k] || { correct: 0, errors: 0 };
          keyStats[k] = {
            correct: cur.correct + delta.correct,
            errors: cur.errors + delta.errors,
          };
        }
        const today = todayStr();
        let streak = prev.dailyStreak;
        if (prev.lastPlayedDay !== today) {
          const diff = dayDiff(prev.lastPlayedDay, today);
          if (!prev.lastPlayedDay) streak = 1;
          else if (diff === 1) streak = prev.dailyStreak + 1;
          else if (diff > 1) streak = 1;
        }
        const newStats: Stats = {
          totalXp: prev.totalXp + xp,
          keyStats,
          history: [record, ...prev.history].slice(0, 200),
          bestWpm: Math.max(prev.bestWpm, rec.wpm),
          dailyStreak: streak,
          lastPlayedDay: today,
          achievements: prev.achievements,
        };
        // Check achievements
        const unlocked: string[] = [];
        for (const a of ACHIEVEMENTS) {
          if (!newStats.achievements.includes(a.id) && a.check(newStats)) {
            unlocked.push(a.id);
            newStats.achievements = [...newStats.achievements, a.id];
          }
        }
        if (unlocked.length) setNewlyUnlocked((nu) => [...nu, ...unlocked]);
        return newStats;
      });

      return record;
    },
    []
  );

  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS);
  }, []);

  const clearUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  // Resume audio on first interaction
  useEffect(() => {
    const handler = () => {
      resumeAudio();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  return (
    <AppContext.Provider
      value={{ prefs, stats, setPrefs, setTestPrefs, recordTest, resetStats, newlyUnlocked, clearUnlocked }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
