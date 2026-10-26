"use client";

import { INITIAL_DEPOSIT_CONFIGS, type MineralType } from "../Canvas/minerals";
import { GRID_SIZE, MAP_MASK, START_CELL } from "../Canvas/mapConfig";

// ── Round Configuration Types ─────────────────────────────────────────────

export const MAX_ROUNDS = 25;

export interface StarThreshold {
  minerals: number;  // cumulative mineral target
  battery: number;   // minimum battery % remaining
}

export interface RadiationZone {
  col: number;
  row: number;
}

export interface RoundConfig {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  mineralTarget: number;         // cumulative minerals required to complete
  starThresholds: [StarThreshold, StarThreshold, StarThreshold]; // [1⭐, 2⭐, 3⭐]
  radiationZones: RadiationZone[];
  depositSeed: number;           // seed for per-round deposit layout variant
  accentColor: string;
  icon: string;
}

// ── Round Definitions ─────────────────────────────────────────────────────

const BASE_ROUNDS: RoundConfig[] = [
  {
    id: 1,
    name: "Round 1",
    subtitle: "First Contact",
    description:
      "Your rover has just landed on the Martian surface. Collect at least 50u of minerals to prove the sector is resource-rich and secure funding for deeper exploration.",
    mineralTarget: 50,
    starThresholds: [
      { minerals: 50,  battery: 0  },  // 1⭐ — objective met
      { minerals: 50,  battery: 50 },  // 2⭐ — efficient battery
      { minerals: 80,  battery: 40 },  // 3⭐ — over-target + efficient
    ],
    radiationZones: [],
    depositSeed: 42,
    accentColor: "#00d4ff",
    icon: "🛸",
  },
  {
    id: 2,
    name: "Round 2",
    subtitle: "Sector Bravo",
    description:
      "Radiation pockets have been detected in this sector. Rover battery carries over from Round 1. Collect 150u cumulative — but watch out for radiation zones that will disable your drill!",
    mineralTarget: 150,
    starThresholds: [
      { minerals: 150, battery: 0  },  // 1⭐
      { minerals: 150, battery: 35 },  // 2⭐
      { minerals: 200, battery: 25 },  // 3⭐
    ],
    radiationZones: [
      { col: 5, row: 5 },
      { col: 9, row: 6 },
      { col: 7, row: 8 },
      { col: 12, row: 7 },
    ],
    depositSeed: 77,
    accentColor: "#ffb700",
    icon: "⚠️",
  },
  {
    id: 3,
    name: "Round 3",
    subtitle: "Deep Core",
    description:
      "The deep core sector is riddled with radiation. Your cumulative goal is 300u — nearly the full sector survey. Plan your routes carefully to avoid the radiation grid.",
    mineralTarget: 300,
    starThresholds: [
      { minerals: 300, battery: 0  },  // 1⭐
      { minerals: 300, battery: 20 },  // 2⭐
      { minerals: 380, battery: 15 },  // 3⭐
    ],
    radiationZones: [
      { col: 4, row: 4 },
      { col: 7, row: 5 },
      { col: 9, row: 7 },
      { col: 5, row: 8 },
      { col: 8, row: 8 },
      { col: 9, row: 11 },
      { col: 6, row: 11 },
    ],
    depositSeed: 113,
    accentColor: "#d946ef",
    icon: "☢️",
  },
];

// ── Generated rounds (4 – 25) ─────────────────────────────────────────────

interface Cell {
  col: number;
  row: number;
}

const WALKABLE_CELLS: Cell[] = [];
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    if (MAP_MASK[row]?.[col] === 1) WALKABLE_CELLS.push({ col, row });
  }
}

const GENERATED_SUBTITLES = [
  "Red Canyon", "Frozen Ridge", "Dust Basin", "Magnetic Field", "Crystal Vein",
  "Ancient Crater", "Solar Flare", "Deep Trench", "Lost Outpost", "Ion Storm",
  "Nebula Rift", "Ash Plains", "Silent Expanse", "Iron Labyrinth",
  "Echo Caverns", "Fracture Zone", "Polar Drift", "Obsidian Maze",
  "Final Frontier", "Core Requiem", "Event Horizon", "Last Stand",
];

const GENERATED_ICONS = [
  "🛰", "⛏", "🌋", "❄", "🧭", "💠", "🌪", "🕳", "🏚", "⚡", "🌌",
  "🌑", "🌵", "🧲", "🔮", "🧱", "🧊", "🪨", "🚀", "🔥", "🛸", "🏁",
];

const GENERATED_ACCENTS = [
  "#22d3ee", "#a3e635", "#fb7185", "#f59e0b", "#8b5cf6", "#14b8a6",
  "#f43f5e", "#84cc16", "#06b6d4", "#eab308", "#ec4899", "#10b981",
];

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickCells(seed: number, count: number, excluded: Set<string>): Cell[] {
  const random = makeRng(seed);
  const pool = WALKABLE_CELLS.filter((cell) => {
    if (cell.col === START_CELL.col && cell.row === START_CELL.row) return false;
    return !excluded.has(`${cell.col},${cell.row}`);
  });
  return shuffled(pool, random).slice(0, count);
}

