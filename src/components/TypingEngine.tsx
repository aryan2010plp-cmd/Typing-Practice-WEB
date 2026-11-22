import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useApp, type ModeId } from "@/context/AppContext";
import { generateWords, getQuote, getCodeSnippet, generateWeaknessWords, type Quote } from "@/utils/wordLists";
import { playKey, playError } from "@/utils/soundEngine";
import { computeConsistency } from "@/utils/stats";

interface WordChar {
  ch: string;
  status: "untyped" | "correct" | "incorrect" | "extra" | "missed";
}

interface Word {
  text: string;
  chars: WordChar[];
  typed: string;
  isSpace: boolean;
}

export interface TestResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  duration: number;
  mode: ModeId;
  charCount: number;
  correctChars: number;
  incorrectChars: number;
  wpmSeries: { t: number; wpm: number; raw: number; errors: number }[];
  keyStatsDelta: Record<string, { correct: number; errors: number }>;
  quote?: Quote;
}

interface Props {
  onComplete: (result: TestResult) => void;
  onRestart: () => void;
  onEsc: () => void;
  signalRestart: number;
  customText?: string;
  zen?: boolean;
}

const FONT_SIZE_PX: Record<string, number> = { S: 20, M: 26, L: 32, XL: 40 };
const CHAR_WIDTH_RATIO = 0.62; // approx mono char width ratio

function textToWords(text: string, keepWhitespace = false): Word[] {
  if (keepWhitespace) {
    // Code mode: preserve indentation and newlines as typed characters.
    const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);
    return tokens.map((t) => ({
      text: t,
      chars: t.split("").map((ch) => ({ ch, status: "untyped" as const })),
      typed: "",
      isSpace: /^\s+$/.test(t),
    }));
  }
  // Word-based modes: spaces are just visual gaps, not typed characters.
  return text
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => ({
      text: t,
      chars: t.split("").map((ch) => ({ ch, status: "untyped" as const })),
      typed: "",
      isSpace: false,
    }));
}

function wordsToString(words: Word[]): string {
  return words.map((w) => w.text).join("");
}

