// Stats computation helpers

export function computeConsistency(interKeyTimes: number[]): number {
  if (interKeyTimes.length < 2) return 100;
  const arr = interKeyTimes.slice(-50); // last 50 keystrokes
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  if (mean === 0) return 100;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation
  const consistency = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  return consistency;
}

export function keyAccuracy(keyStats: { correct: number; errors: number }): number {
  const total = keyStats.correct + keyStats.errors;
  if (total === 0) return -1;
  return (keyStats.correct / total) * 100;
}

// Returns a heatmap value 0..1 where 0 = best, 1 = worst (most errors)
export function keyErrorScore(keyStats: { correct: number; errors: number } | undefined): number {
  if (!keyStats) return 0;
  const total = keyStats.correct + keyStats.errors;
  if (total < 2) return 0;
  return keyStats.errors / total;
}
