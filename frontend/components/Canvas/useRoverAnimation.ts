"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RoverAction {
  action: string;
  direction?: "NORTH" | "SOUTH" | "EAST" | "WEST";
  turn?: "LEFT" | "RIGHT";
  amount?: number;
  message?: string;
  schema?: string;
}

export type RoverFacing = "NORTH" | "SOUTH" | "EAST" | "WEST";

export interface RoverState {
  col: number;
  row: number;
  facing: RoverFacing;
  battery: number;
  minerals: number;
  scans: number;
  actionIndex: number;
  isMoving: boolean;
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

const INITIAL_STATE: RoverState = {
  col: 7,
  row: 7,
  facing: "NORTH",
  battery: 100,
  minerals: 0,
  scans: 0,
  actionIndex: -1,
  isMoving: false,
};

const DIRECTION_DELTA: Record<string, { dc: number; dr: number }> = {
  NORTH: { dc: 0,  dr: -1 },
  SOUTH: { dc: 0,  dr: 1  },
  EAST:  { dc: 1,  dr: 0  },
  WEST:  { dc: -1, dr: 0  },
};

const TURN_MAP: Record<RoverFacing, { LEFT: RoverFacing; RIGHT: RoverFacing }> = {
  NORTH: { LEFT: "WEST",  RIGHT: "EAST"  },
  EAST:  { LEFT: "NORTH", RIGHT: "SOUTH" },
  SOUTH: { LEFT: "EAST",  RIGHT: "WEST"  },
  WEST:  { LEFT: "SOUTH", RIGHT: "NORTH" },
};

const GRID_SIZE = 15;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useRoverAnimation(actions: RoverAction[]) {
  const [state, setState] = useState<RoverState>({ ...INITIAL_STATE });
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

  // Keep refs in sync
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { actionsRef.current = actions; }, [actions]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Apply a single action to state
  const applyAction = useCallback((action: RoverAction, prev: RoverState): RoverState => {
    const cost = BATTERY_COSTS[action.action] ?? 0;
    const newBattery = clamp(prev.battery - cost, 0, 100);

    switch (action.action) {
      case "DRIVE": {
        const dir = action.direction ?? prev.facing;
        const delta = DIRECTION_DELTA[dir];
        return {
          ...prev,
          col: clamp(prev.col + delta.dc, 0, GRID_SIZE - 1),
          row: clamp(prev.row + delta.dr, 0, GRID_SIZE - 1),
          facing: dir,
          battery: newBattery,
        };
      }
      case "DRILL":
        return { ...prev, minerals: prev.minerals + 10, battery: newBattery };
      case "SCAN":
        return { ...prev, scans: prev.scans + 1, battery: newBattery };
      case "CHARGE":
        return { ...prev, battery: clamp(prev.battery + (action.amount ?? 20), 0, 100) };
      case "TURN": {
        const dir = action.turn ?? "LEFT";
        return {
          ...prev,
          facing: TURN_MAP[prev.facing][dir],
          battery: newBattery,
        };
      }
      default:
        return { ...prev, battery: newBattery };
    }
  }, []);

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

    rafRef.current = requestAnimationFrame(tick);
  }, [applyAction]);

  // Start/pause playback
  const play = useCallback(() => {
    if (isFinished) return;
    lastTickRef.current = performance.now();
    setIsPlaying(true);
    isPlayingRef.current = true;
    rafRef.current = requestAnimationFrame(tick);
  }, [isFinished, tick]);

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
    const fresh = { ...INITIAL_STATE };
    setState(fresh);
    stateRef.current = fresh;
  }, [pause]);

  // Auto-play when new actions arrive
  useEffect(() => {
    reset();
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