export default function TypingEngine({ onComplete, onRestart, onEsc, signalRestart, customText, zen }: Props) {
  const { prefs, stats } = useApp();
  const t = prefs.test;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [codeLang, setCodeLang] = useState<string>(t.codeLang);
  const [words, setWords] = useState<Word[]>(() => initWords());
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(0);
  const [focused, setFocused] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wpmSeries, setWpmSeries] = useState<{ t: number; wpm: number; raw: number; errors: number }[]>([]);
  const [keyStatsDelta, setKeyStatsDelta] = useState<Record<string, { correct: number; errors: number }>>({});
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [interKeyTimes, setInterKeyTimes] = useState<number[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const lineIdxRef = useRef(0);

  function initWords(): Word[] {
    let text: string;
    if (t.mode === "words") {
      text = generateWords(t.wordCount, { punctuation: t.punctuation, numbers: t.numbers, pack: t.pack }).join(" ");
    } else if (t.mode === "quote") {
      const q = getQuote(t.quoteLength);
      text = q.text;
      // quote set in effect
    } else if (t.mode === "code") {
      const snippet = getCodeSnippet(t.codeLang);
      text = snippet.text;
    } else if (t.mode === "weakness") {
      const weak = getWeakestKeys(stats.keyStats, 5);
      text = generateWeaknessWords(weak, 60).join(" ");
    } else if (t.mode === "custom" && customText) {
      text = customText;
    } else {
      // time mode — generate a big buffer
      text = generateWords(120, { punctuation: t.punctuation, numbers: t.numbers, pack: t.pack }).join(" ");
    }
    return textToWords(text, t.mode === "code");
  }

  // Re-init when test prefs change or custom text changes
  useEffect(() => {
    resetTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.mode, t.timeSeconds, t.wordCount, t.quoteLength, t.codeLang, t.pack, t.punctuation, t.numbers, customText]);

  // Restart signal
  useEffect(() => {
    if (signalRestart > 0) resetTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalRestart]);

  // Set quote state on init for quote mode
  useEffect(() => {
    if (t.mode === "quote") {
      const q = getQuote(t.quoteLength);
      setQuote(q);
      setWords(textToWords(q.text, false));
    } else {
      setQuote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.mode, t.quoteLength]);

  // Refocus
  useEffect(() => {
    if (!zen) hiddenInputRef.current?.focus({ preventScroll: true });
  }, [zen]);

  const resetTest = useCallback(() => {
    setWords(initWords());
    setCurrentWordIdx(0);
    setCurrentCharIdx(0);
    setStartTime(null);
    setElapsed(0);
    setFinished(false);
    setCorrectChars(0);
    setIncorrectChars(0);
    setTotalKeystrokes(0);
    setStreak(0);
    setWpmSeries([]);
    setKeyStatsDelta({});
    setScrollOffset(0);
    setLastKeyTime(0);
    setInterKeyTimes([]);
    lineIdxRef.current = 0;
    setFocused(true);
    hiddenInputRef.current?.focus({ preventScroll: true });
  }, [t]);

  // Timer
  useEffect(() => {
    if (startTime === null || finished) return;
    if (t.mode === "time") {
      const interval = setInterval(() => {
        const e = (Date.now() - startTime) / 1000;
        setElapsed(e);
        if (e >= t.timeSeconds) {
          finalizeTest(e);
        }
      }, 50);
      return () => clearInterval(interval);
    } else {
      // word/quote/code: update elapsed for live HUD
      const interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 200);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, finished]);

  // WPM series sampling every second
  useEffect(() => {
    if (startTime === null || finished) return;
    const interval = setInterval(() => {
      const e = (Date.now() - startTime) / 1000;
      const wpm = computeWpm(correctChars, e);
      const raw = computeWpm(totalKeystrokes, e);
      setWpmSeries((prev) => {
        const lastT = prev.length > 0 ? prev[prev.length - 1].t : -1;
        if (Math.floor(e) === lastT) return prev;
        const errorsNow = incorrectChars;
        return [...prev, { t: Math.floor(e), wpm: Math.round(wpm), raw: Math.round(raw), errors: errorsNow }];
      });
    }, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, finished, correctChars, totalKeystrokes, incorrectChars]);

  function computeWpm(chars: number, secs: number): number {
    if (secs <= 0) return 0;
    return Math.round((chars / 5) / (secs / 60));
  }

  function finalizeTest(e: number) {
    if (finished) return;
    setFinished(true);
    const dur = e;
    const wpm = computeWpm(correctChars, dur);
    const raw = computeWpm(totalKeystrokes, dur);
    const accuracy = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 1000) / 10 : 100;
    const consistency = computeConsistency(interKeyTimes);
    const result: TestResult = {
      wpm,
      rawWpm: raw,
      accuracy,
      consistency,
      duration: Math.round(dur),
      mode: t.mode,
      charCount: correctChars + incorrectChars,
      correctChars,
      incorrectChars,
      wpmSeries,
      keyStatsDelta,
      quote: quote || undefined,
    };
    onComplete(result);
  }

  // Measure line height to compute scroll offset
  const lineHeight = useMemo(() => {
    const fs = FONT_SIZE_PX[prefs.fontSize];
    return Math.round(fs * 2.4);
  }, [prefs.fontSize]);

  // Compute caret position
  const caretPos = useMemo(() => {
    const wordEl = wordRefs.current[currentWordIdx];
    if (!wordEl) return { x: 0, y: scrollOffset, w: 0, h: lineHeight };
    const containerRect = containerRef.current?.getBoundingClientRect();
    const wordRect = wordEl.getBoundingClientRect();
    if (!containerRect) return { x: 0, y: scrollOffset, w: 0, h: lineHeight };
    const x = wordRect.left - containerRect.left + currentCharIdx * (FONT_SIZE_PX[prefs.fontSize] * CHAR_WIDTH_RATIO);
    const y = wordRect.top - containerRect.top + scrollOffset;
    return { x, y, w: 3, h: lineHeight };
  }, [currentWordIdx, currentCharIdx, words, scrollOffset, prefs.fontSize, lineIdxRef.current]);

  // Live stats
  const liveWpm = startTime !== null ? computeWpm(correctChars, elapsed) : 0;
  const liveRaw = startTime !== null ? computeWpm(totalKeystrokes, elapsed) : 0;
  const liveAcc = totalKeystrokes > 0 ? Math.round((correctChars / totalKeystrokes) * 1000) / 10 : 100;

  // Handle key
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (finished) return;
      if (!focused) {
        if (e.key.length === 1 || e.key === " " || e.key === "Backspace") {
          setFocused(true);
          hiddenInputRef.current?.focus();
        }
        return;
      }

      // Esc opens command palette
      if (e.key === "Escape") {
        e.preventDefault();
        onEsc();
        return;
      }

      // Tab + Enter restart
      if (e.key === "Enter" && e.shiftKey === false && (e as unknown as { tabKey?: boolean }).tabKey) {
        e.preventDefault();
        resetTest();
        onRestart();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        // mark for enter combo — simple: just restart on Tab then Enter
        return;
      }

      // For code mode, Enter inserts newline; Tab inserts tab
      const isCode = t.mode === "code";

      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (isCode) {
          handleChar("\n");
        } else {
          // in non-code, enter does nothing
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        handleSpace();
        return;
      }

      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta" || e.key === "CapsLock") {
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        handleChar(e.key);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focused, finished, currentWordIdx, currentCharIdx, words, startTime, correctChars, totalKeystrokes]
  );

  function handleChar(key: string) {
    if (startTime === null) {
      setStartTime(Date.now());
    }
    playKey(prefs.sound);

    const now = performance.now();
    if (lastKeyTime > 0) setInterKeyTimes((arr) => [...arr, now - lastKeyTime]);
    setLastKeyTime(now);

    setTotalKeystrokes((n) => n + 1);
    const lower = key.toLowerCase();

    setWords((prevWords) => {
      const w = [...prevWords];
      const word = { ...w[currentWordIdx], chars: [...w[currentWordIdx].chars], typed: w[currentWordIdx].typed + key };
      const ci = currentCharIdx;
      if (ci < word.chars.length) {
        const target = word.chars[ci].ch;
        if (key === target) {
          word.chars[ci] = { ...word.chars[ci], status: "correct" };
          setCorrectChars((c) => c + 1);
          setStreak((s) => s + 1);
          setKeyStatsDelta((ks) => {
            const cur = ks[lower] || { correct: 0, errors: 0 };
            return { ...ks, [lower]: { ...cur, correct: cur.correct + 1 } };
          });
        } else {
          word.chars[ci] = { ...word.chars[ci], status: "incorrect" };
          setIncorrectChars((c) => c + 1);
          setStreak(0);
          playError();
          setKeyStatsDelta((ks) => {
            const cur = ks[lower] || { correct: 0, errors: 0 };
            return { ...ks, [lower]: { ...cur, errors: cur.errors + 1 } };
          });
        }
      } else {
        // extra char beyond word length
        word.chars.push({ ch: key, status: "extra" });
        word.typed = word.typed + key;
        setIncorrectChars((c) => c + 1);
        setStreak(0);
        playError();
        setKeyStatsDelta((ks) => {
          const cur = ks[lower] || { correct: 0, errors: 0 };
          return { ...ks, [lower]: { ...cur, errors: cur.errors + 1 } };
        });
      }
      w[currentWordIdx] = word;
      return w;
    });

    setCurrentCharIdx((ci) => ci + 1);

    // Check if word complete (for word-count modes) or reached end
    const nextWord = words[currentWordIdx];
    const nextCi = currentCharIdx + 1;
    if (nextCi >= nextWord.chars.length) {
      if (currentWordIdx + 1 >= words.length) {
        if (t.mode === "time") {
          appendMoreWords();
        } else {
          // finished
          setTimeout(() => finalizeTest((Date.now() - (startTime || Date.now())) / 1000), 0);
          return;
        }
      }
    }
  }

  function handleSpace() {
    if (startTime === null) setStartTime(Date.now());
    playKey(prefs.sound);
    setTotalKeystrokes((n) => n + 1);

    const word = words[currentWordIdx];
    // mark missed chars
    let missed = 0;
    setWords((prev) => {
      const w = [...prev];
      const wd = { ...w[currentWordIdx], chars: w[currentWordIdx].chars.map((c) =>
        c.status === "untyped" ? { ...c, status: "missed" as const } : c
      )};
      missed = wd.chars.filter((c) => c.status === "missed").length;
      w[currentWordIdx] = wd;
      return w;
    });
    if (missed > 0) {
      setIncorrectChars((c) => c + missed);
      setStreak(0);
    }

    const nextIdx = currentWordIdx + 1;
    if (nextIdx >= words.length) {
      if (t.mode === "time") {
        appendMoreWords();
      } else {
        // check if all words done
        const e = (Date.now() - (startTime || Date.now())) / 1000;
        finalizeTest(e);
        return;
      }
    }
    setCurrentWordIdx(nextIdx);
    setCurrentCharIdx(0);

    // Auto-scroll: when we cross a line boundary
    checkScroll(nextIdx);
  }

  function handleBackspace() {
    playKey(prefs.sound);
    if (currentCharIdx > 0) {
      const newCi = currentCharIdx - 1;
      setWords((prev) => {
        const w = [...prev];
        const chars = [...w[currentWordIdx].chars];
        if (newCi < chars.length) {
          chars[newCi] = { ...chars[newCi], status: "untyped" };
        } else {
          // remove extra char
          chars.pop();
        }
        w[currentWordIdx] = { ...w[currentWordIdx], chars, typed: w[currentWordIdx].typed.slice(0, -1) };
        return w;
      });
      setCurrentCharIdx(newCi);
    } else if (currentWordIdx > 0) {
      // go back to previous word
      const prevIdx = currentWordIdx - 1;
      const prevWord = words[prevIdx];
      setCurrentWordIdx(prevIdx);
      setCurrentCharIdx(prevWord.chars.length);
    }
  }

  function appendMoreWords() {
    const more = generateWords(40, { punctuation: t.punctuation, numbers: t.numbers, pack: t.pack });
    setWords((prev) => [...prev, ...textToWords(more.join(" "))]);
  }

  function checkScroll(wordIdx: number) {
    // Determine line of current word by measuring y offset
    requestAnimationFrame(() => {
      const wordEl = wordRefs.current[wordIdx];
      const containerEl = containerRef.current;
      if (!wordEl || !containerEl) return;
      const wordRect = wordEl.getBoundingClientRect();
      const contRect = containerEl.getBoundingClientRect();
      const relY = wordRect.top - contRect.top + scrollOffset;
      const lineH = lineHeight;
      const currentLine = Math.round(relY / lineH);
      // We want active line to be line index 1 (the middle of 3)
      if (currentLine >= 2) {
        const newOffset = scrollOffset - lineH;
        setScrollOffset(newOffset);
        lineIdxRef.current = currentLine;
      }
    });
  }

  // Global keydown
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Focus handling
  const handleBlur = () => {
    if (!finished) setFocused(false);
  };

  const handleFocusClick = () => {
    setFocused(true);
    hiddenInputRef.current?.focus();
  };

  const charColor = (status: WordChar["status"]) => {
    switch (status) {
      case "untyped": return "var(--fg-muted)";
      case "correct": return "var(--fg)";
      case "incorrect": return "var(--error)";
      case "extra": return "#8b0000";
      case "missed": return "var(--error)";
    }
  };

  const fontSize = FONT_SIZE_PX[prefs.fontSize];

  const showHud = prefs.showHud && (!prefs.hideStatsWhileTyping || finished) && !zen;

  // Word count progress for word mode
  const wordsCompleted = currentWordIdx;
  const totalWords = t.mode === "words" ? t.wordCount : words.length;
  const timeLeft = t.mode === "time" ? Math.max(0, t.timeSeconds - elapsed) : 0;

  // Tab+Enter handling via a ref flag
  const tabPressed = useRef(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") { e.preventDefault(); tabPressed.current = true; }
      if (e.key === "Enter" && tabPressed.current) {
        e.preventDefault();
        tabPressed.current = false;
        resetTest();
        onRestart();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Tab") tabPressed.current = false;
    };
    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp);
    };
  }, [resetTest, onRestart]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4" onClick={handleFocusClick}>
      {/* hidden input to hold focus */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none -z-10"
        onBlur={handleBlur}
        onFocus={() => setFocused(true)}
        aria-label="typing input"
      />

      {/* Live HUD */}
      {showHud && (
        <div className="flex items-center gap-6 mb-6 justify-center font-mono-app text-sm" style={{ color: "var(--fg-muted)" }}>
          {t.mode === "time" && (
            <div className="flex items-center gap-1">
              <span style={{ color: "var(--accent)" }} className="text-2xl font-bold">{Math.ceil(timeLeft)}</span>
              <span>s</span>
            </div>
          )}
          {(t.mode === "words" || t.mode === "custom") && (
            <div className="flex items-center gap-1">
              <span style={{ color: "var(--accent)" }} className="text-2xl font-bold">{wordsCompleted}</span>
              <span>/ {totalWords}</span>
            </div>
          )}
          <Stat label="WPM" value={liveWpm} />
          <Stat label="Raw" value={liveRaw} />
          <Stat label="Acc" value={`${liveAcc}%`} />
          {streak >= 5 && <Stat label="Streak" value={streak} accent />}
        </div>
      )}

      {/* Typing container */}
      <div
        ref={containerRef}
        className="relative no-select cursor-text overflow-hidden mx-auto"
        style={{ height: lineHeight * 3, maxWidth: "100%" }}
      >
        {/* measure span */}
        <div ref={measureRef} className="absolute opacity-0 pointer-events-none" style={{ fontFamily: "var(--font-mono)", fontSize }} />

        {/* words wrapper with scroll transform */}
        <motion.div
          animate={{ y: scrollOffset }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="absolute inset-x-0 top-0 font-mono-app leading-[2.4]"
          style={{ fontSize, fontFamily: "var(--font-mono)" }}
        >
          {words.map((word, wi) => (
            <span key={wi} className="whitespace-pre">
              {wi > 0 && !word.isSpace && !words[wi - 1].isSpace ? " " : ""}
              <span
                ref={(el) => { wordRefs.current[wi] = el; }}
                className="inline-block whitespace-pre"
              >
                {word.chars.map((cc, ci) => {
                  const isActive = wi === currentWordIdx && ci === currentCharIdx && !finished;
                  return (
                    <span
                      key={ci}
                      className="relative inline-block"
                      style={{
                        color: charColor(cc.status),
                        backgroundColor: cc.status === "incorrect" ? "var(--error-soft)" : "transparent",
                        textDecoration: cc.status === "missed" ? "underline" : "none",
                      }}
                    >
                      {cc.ch === " " ? "\u00A0" : cc.ch}
                      {isActive && <Caret style={prefs.caret} fontSize={fontSize} />}
                    </span>
                  );
                })}
                {wi === currentWordIdx && currentCharIdx >= word.chars.length && !finished && (
                  <Caret style={prefs.caret} fontSize={fontSize} trailing />
                )}
              </span>
            </span>
          ))}
        </motion.div>

        {/* Focus overlay */}
        {!focused && !finished && (
          <div
            className="absolute inset-0 flex items-center justify-center focus-overlay cursor-pointer"
            style={{ background: "color-mix(in srgb, var(--bg) 60%, transparent)" }}
            onClick={handleFocusClick}
          >
            <span className="font-ui-app text-sm" style={{ color: "var(--fg-muted)" }}>
              Click or press any key to focus
            </span>
          </div>
        )}
      </div>

      {/* bottom controls */}
      {!zen && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={(e) => { e.stopPropagation(); resetTest(); onRestart(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-ui-app text-sm transition hover:scale-105"
            style={{ background: "var(--bg-elev)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
          >
            <span>Restart</span>
            <kbd className="text-xs opacity-60">Tab+Enter</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: accent ? "var(--accent)" : "var(--fg)" }} className="text-lg font-bold">{value}</span>
      <span className="opacity-60">{label}</span>
    </div>
  );
}

function Caret({ style, fontSize, trailing }: { style: "bar" | "block" | "underline"; fontSize: number; trailing?: boolean }) {
  if (style === "bar") {
    return (
      <motion.span
        layout
        className="caret-blink absolute top-1 left-0"
        style={{ width: 3, height: fontSize * 1.4, background: "var(--caret)", borderRadius: 2, transform: trailing ? "translateX(2px)" : "translateX(-1px)" }}
      />
    );
  }
  if (style === "block") {
    return (
      <motion.span
        className="caret-blink absolute top-0 left-0"
        style={{ width: fontSize * 0.62, height: fontSize * 1.4, background: "var(--caret)", opacity: 0.3, borderRadius: 2 }}
      />
    );
  }
  return (
    <motion.span
      className="caret-blink absolute bottom-0 left-0"
      style={{ width: fontSize * 0.62, height: 3, background: "var(--caret)", borderRadius: 2 }}
    />
  );
}

function getWeakestKeys(keyStats: Record<string, { correct: number; errors: number }>, n: number): string[] {
  const entries = Object.entries(keyStats)
    .filter(([k]) => /^[a-z]$/.test(k))
    .map(([k, v]) => {
      const total = v.correct + v.errors;
      const errRate = total > 0 ? v.errors / total : 0;
      return { k, errRate, total };
    })
    .filter((e) => e.total >= 3)
    .sort((a, b) => b.errRate - a.errRate);
  return entries.slice(0, n).map((e) => e.k);
}
