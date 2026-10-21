"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MineralType,
  MineralDeposit,
  MINERAL_METAS,
  createInitialDepositsMap,
  getDepositKey,
} from "./minerals";
import type { RadiationZone } from "../rounds/roundsConfig";
import { GRID_SIZE, MAP_MASK } from "./mapConfig";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RoverAction {
  action: string;
  direction?: "FRONT" | "BACK" | "RIGHT" | "LEFT";
  turn?: "LEFT" | "RIGHT";
  amount?: number;
  message?: string;
  schema?: string;
}

export type RoverFacing = "FRONT" | "BACK" | "RIGHT" | "LEFT";

export interface DrillResult {
  success: boolean;
  type: MineralType;
  amount: number;
  remaining: number;
  tileCol: number;
  tileRow: number;
  message: string;
  timestamp: number;
}

export interface RoverInventory {
  lithium: number;
  xenocryst: number;
  titanium: number;
  hematite: number;
  regolith: number;
}

export interface RoverState {
  col: number;
  row: number;
  facing: RoverFacing;
  battery: number;
  minerals: number;
  scans: number;
  actionIndex: number;
  isMoving: boolean;
  isDrilling: boolean;
  cargoCapacity: number;
  inventory: RoverInventory;
  lastDrillResult: DrillResult | null;
  deposits: Record<string, MineralDeposit>;
  drilledHoles: Array<{ col: number; row: number; count: number }>;
}

export interface AnimationState {
  roverState: RoverState;
  isPlaying: boolean;
  isFinished: boolean;
  speed: number; // ms per action
  progress: number; // 0..1 within current move
  currentAction: RoverAction | null;
}

// Battery costs per action
const BATTERY_COSTS: Record<string, number> = {
  DRIVE: 5,
  DRILL: 15,
  SCAN: 3,
  CHARGE: -20, // recharges
  TURN: 1,
  GET_POSITION: 0,
  LOG: 0,
};

const BASE_STATE: Omit<RoverState, "deposits"> = {
  col: 7,
  row: 7,
  facing: "FRONT",
  battery: 100,
  minerals: 0,
  scans: 0,
  actionIndex: -1,
  isMoving: false,
  isDrilling: false,
  cargoCapacity: 250,
  inventory: {
    lithium: 0,
    xenocryst: 0,
    titanium: 0,
    hematite: 0,
    regolith: 0,
  },
  lastDrillResult: null,
  drilledHoles: [],
};

function makeInitialState(
  customDeposits?: Parameters<typeof createInitialDepositsMap>[0]
): RoverState {
  return {
    ...BASE_STATE,
    deposits: createInitialDepositsMap(customDeposits),
  };
}

const DIRECTION_DELTA: Record<string, { dc: number; dr: number }> = {
  FRONT: { dc: 0,  dr: -1 },
  BACK:  { dc: 0,  dr: 1  },
  RIGHT: { dc: 1,  dr: 0  },
  LEFT:  { dc: -1, dr: 0  },
};

const TURN_MAP: Record<RoverFacing, { LEFT: RoverFacing; RIGHT: RoverFacing }> = {
  FRONT: { LEFT: "LEFT",  RIGHT: "RIGHT" },
  RIGHT: { LEFT: "FRONT", RIGHT: "BACK"  },
  BACK:  { LEFT: "RIGHT", RIGHT: "LEFT"  },
  LEFT:  { LEFT: "BACK",  RIGHT: "FRONT" },
};