function mineralTargetForRound(round: number): number {
  if (round === 1) return 50;
  if (round === 2) return 150;
  if (round === 3) return 300;

  let target = 300;
  for (let n = 4; n <= round; n++) {
    target += 110 + (n - 4) * 10;
  }
  return target;
}

function generateRadiationZones(round: number): RadiationZone[] {
  const count = Math.min(3 + Math.floor((round - 4) / 2), 12);
  return pickCells(9000 + round * 131, count, new Set()).map(({ col, row }) => ({
    col,
    row,
  }));
}

function buildGeneratedRound(round: number): RoundConfig {
  const target = mineralTargetForRound(round);
  const radiationZones = generateRadiationZones(round);
  const previousTarget = mineralTargetForRound(round - 1);
  const delta = target - previousTarget;
  const index = round - 4;

  return {
    id: round,
    name: `Round ${round}`,
    subtitle: GENERATED_SUBTITLES[index % GENERATED_SUBTITLES.length],
    description:
      `Sector ${round} is ready for survey. Collect ${target}u cumulative to secure the next relay.` +
      (radiationZones.length > 0
        ? ` Avoid ${radiationZones.length} radiation pockets — they disable your drill and drain extra battery.`
        : "") +
      ` Expect roughly ${delta}u of new reserves in this sector.`,
    mineralTarget: target,
    starThresholds: [
      { minerals: target, battery: 0 },
      { minerals: target, battery: Math.max(20, 45 - round) },
      { minerals: target + 100 + round * 5, battery: Math.max(10, 30 - round) },
    ],
    radiationZones,
    depositSeed: 1000 + round * 37,
    accentColor: GENERATED_ACCENTS[index % GENERATED_ACCENTS.length],
    icon: GENERATED_ICONS[index % GENERATED_ICONS.length],
  };
}

export const ROUNDS: RoundConfig[] = [
  ...BASE_ROUNDS,
  ...Array.from({ length: MAX_ROUNDS - BASE_ROUNDS.length }, (_, i) =>
    buildGeneratedRound(i + BASE_ROUNDS.length + 1)
  ),
];

// ── Helper: get deposit key ───────────────────────────────────────────────

export function isRadiationZone(
  col: number,
  row: number,
  zones: RadiationZone[]
): boolean {
  return zones.some((z) => z.col === col && z.row === row);
}

// ── Star computation ──────────────────────────────────────────────────────

export function computeStars(
  round: RoundConfig,
  cumulativeMinerals: number,
  battery: number
): 0 | 1 | 2 | 3 {
  const [t1, t2, t3] = round.starThresholds;
  if (cumulativeMinerals < t1.minerals) return 0; // failed

  // Check from highest downward
  if (cumulativeMinerals >= t3.minerals && battery >= t3.battery) return 3;
  if (cumulativeMinerals >= t2.minerals && battery >= t2.battery) return 2;
  return 1;
}

// ── Per-round deposit configs (alternate layouts) ─────────────────────────
// Every round has its own deposit spread so the map feels fresh.
// Radiation zone coords are intentionally NOT overlapping with deposits.

export interface RoundDepositConfig {
  id: string;
  col: number;
  row: number;
  type: MineralType;
  totalAmount: number;
  remainingAmount: number;
  maxYieldPerDrill: number;
}

