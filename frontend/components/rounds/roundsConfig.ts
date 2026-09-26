"use client";


// ── Round Configuration Types ─────────────────────────────────────────────

export interface StarThreshold {
  minerals: number;  // cumulative mineral target
  battery: number;   // minimum battery % remaining
}

export interface RadiationZone {
  col: number;
  row: number;
}

export interface RoundConfig {
  id: 1 | 2 | 3;
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

export const ROUNDS: RoundConfig[] = [
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
      { col: 6, row: 9 },
      { col: 10, row: 8 },
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
      { col: 10, row: 5 },
      { col: 5, row: 8 },
      { col: 8, row: 8 },
      { col: 9, row: 10 },
      { col: 6, row: 10 },
    ],
    depositSeed: 113,
    accentColor: "#d946ef",
    icon: "☢️",
  },
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
// Round 2 & 3 use a different deposit spread so the map feels fresh.
// Radiation zone coords are intentionally NOT overlapping with deposits.

import type { MineralType } from "../Canvas/minerals";

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
  // Central (avoiding radiation at 2,2 and 6,3)
  { id: "r2-1",  col: 7, row: 6, type: "lithium",   totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "r2-2",  col: 8, row: 7, type: "titanium",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "r2-3",  col: 6, row: 8, type: "hematite",  totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "r2-4",  col: 8, row: 6, type: "xenocryst", totalAmount: 60,  remainingAmount: 60,  maxYieldPerDrill: 30 },
  { id: "r2-5",  col: 6, row: 7, type: "hematite",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  // North (avoiding 6,3 radiation)
  { id: "r2-6",  col: 4, row: 4, type: "titanium",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r2-7",  col: 7, row: 4, type: "lithium",   totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "r2-8",  col: 10, row: 4, type: "xenocryst", totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  // East
  { id: "r2-9",  col: 11, row: 6, type: "hematite",  totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "r2-10", col: 11, row: 8, type: "titanium",  totalAmount: 75,  remainingAmount: 75,  maxYieldPerDrill: 35 },
  // South (avoiding 3,6 radiation)
  { id: "r2-11", col: 4, row: 10, type: "lithium",   totalAmount: 85,  remainingAmount: 85,  maxYieldPerDrill: 40 },
  { id: "r2-12", col: 7, row: 11, type: "xenocryst", totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "r2-13", col: 9, row: 11, type: "hematite",  totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  // West (avoiding 7,5 radiation)
  { id: "r2-14", col: 3, row: 6, type: "lithium",   totalAmount: 75,  remainingAmount: 75,  maxYieldPerDrill: 35 },
  { id: "r2-15", col: 3, row: 9, type: "xenocryst", totalAmount: 65,  remainingAmount: 65,  maxYieldPerDrill: 30 },
  // Corners
  { id: "r2-16", col: 11, row: 3, type: "titanium",  totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r2-17", col: 3, row: 11, type: "hematite",  totalAmount: 95,  remainingAmount: 95,  maxYieldPerDrill: 45 },
  { id: "r2-18", col: 11, row: 11, type: "xenocryst", totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
];

export const ROUND3_DEPOSITS: RoundDepositConfig[] = [
  // Dense central cluster (avoiding many radiation zones)
  { id: "r3-1",  col: 7, row: 7, type: "xenocryst", totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r3-2",  col: 6, row: 6, type: "lithium",   totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-3",  col: 8, row: 6, type: "titanium",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-4",  col: 6, row: 8, type: "hematite",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-5",  col: 8, row: 7, type: "lithium",   totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  // North (avoiding 1,1 / 4,2 / 7,2)
  { id: "r3-6",  col: 3, row: 3, type: "titanium",  totalAmount: 110, remainingAmount: 110, maxYieldPerDrill: 55 },
  { id: "r3-7",  col: 6, row: 4, type: "xenocryst", totalAmount: 95,  remainingAmount: 95,  maxYieldPerDrill: 45 },
  { id: "r3-8",  col: 9, row: 4, type: "lithium",   totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-9",  col: 11, row: 3, type: "hematite",  totalAmount: 110, remainingAmount: 110, maxYieldPerDrill: 55 },
  // East
  { id: "r3-10", col: 11, row: 6, type: "xenocryst", totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r3-11", col: 11, row: 9, type: "titanium",  totalAmount: 95,  remainingAmount: 95,  maxYieldPerDrill: 45 },
  // South (avoiding 6,7 / 3,7)
  { id: "r3-12", col: 4, row: 11, type: "hematite",  totalAmount: 100, remainingAmount: 100, maxYieldPerDrill: 50 },
  { id: "r3-13", col: 7, row: 11, type: "lithium",   totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-14", col: 10, row: 11, type: "xenocryst", totalAmount: 110, remainingAmount: 110, maxYieldPerDrill: 55 },
  // West (avoiding 2,5)
  { id: "r3-15", col: 3, row: 5, type: "lithium",   totalAmount: 85,  remainingAmount: 85,  maxYieldPerDrill: 40 },
  { id: "r3-16", col: 3, row: 9, type: "titanium",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "r3-17", col: 4, row: 7, type: "hematite",  totalAmount: 85,  remainingAmount: 85,  maxYieldPerDrill: 40 },
  // Corners
  { id: "r3-18", col: 11, row: 11, type: "xenocryst", totalAmount: 120, remainingAmount: 120, maxYieldPerDrill: 60 },
  { id: "r3-19", col: 3, row: 11, type: "titanium",  totalAmount: 115, remainingAmount: 115, maxYieldPerDrill: 55 },
];
