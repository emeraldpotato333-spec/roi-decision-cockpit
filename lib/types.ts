export type LaneStatus = "tomorrow" | "pause" | "delegate" | "hold";

export type ScoreKey = "revenue" | "urgency" | "confidence" | "speed";

export type Lane = {
  id: string;
  name: string;
  evidence: string;
  laneNote?: string;
  timeRequired: string;
  nextAction: string;
  revenue: number;
  urgency: number;
  confidence: number;
  speed: number;
  status: LaneStatus;
  updatedAt?: string;
  reviewHint?: string;
};

export type RankedLane = Lane & {
  score: number;
};

export type CompletedLane = Lane & {
  completedAt: string;
};

export type ExecutionBlock = {
  task: string;
  success: string;
  start: string;
  stop: string;
  when: string;
};

export type CockpitState = {
  items: Lane[];
  completedToday: CompletedLane[];
  selectedId: string;
  phaseNote: string;
  executionBlock: ExecutionBlock;
  theme: "light" | "dark";
  onboardingDismissed: boolean;
  lastReviewed: string;
};
