import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { User, Ghost } from "lucide-react";

interface Props {
  active: boolean;
  targetWpm: number;
  // user progress 0..1 of the test
  userProgress: number;
  duration: number; // total seconds (for pacing)
}

export default function GhostRace({ active, targetWpm, userProgress, duration }: Props) {
  if (!active || targetWpm <= 0) return null;

  // Ghost progress: based on target WPM vs test length
  // We compute ghost progress as a fraction over the test duration
  const [ghostProgress, setGhostProgress] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    setGhostProgress(0);
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startRef.current) / 1000;
      // WPM = (chars/5)/min. We approximate progress as elapsed/duration since ghost runs the whole duration.
      const p = Math.min(1, elapsedSec / duration);
      setGhostProgress(p);
    }, 50);
    return () => clearInterval(interval);
  }, [active, duration]);

  const userPct = Math.round(userProgress * 100);
  const ghostPct = Math.round(ghostProgress * 100);
  const winning = userPct >= ghostPct;

  return (
    <div className="w-full max-w-5xl mx-auto mb-4 px-4">
      <div className="flex items-center justify-between text-xs font-ui-app mb-1" style={{ color: "var(--fg-muted)" }}>
        <span className="flex items-center gap-1">
          <User size={12} /> You — {userPct}%
        </span>
        <span style={{ color: winning ? "var(--success)" : "var(--error)" }}>
          {winning ? "Leading" : "Behind"}
        </span>
        <span className="flex items-center gap-1">
          Ghost — {ghostPct}% <Ghost size={12} />
        </span>
      </div>
      <div
        className="relative h-10 rounded-xl overflow-hidden"
        style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
      >
        {/* track lanes */}
        <div className="absolute inset-0 flex flex-col justify-around py-1">
          <div className="h-px" style={{ background: "var(--border)" }} />
          <div className="h-px" style={{ background: "var(--border)" }} />
        </div>
        {/* Ghost */}
        <motion.div
          className="absolute top-1 flex items-center justify-center rounded-full"
          style={{
            left: `${ghostPct}%`,
            width: 28,
            height: 28,
            background: "var(--bg-elev)",
            border: "2px solid var(--fg-muted)",
            color: "var(--fg-muted)",
            transform: "translateX(-50%)",
          }}
          animate={{ left: `${ghostPct}%` }}
          transition={{ ease: "linear", duration: 0.05 }}
        >
          <Ghost size={14} />
        </motion.div>
        {/* User */}
        <motion.div
          className="absolute bottom-1 flex items-center justify-center rounded-full"
          style={{
            left: `${userPct}%`,
            width: 28,
            height: 28,
            background: "var(--accent)",
            color: "var(--bg)",
            transform: "translateX(-50%)",
          }}
          animate={{ left: `${userPct}%` }}
          transition={{ ease: "linear", duration: 0.05 }}
        >
          <User size={14} />
        </motion.div>
        {/* finish flag */}
        <div className="absolute right-0 top-0 bottom-0 w-1" style={{ background: "var(--accent)" }} />
      </div>
    </div>
  );
}