export const ROUND2_DEPOSITS: RoundDepositConfig[] = [
  // Central (avoiding radiation at 5,5 and 9,6)
  { id: "r2-1",  col: 7, row: 6, type: "cuprion",   totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "r2-2",  col: 8, row: 7, type: "pythorium",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "r2-3",  col: 6, row: 7, type: "javium",  totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "r2-4",  col: 8, row: 6, type: "cuprion", totalAmount: 60,  remainingAmount: 60,  maxYieldPerDrill: 30 },
  { id: "r2-5",  col: 5, row: 7, type: "pythorium",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  // North
  { id: "r2-6",  col: 4, row: 4, type: "javium",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r2-7",  col: 7, row: 4, type: "cuprion",   totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "r2-8",  col: 10, row: 4, type: "pythorium", totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  // East
  { id: "r2-9",  col: 13, row: 6, type: "javium",  totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "r2-10", col: 14, row: 8, type: "cuprion",  totalAmount: 75,  remainingAmount: 75,  maxYieldPerDrill: 35 },
  // South
  { id: "r2-11", col: 4, row: 12, type: "pythorium",   totalAmount: 85,  remainingAmount: 85,  maxYieldPerDrill: 40 },
  { id: "r2-12", col: 7, row: 11, type: "javium", totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "r2-13", col: 9, row: 11, type: "cuprion",  totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  // West
  { id: "r2-14", col: 1, row: 7, type: "pythorium",   totalAmount: 75,  remainingAmount: 75,  maxYieldPerDrill: 35 },
  { id: "r2-15", col: 1, row: 8, type: "javium", totalAmount: 65,  remainingAmount: 65,  maxYieldPerDrill: 30 },
  // Corners
  { id: "r2-16", col: 11, row: 3, type: "cuprion",  totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r2-17", col: 3, row: 11, type: "pythorium",  totalAmount: 95,  remainingAmount: 95,  maxYieldPerDrill: 45 },
  { id: "r2-18", col: 10, row: 11, type: "javium", totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
];

export const ROUND3_DEPOSITS: RoundDepositConfig[] = [
  // Dense central cluster
  { id: "r3-1",  col: 7, row: 7, type: "cuprion", totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r3-2",  col: 6, row: 6, type: "pythorium",   totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-3",  col: 8, row: 6, type: "javium",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-4",  col: 5, row: 7, type: "cuprion",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-5",  col: 8, row: 7, type: "pythorium",   totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  // North
  { id: "r3-6",  col: 3, row: 3, type: "javium",  totalAmount: 110, remainingAmount: 110, maxYieldPerDrill: 55 },
  { id: "r3-7",  col: 6, row: 4, type: "cuprion", totalAmount: 95,  remainingAmount: 95,  maxYieldPerDrill: 45 },
  { id: "r3-8",  col: 9, row: 4, type: "pythorium",   totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-9",  col: 12, row: 3, type: "javium",  totalAmount: 110, remainingAmount: 110, maxYieldPerDrill: 55 },
  // East
  { id: "r3-10", col: 14, row: 7, type: "cuprion", totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r3-11", col: 13, row: 8, type: "pythorium",  totalAmount: 95,  remainingAmount: 95,  maxYieldPerDrill: 45 },
  // South
  { id: "r3-12", col: 4, row: 12, type: "javium",  totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r3-13", col: 7, row: 12, type: "cuprion",   totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-14", col: 10, row: 12, type: "pythorium", totalAmount: 110, remainingAmount: 110, maxYieldPerDrill: 55 },
  // West
  { id: "r3-15", col: 1, row: 5, type: "javium",   totalAmount: 85,  remainingAmount: 85,  maxYieldPerDrill: 40 },
  { id: "r3-16", col: 1, row: 9, type: "cuprion",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-17", col: 3, row: 7, type: "pythorium",  totalAmount: 85,  remainingAmount: 85,  maxYieldPerDrill: 40 },
  // Corners
  { id: "r3-18", col: 10, row: 11, type: "javium", totalAmount: 120, remainingAmount: 120, maxYieldPerDrill: 60 },
  { id: "r3-19", col: 3, row: 12, type: "cuprion",  totalAmount: 115, remainingAmount: 115, maxYieldPerDrill: 55 },
];

const DEPOSIT_TYPES: MineralType[] = ["cuprion", "pythorium", "javium"];

function buildGeneratedDeposits(round: number): RoundDepositConfig[] {
  const config = ROUNDS[round - 1];
  const previousTarget = ROUNDS[round - 2]?.mineralTarget ?? 0;
  const delta = config.mineralTarget - previousTarget;
  const count = 14 + ((round * 3) % 5);
  const needed = Math.max(200, delta * 2.5);
  const totalAmount = Math.max(60, Math.ceil(needed / count / 5) * 5);
  const maxYieldPerDrill = Math.max(20, Math.ceil(totalAmount / 2 / 5) * 5);

  const excluded = new Set(
    config.radiationZones.map((zone) => `${zone.col},${zone.row}`)
  );
  const cells = pickCells(config.depositSeed, count, excluded);

  return cells.map(({ col, row }, i) => ({
    id: `r${round}-${i + 1}`,
    col,
    row,
    type: DEPOSIT_TYPES[i % DEPOSIT_TYPES.length],
    totalAmount,
    remainingAmount: totalAmount,
    maxYieldPerDrill,
  }));
}

const GENERATED_DEPOSITS: Record<number, RoundDepositConfig[]> = {};
for (let round = 4; round <= MAX_ROUNDS; round++) {
  GENERATED_DEPOSITS[round] = buildGeneratedDeposits(round);
}

export function getDepositsForRound(round: number): RoundDepositConfig[] {
  if (round === 1) {
    return INITIAL_DEPOSIT_CONFIGS.map((deposit) => ({
      ...deposit,
      remainingAmount: deposit.totalAmount,
    }));
  }
  if (round === 2) return ROUND2_DEPOSITS;
  if (round === 3) return ROUND3_DEPOSITS;
  return GENERATED_DEPOSITS[round] ?? [];
}