function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useRoverAnimation(
  actions: RoverAction[],
  radiationZones: RadiationZone[] = [],
  initialBattery = 100,
  initialInventory?: RoverInventory,
  customDeposits?: Parameters<typeof createInitialDepositsMap>[0]
) {
  const [state, setState] = useState<RoverState>(() => ({
    ...makeInitialState(customDeposits),
    battery: initialBattery,
    inventory: initialInventory ?? {
      lithium: 0, xenocryst: 0, titanium: 0, hematite: 0, regolith: 0,
    },
  }));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [speed, setSpeed] = useState(400); // ms per action
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState<RoverAction | null>(null);

  // Refs for animation loop
  const stateRef       = useRef(state);
  const actionsRef     = useRef(actions);
  const speedRef       = useRef(speed);
  const isPlayingRef   = useRef(isPlaying);
  const rafRef         = useRef<number | null>(null);
  const lastTickRef    = useRef<number>(0);
  const actionIdxRef   = useRef<number>(-1);
  const tickRef        = useRef<(ts: number) => void>(() => {});

  // Keep refs in sync
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { actionsRef.current = actions; }, [actions]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Apply a single action to state
  const applyAction = useCallback((action: RoverAction, prev: RoverState): RoverState => {
    const cost = BATTERY_COSTS[action.action] ?? 0;

    switch (action.action) {
      case "DRIVE": {
        const rawDir = (action.direction ?? prev.facing).toUpperCase();
        const dir: RoverFacing =
          rawDir === "NORTH" ? "FRONT" :
          rawDir === "SOUTH" ? "BACK" :
          rawDir === "EAST"  ? "RIGHT" :
          rawDir === "WEST"  ? "LEFT" :
          (rawDir as RoverFacing);
        const delta = DIRECTION_DELTA[dir] ?? { dc: 0, dr: 0 };
        let nextCol = prev.col + delta.dc;
        let nextRow = prev.row + delta.dr;
        
        if (
          nextCol < 0 || nextCol >= GRID_SIZE ||
          nextRow < 0 || nextRow >= GRID_SIZE ||
          MAP_MASK[nextRow]?.[nextCol] === 0
        ) {
          // Block movement into void or out of bounds
          nextCol = prev.col;
          nextRow = prev.row;
        }
        // Radiation zone: extra +5 battery drain on entry
        const onRadiation = radiationZones.some((z) => z.col === nextCol && z.row === nextRow);
        const extraCost = onRadiation ? 5 : 0;
        const newBattery = clamp(prev.battery - cost - extraCost, 0, 100);
        return {
          ...prev,
          col: nextCol,
          row: nextRow,
          facing: dir,
          battery: newBattery,
          isMoving: true,
          isDrilling: false,
        };
      }

      case "DRILL": {
        const onRadiation = radiationZones.some((z) => z.col === prev.col && z.row === prev.row);
        if (onRadiation) {
          const drillResult: DrillResult = {
            success: false,
            type: "regolith",
            amount: 0,
            remaining: 0,
            tileCol: prev.col,
            tileRow: prev.row,
            message: "☢️ Drill blocked: Radiation field detected — relocate before drilling",
            timestamp: Date.now(),
          };
          return {
            ...prev,
            battery: Math.max(0, prev.battery - 2),
            isDrilling: true,
            lastDrillResult: drillResult,
          };
        }

        // Battery check
        if (prev.battery < 15) {
          const drillResult: DrillResult = {
            success: false,
            type: "regolith",
            amount: 0,
            remaining: 0,
            tileCol: prev.col,
            tileRow: prev.row,
            message: "Drill stalled: Insufficient battery power (15% required)",
            timestamp: Date.now(),
          };
          return {
            ...prev,
            battery: Math.max(0, prev.battery - 4),
            isDrilling: true,
            lastDrillResult: drillResult,
          };
        }

        const depKey = getDepositKey(prev.col, prev.row);
        const deposit = prev.deposits[depKey];

        let drillType: MineralType = "regolith";
        let extractedAmount = 0;
        let remainingInDeposit = 0;
        let msg = "";
        const nextDeposits = { ...prev.deposits };

        if (deposit && !deposit.depleted && deposit.remainingAmount > 0) {
          drillType = deposit.type;
          extractedAmount = Math.min(deposit.maxYieldPerDrill, deposit.remainingAmount);
          remainingInDeposit = deposit.remainingAmount - extractedAmount;
          nextDeposits[depKey] = {
            ...deposit,
            remainingAmount: remainingInDeposit,
            depleted: remainingInDeposit <= 0,
          };
          const meta = MINERAL_METAS[drillType];
          msg = remainingInDeposit <= 0
            ? `Excavated deposit! +${extractedAmount} ${meta.shortName} (Vein depleted)`
            : `Core drill extracted +${extractedAmount} ${meta.shortName}! (${remainingInDeposit} remaining)`;
        } else if (deposit && deposit.depleted) {
          drillType = "regolith";
          extractedAmount = 2;
          msg = `Mineral vein depleted. Extracted trace regolith (+2)`;
        } else {
          drillType = "regolith";
          extractedAmount = 4;
          msg = `Surface borehole drilled. Extracted Martian regolith (+4)`;
        }

        // Apply cargo capacity limit
        const currentTotal = prev.minerals;
        const capacityRoom = Math.max(0, prev.cargoCapacity - currentTotal);
        const actualYield = Math.min(extractedAmount, capacityRoom);

        const nextInventory: RoverInventory = {
          ...prev.inventory,
          [drillType]: prev.inventory[drillType] + actualYield,
        };

        // Track borehole crater
        const holeIdx = prev.drilledHoles.findIndex(
          (h) => h.col === prev.col && h.row === prev.row
        );
        const nextHoles = [...prev.drilledHoles];
        if (holeIdx >= 0) {
          nextHoles[holeIdx] = {
            ...nextHoles[holeIdx],
            count: nextHoles[holeIdx].count + 1,
          };
        } else {
          nextHoles.push({ col: prev.col, row: prev.row, count: 1 });
        }

        const drillResult: DrillResult = {
          success: true,
          type: drillType,
          amount: actualYield,
          remaining: remainingInDeposit,
          tileCol: prev.col,
          tileRow: prev.row,
          message: capacityRoom < extractedAmount ? `${msg} [Cargo Full]` : msg,
          timestamp: Date.now(),
        };

        return {
          ...prev,
          battery: clamp(prev.battery - BATTERY_COSTS["DRILL"], 0, 100),
          minerals: currentTotal + actualYield,
          inventory: nextInventory,
          isDrilling: true,
          lastDrillResult: drillResult,
          deposits: nextDeposits,
          drilledHoles: nextHoles,
        };
      }

      case "SCAN":
        return {
          ...prev,
          scans: prev.scans + 1,
          battery: clamp(prev.battery - BATTERY_COSTS["SCAN"], 0, 100),
          isDrilling: false,
        };

      case "CHARGE":
        return {
          ...prev,
          battery: clamp(prev.battery + (action.amount ?? 20), 0, 100),
          isDrilling: false,
        };

      case "TURN": {
        const dir = action.turn ?? "LEFT";
        return {
          ...prev,
          facing: TURN_MAP[prev.facing][dir],
          battery: clamp(prev.battery - BATTERY_COSTS["TURN"], 0, 100),
          isDrilling: false,
        };
      }

      default:
        return { ...prev, battery: clamp(prev.battery - (BATTERY_COSTS[action.action] ?? 0), 0, 100), isDrilling: false };
    }
  }, [radiationZones]);

  // Animation loop using requestAnimationFrame
  const tick = useCallback((timestamp: number) => {
    if (!isPlayingRef.current) return;

    const elapsed = timestamp - lastTickRef.current;
    const actionDuration = speedRef.current;

    if (elapsed >= actionDuration) {
      const nextIdx = actionIdxRef.current + 1;
      const acts = actionsRef.current;

      if (nextIdx >= acts.length) {
        setIsPlaying(false);
        setIsFinished(true);
        setProgress(1);
        setCurrentAction(null);
        setState((prev) => ({ ...prev, isMoving: false, isDrilling: false }));
        return;
      }

      actionIdxRef.current = nextIdx;
      lastTickRef.current = timestamp;

      const action = acts[nextIdx];
      setCurrentAction(action);

      setState((prev) => {
        const next = applyAction(action, prev);
        stateRef.current = next;
        return { ...next, actionIndex: nextIdx };
      });
    } else {
      setProgress(Math.min(elapsed / actionDuration, 1));
    }

    rafRef.current = requestAnimationFrame((ts) => tickRef.current(ts));
  }, [applyAction]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // Start/pause playback
  const play = useCallback(() => {
    if (isFinished) return;
    lastTickRef.current = performance.now();
    setIsPlaying(true);
    isPlayingRef.current = true;
    rafRef.current = requestAnimationFrame((ts) => tickRef.current(ts));
  }, [isFinished]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    pause();
    actionIdxRef.current = -1;
    setIsFinished(false);
    setProgress(0);
    setCurrentAction(null);
    const fresh: RoverState = {
      ...makeInitialState(customDeposits),
      battery: initialBattery,
      inventory: initialInventory ?? {
        lithium: 0, xenocryst: 0, titanium: 0, hematite: 0, regolith: 0,
      },
    };
    setState(fresh);
    stateRef.current = fresh;
  }, [pause, customDeposits, initialBattery, initialInventory]);

  // Auto-play when new actions arrive
  useEffect(() => {
    queueMicrotask(() => reset());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    roverState: state,
    isPlaying,
    isFinished,
    speed,
    setSpeed,
    progress,
    currentAction,
    play,
    pause,
    reset,
    totalActions: actions.length,
  } as const;
}
