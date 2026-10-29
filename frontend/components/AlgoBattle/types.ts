export type BattleStatus =
  | "WAITING"
  | "COUNTDOWN"
  | "CODING"
  | "EVALUATION"
  | "FINISHED";

export type BattleProblem = {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  description: string;
  constraints: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  sampleTests: Array<{ label: string; input: string; output: string }>;
  starterCode: Record<string, string>;
  tags: string[];
};

export type BattlePlayer = {
  user_id: number;
  username: string;
  ready: boolean;
  submitted: boolean;
  connected: boolean;
  status: string;
  passed_tests: number;
  total_tests: number;
  forfeited: boolean;
};

export type BattleTestFailure = {
  label: string;
  expected: string;
  got: string;
};

export type ProfileResult = {
  all_passed: boolean;
  passed_count: number;
  total_count: number;
  time_ms: number;
  memory_kb: number;
  error: string | null;
  failures: BattleTestFailure[];
  timed_out: boolean;
  largest_ms: number;
  largest_n: number;
  language: string;
};

export type PlayerResult = {
  side: "p1" | "p2";
  user_id: number;
  username: string;
  language: string;
  code: string;
  submitted_at: number | null;
  all_passed: boolean;
  passed_count: number;
  total_count: number;
  time_ms: number;
  memory_kb: number;
  error: string | null;
  failures: BattleTestFailure[];
  timed_out: boolean;
  big_o: string;
  hp: number;
  max_hp: number;
  damage_dealt: number;
  damage_taken: number;
  shield: number;
  shield_absorbed: number;
  forfeited: boolean;
};

export type CombatEvent = {
  at: number;
  type: string;
  source: string;
  target: string;
  amount: number;
  raw?: number;
  message: string;
};

export type RatingChange = {
  before: number;
  after: number;
  delta: number;
  rank_tier: string;
};

export type BattleResult = {
  winner: "p1" | "p2" | "draw";
  winner_id: number | null;
  problem_id: string;
  problem_title: string;
  problem: BattleProblem;
  p1: PlayerResult;
  p2: PlayerResult;
  combatLog: CombatEvent[];
  evaluated_at: number;
  ratings?: Record<string, RatingChange>;
};

export type BattleRoomState = {
  roomCode: string;
  mode: string;
  status: BattleStatus;
  players: BattlePlayer[];
  problem: BattleProblem | null;
  startedAt: number | null;
  durationSeconds: number;
  remainingSeconds: number;
  result: BattleResult | null;
};

export type BattleMatch = {
  problem: BattleProblem;
  durationSeconds: number;
  endsAt: number;
  startedAt: number;
};

export type BattleRating = {
  user_id: number;
  username?: string;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  submissions: number;
  rank_tier: string;
};

export type BattleSocketMessage = {
  type: string;
  [key: string]: unknown;
};
