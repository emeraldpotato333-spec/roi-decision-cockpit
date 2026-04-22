import type { Lane, RankedLane } from "./types";

export const SCORE_WEIGHTS = {
  revenue: 0.35,
  urgency: 0.25,
  confidence: 0.2,
  speed: 0.2
} as const;

export function scoreLane(item: Lane) {
  return (
    item.revenue * SCORE_WEIGHTS.revenue +
    item.urgency * SCORE_WEIGHTS.urgency +
    item.confidence * SCORE_WEIGHTS.confidence +
    item.speed * SCORE_WEIGHTS.speed
  );
}

export function scoreLabel(score: number) {
  if (score >= 4.4) return "Elite";
  if (score >= 3.8) return "Strong";
  if (score >= 3.1) return "Okay";
  return "Weak";
}

export function rankLanes(items: Lane[]): RankedLane[] {
  return [...items].map((item) => ({ ...item, score: scoreLane(item) })).sort((a, b) => b.score - a.score);
}

export function formatScore(score: number) {
  return score.toFixed(2);
}
