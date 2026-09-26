"use client";

import { useState, useCallback } from "react";
import {
  ROUNDS,
  RoundConfig,
  computeStars,
  ROUND2_DEPOSITS,
  ROUND3_DEPOSITS,
  RoundDepositConfig,
} from "./roundsConfig";
import { INITIAL_DEPOSIT_CONFIGS } from "../Canvas/minerals";
import type { RoverInventory } from "../Canvas/useRoverAnimation";

// ── Types ─────────────────────────────────────────────────────────────────

export type RoundStatus = "playing" | "complete" | "victory";

export interface RoundManagerState {
  currentRound: 1 | 2 | 3;
  roundStatus: RoundStatus;
  starsEarned: [number, number, number]; // per round 1,2,3
  cumulativeMinerals: number;
  persistentBattery: number;
  persistentInventory: RoverInventory;
  showCompleteModal: boolean;
  showVictoryScreen: boolean;
}

export interface RoundManagerAPI {
  state: RoundManagerState;
  currentRoundConfig: RoundConfig;
  getDepositsForRound: (round: 1 | 2 | 3) => RoundDepositConfig[];
  handleRoundFinished: (minerals: number, battery: number, inventory: RoverInventory) => void;
  advanceRound: () => void;
  dismissModal: () => void;
  resetAll: () => void;
}

// ── Deposit helpers ───────────────────────────────────────────────────────

function toRoundDepositConfig(
  src: typeof INITIAL_DEPOSIT_CONFIGS
): RoundDepositConfig[] {
  return src.map((d) => ({ ...d, remainingAmount: d.totalAmount }));
}

// ── Hook ──────────────────────────────────────────────────────────────────

const EMPTY_INVENTORY: RoverInventory = {
  lithium: 0,
  xenocryst: 0,
  titanium: 0,
  hematite: 0,
  regolith: 0,
};

const INITIAL_STATE: RoundManagerState = {
  currentRound: 1,
  roundStatus: "playing",
  starsEarned: [0, 0, 0],
  cumulativeMinerals: 0,
  persistentBattery: 100,
  persistentInventory: { ...EMPTY_INVENTORY },
  showCompleteModal: false,
  showVictoryScreen: false,
};

export function useRoundManager(): RoundManagerAPI {
  const [state, setState] = useState<RoundManagerState>({ ...INITIAL_STATE });

  const currentRoundConfig = ROUNDS[state.currentRound - 1];

  const getDepositsForRound = useCallback(
    (round: 1 | 2 | 3): RoundDepositConfig[] => {
      if (round === 1) return toRoundDepositConfig(INITIAL_DEPOSIT_CONFIGS);
      if (round === 2) return ROUND2_DEPOSITS;
      return ROUND3_DEPOSITS;
    },
    []
  );

  /** Called by page.tsx when the animation finishes (isFinished becomes true). */
  const handleRoundFinished = useCallback(
    (minerals: number, battery: number, inventory: RoverInventory) => {
      setState((prev) => {
        if (prev.roundStatus !== "playing") return prev; // guard double-calls

        const cumulative = prev.cumulativeMinerals + minerals;
        const stars = computeStars(currentRoundConfig, cumulative, battery);
        const idx = prev.currentRound - 1;
        const newStars = [...prev.starsEarned] as [number, number, number];
        newStars[idx] = stars;

        const isLastRound = prev.currentRound === 3;

        return {
          ...prev,
          roundStatus: isLastRound ? "victory" : "complete",
          starsEarned: newStars,
          cumulativeMinerals: cumulative,
          persistentBattery: battery,
          persistentInventory: { ...inventory },
          showCompleteModal: !isLastRound,
          showVictoryScreen: isLastRound,
        };
      });
    },
    [currentRoundConfig]
  );

  /** Advance to the next round (called from the RoundCompleteModal). */
  const advanceRound = useCallback(() => {
    setState((prev) => {
      if (prev.currentRound >= 3) return prev;
      return {
        ...prev,
        currentRound: (prev.currentRound + 1) as 1 | 2 | 3,
        roundStatus: "playing",
        showCompleteModal: false,
        showVictoryScreen: false,
      };
    });
  }, []);

  /** Close/dismiss modals without advancing (e.g. replay a round). */
  const dismissModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showCompleteModal: false,
      showVictoryScreen: false,
    }));
  }, []);

  /** Full reset back to Round 1. */
  const resetAll = useCallback(() => {
    setState({ ...INITIAL_STATE, persistentInventory: { ...EMPTY_INVENTORY } });
  }, []);

  return {
    state,
    currentRoundConfig,
    getDepositsForRound,
    handleRoundFinished,
    advanceRound,
    dismissModal,
    resetAll,
  };
}
