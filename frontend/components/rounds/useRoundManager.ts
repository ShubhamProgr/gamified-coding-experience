"use client";

import { useState, useCallback } from "react";
import {
  ROUNDS,
  MAX_ROUNDS,
  RoundConfig,
  computeStars,
  getDepositsForRound,
  RoundDepositConfig,
} from "./roundsConfig";
import type { RoverInventory } from "../Canvas/useRoverAnimation";
import type { Building } from "../buildings/buildingsConfig";

// ── Types ─────────────────────────────────────────────────────────────────

export type RoundStatus = "playing" | "complete" | "victory";

export interface RoundManagerState {
  currentRound: number;
  roundStatus: RoundStatus;
  starsEarned: number[]; // per round 1..MAX_ROUNDS
  cumulativeMinerals: number;
  persistentBattery: number;
  persistentInventory: RoverInventory;
  buildings: Building[];
  showCompleteModal: boolean;
  showVictoryScreen: boolean;
}

export interface RoundManagerAPI {
  state: RoundManagerState;
  currentRoundConfig: RoundConfig;
  getDepositsForRound: (round: number) => RoundDepositConfig[];
  handleRoundFinished: (minerals: number, battery: number, inventory: RoverInventory) => void;
  advanceRound: () => void;
  dismissModal: () => void;
  resetAll: () => void;
  addBuilding: (building: Building) => void;
  syncInventory: (inventory: RoverInventory) => void;
  hydrate: (saved: Partial<RoundManagerState>) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────

const EMPTY_INVENTORY: RoverInventory = {
  cuprion: 0,
  pythorium: 0,
  javium: 0,
};

const INITIAL_STATE: RoundManagerState = {
  currentRound: 1,
  roundStatus: "playing",
  starsEarned: Array.from({ length: MAX_ROUNDS }, () => 0),
  cumulativeMinerals: 0,
  persistentBattery: 100,
  persistentInventory: { ...EMPTY_INVENTORY },
  buildings: [],
  showCompleteModal: false,
  showVictoryScreen: false,
};

export function useRoundManager(): RoundManagerAPI {
  const [state, setState] = useState<RoundManagerState>({ ...INITIAL_STATE });

  const currentRoundConfig = ROUNDS[state.currentRound - 1];

  const getDeposits = useCallback(
    (round: number): RoundDepositConfig[] => getDepositsForRound(round),
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
        const newStars = [...prev.starsEarned];
        newStars[idx] = stars;

        const isLastRound = prev.currentRound >= MAX_ROUNDS;

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
      if (prev.currentRound >= MAX_ROUNDS) return prev;
      return {
        ...prev,
        currentRound: prev.currentRound + 1,
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
    setState({
      ...INITIAL_STATE,
      starsEarned: Array.from({ length: MAX_ROUNDS }, () => 0),
      persistentInventory: { ...EMPTY_INVENTORY },
      buildings: [],
    });
  }, []);

  /** Persist a newly placed building across rounds. */
  const addBuilding = useCallback((building: Building) => {
    setState((prev) => ({
      ...prev,
      buildings: [...prev.buildings, building],
    }));
  }, []);

  /** Keep the carried inventory in sync after spending minerals. */
  const syncInventory = useCallback((inventory: RoverInventory) => {
    setState((prev) => ({
      ...prev,
      persistentInventory: { ...inventory },
    }));
  }, []);

  const hydrate = useCallback((saved: Partial<RoundManagerState>) => {
    setState((prev) => {
      const next = { ...prev };
      if (typeof saved.currentRound === "number") next.currentRound = saved.currentRound;
      if (typeof saved.cumulativeMinerals === "number") {
        next.cumulativeMinerals = saved.cumulativeMinerals;
      }
      if (typeof saved.persistentBattery === "number") {
        next.persistentBattery = saved.persistentBattery;
      }
      if (saved.starsEarned) {
        next.starsEarned = Array.from(
          { length: MAX_ROUNDS },
          (_, index) => saved.starsEarned?.[index] ?? 0
        );
      }
      if (saved.persistentInventory) {
        next.persistentInventory = { ...EMPTY_INVENTORY, ...saved.persistentInventory };
      }
      if (saved.buildings) next.buildings = saved.buildings;
      return {
        ...next,
        roundStatus: "playing",
        showCompleteModal: false,
        showVictoryScreen: false,
      };
    });
  }, []);

  return {
    state,
    currentRoundConfig,
    getDepositsForRound: getDeposits,
    handleRoundFinished,
    advanceRound,
    dismissModal,
    resetAll,
    addBuilding,
    syncInventory,
    hydrate,
  };
}
