import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { generateWords } from "@/utils/wordLists";
import { playKey, playError } from "@/utils/soundEngine";
import { Zap, Clock, X, Trophy } from "lucide-react";

interface Props {
  mode: "rain" | "suddendeath";
  onExit: () => void;
}

interface FallingWord {
  id: number;
  text: string;
  x: number; // percent
  duration: number; // seconds to fall
  typed: string;
  active: boolean;
}

export default function ArcadeMode({ mode, onExit }: Props) {
  const { prefs } = useApp();
  const [words, setWords] = useState<FallingWord[]>([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeWordId, setActiveWordId] = useState<number | null>(null);
  const [powerups, setPowerups] = useState<{ id: number; type: "slow" | "clear"; x: number; duration: number }[]>([]);
  const [slowUntil, setSlowUntil] = useState(0);

  const idRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const playAreaRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordSpeedRef = useRef(8000); // ms to fall

  const reset = useCallback(() => {
    setWords([]);
    setInput("");
    setScore(0);
    setLives(3);
    setGameOver(false);
    setStarted(true);
    setElapsed(0);
    setActiveWordId(null);
    setPowerups([]);
    setSlowUntil(0);
    startTimeRef.current = Date.now();
    wordSpeedRef.current = 8000;
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    spawnRef.current = setInterval(() => {
      const id = idRef.current++;
      const word = generateWords(1)[0];
      const slowFactor = Date.now() < slowUntil ? 1.6 : 1;
      setWords((prev) => [
        ...prev,
        { id, text: word, x: 5 + Math.random() * 85, duration: (wordSpeedRef.current * slowFactor) / 1000, typed: "", active: false },
      ]);
      // occasionally spawn a powerup
      if (Math.random() < 0.12) {
        const pid = idRef.current++;
        const type = Math.random() < 0.5 ? "slow" : "clear";
        setPowerups((prev) => [...prev, { id: pid, type, x: 10 + Math.random() * 80, duration: 6000 / 1000 }]);
      }
    }, Math.max(700, 2200 - score * 40));
    return () => { if (spawnRef.current) clearInterval(spawnRef.current); };
  }, [started, gameOver, score, slowUntil]);

  useEffect(() => {
    if (!started || gameOver) return;
    tickRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 100);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [started, gameOver]);

  // Increase difficulty every 10 words
  useEffect(() => {
    if (score > 0 && score % 10 === 0) {
      wordSpeedRef.current = Math.max(2500, wordSpeedRef.current - 500);
    }
  }, [score]);

  // Check fallen words
  useEffect(() => {
    if (gameOver) return;
    // We can't easily detect fall completion from CSS; approximate via elapsed vs duration
    const interval = setInterval(() => {
      const now = Date.now();
      setWords((prev) => {
        const survivors: FallingWord[] = [];
        for (const w of prev) {
          const fallenAt = startTimeRef.current + w.duration * 1000 + (w.id % 100) * 0;
          // approximate: if word spawned and its duration passed relative to its own spawn
          // Simpler: track via animation end event instead. We'll handle via onAnimationEnd.
          survivors.push(w);
        }
        return survivors;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [gameOver]);

  const handleWordFallen = useCallback((id: number) => {
    setWords((prev) => {
      const w = prev.find((x) => x.id === id);
      if (w && w.text !== w.typed) {
        // missed
        if (mode === "suddendeath") {
          setGameOver(true);
          playError();
        } else {
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) setGameOver(true);
            return nl;
          });
        }
      }
      return prev.filter((x) => x.id !== id);
    });
    setActiveWordId(null);
  }, [mode]);

  const handlePowerupFallen = useCallback((id: number) => {
    setPowerups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (gameOver) {
        if (e.key === "Enter") { reset(); }
        return;
      }
      if (e.key === "Escape") { onExit(); return; }
      if (e.key === "Backspace") {
        setInput("");
        setActiveWordId(null);
        setWords((prev) => prev.map((w) => ({ ...w, typed: "", active: false })));
        return;
      }
      if (e.key === " ") { e.preventDefault(); return; }
      if (e.key.length !== 1) return;
      playKey(prefs.sound);

      const ch = e.key;
      // find a word that starts with current input + ch
      setInput((prevInput) => {
        const next = prevInput + ch;
        // match active word first
        const candidates = words.filter((w) => w.text.startsWith(next) && !w.text.startsWith(prevInput));
        if (candidates.length > 0) {
          // pick the lowest on screen (closest to bottom)
          candidates.sort((a, b) => b.id - a.id);
          const target = candidates[0];
          setActiveWordId(target.id);
          setWords((prev) =>
            prev.map((w) => {
              if (w.id === target.id) {
                const newTyped = next;
                if (newTyped === w.text) {
                  // completed!
                  setScore((s) => s + 1);
                  setActiveWordId(null);
                  setInput("");
                  setWords((p) => p.filter((x) => x.id !== w.id));
                  return { ...w, typed: newTyped, active: false };
                }
                return { ...w, typed: newTyped, active: true };
              }
              return w.active ? { ...w, typed: "", active: false } : w;
            })
          );
          return "";
        }
        // typo
        if (mode === "suddendeath") {
          setGameOver(true);
          playError();
        } else {
          playError();
        }
        return prevInput;
      });
    },
    [words, gameOver, mode, prefs.sound, reset, onExit]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Powerup pickup
  const handlePowerupClick = (id: number, type: "slow" | "clear") => {
    if (type === "slow") setSlowUntil(Date.now() + 5000);
    if (type === "clear") setWords([]);
    setPowerups((prev) => prev.filter((p) => p.id !== id));
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          {mode === "rain" ? <Zap size={48} style={{ color: "var(--accent)" }} /> : <Clock size={48} style={{ color: "var(--error)" }} />}
          <h2 className="text-2xl font-ui-app font-bold mt-3" style={{ color: "var(--fg)" }}>
            {mode === "rain" ? "Word Rain" : "Sudden Death"}
          </h2>
          <p className="font-ui-app text-sm mt-2 max-w-sm" style={{ color: "var(--fg-muted)" }}>
            {mode === "rain"
              ? "Type the falling words before they reach the bottom. Speed increases every 10 words. Collect power-ups!"
              : "One single typo ends the run. Pure accuracy training."}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="px-6 py-2.5 rounded-xl font-ui-app text-sm font-medium" style={{ background: "var(--accent)", color: "var(--bg)" }}>Start</button>
          <button onClick={onExit} className="px-6 py-2.5 rounded-xl font-ui-app text-sm" style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={playAreaRef}>
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-3 mb-2">
        <div className="flex items-center gap-4 font-mono-app text-sm">
          <span style={{ color: "var(--fg)" }}>Score: <span style={{ color: "var(--accent)" }}>{score}</span></span>
          {mode === "rain" && (
            <span style={{ color: "var(--fg)" }}>Lives: <span style={{ color: lives > 1 ? "var(--success)" : "var(--error)" }}>{"\u2665".repeat(lives)}</span></span>
          )}
          <span style={{ color: "var(--fg-muted)" }}>{elapsed.toFixed(1)}s</span>
        </div>
        <button onClick={onExit} className="flex items-center gap-1 text-sm font-ui-app" style={{ color: "var(--fg-muted)" }}>
          <X size={14} /> Exit
        </button>
      </div>

      {/* Play area */}
      <div
        className="relative overflow-hidden rounded-2xl mx-auto"
        style={{ height: "70vh", background: "var(--bg-soft)", border: "1px solid var(--border)" }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* current input display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="px-4 py-2 rounded-xl font-mono-app text-lg" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", color: "var(--accent)" }}>
            {input || <span style={{ color: "var(--fg-muted)" }}>type...</span>}
          </div>
        </div>

        <AnimatePresence>
          {words.map((w) => (
            <motion.div
              key={w.id}
              className="absolute font-mono-app font-medium"
              style={{
                left: `${w.x}%`,
                top: 0,
                color: w.active ? "var(--accent)" : "var(--fg)",
                fontSize: 22,
                textShadow: w.active ? "0 0 12px var(--accent)" : "none",
              }}
              initial={{ y: -40 }}
              animate={{ y: "70vh" }}
              transition={{ duration: w.duration, ease: "linear" }}
              onAnimationComplete={() => handleWordFallen(w.id)}
            >
              {w.text.split("").map((c, i) => (
                <span key={i} style={{ color: i < w.typed.length ? "var(--accent)" : i < w.typed.length ? "var(--success)" : w.active ? "var(--accent)" : "var(--fg)" }}>
                  {c}
                </span>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {powerups.map((p) => (
            <motion.div
              key={p.id}
              className="absolute z-10 flex items-center justify-center rounded-full cursor-pointer"
              style={{ left: `${p.x}%`, top: 0, width: 36, height: 36, background: p.type === "slow" ? "var(--success)" : "var(--accent)", color: "var(--bg)" }}
              initial={{ y: -40 }}
              animate={{ y: "70vh" }}
              transition={{ duration: p.duration, ease: "linear" }}
              onAnimationComplete={() => handlePowerupFallen(p.id)}
              onClick={() => handlePowerupClick(p.id, p.type)}
            >
              <span className="text-xs font-bold">{p.type === "slow" ? "SLO" : "CLR"}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30" style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", backdropFilter: "blur(6px)" }}>
            <Trophy size={40} style={{ color: "var(--accent)" }} />
            <h3 className="text-2xl font-ui-app font-bold mt-3" style={{ color: "var(--fg)" }}>Game Over</h3>
            <p className="font-mono-app mt-2" style={{ color: "var(--fg-muted)" }}>Score: {score} · {elapsed.toFixed(1)}s</p>
            <div className="flex gap-3 mt-5">
              <button onClick={reset} className="px-5 py-2 rounded-xl font-ui-app text-sm" style={{ background: "var(--accent)", color: "var(--bg)" }}>Play Again</button>
              <button onClick={onExit} className="px-5 py-2 rounded-xl font-ui-app text-sm" style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}>Exit</button>
            </div>
          </div>
        )}
      </div>
      <input ref={inputRef} className="absolute opacity-0 -z-10" autoFocus />
    </div>
  );
}
