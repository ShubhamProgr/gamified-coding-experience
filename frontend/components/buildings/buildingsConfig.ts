import type { RoverInventory } from "../Canvas/useRoverAnimation";

export const BUILDINGS_UNLOCK_ROUND = 5;

export type BuildingType = "charging_station";

export interface Building {
  id: string;
  type: BuildingType;
  col: number;
  row: number;
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  icon: string;
  description: string;
  effect: string;
  cost: RoverInventory;
  unlockRound: number;
  accent: string;
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  charging_station: {
    type: "charging_station",
    name: "Charging Station",
    icon: "⚡",
    description:
      "A compact solar pylon that tops up the rover's battery whenever it is parked on or next to the station.",
    effect: "Recharges up to 20% battery per rover.charge() call",
    cost: { cuprion: 30, pythorium: 20, javium: 10 },
    unlockRound: BUILDINGS_UNLOCK_ROUND,
    accent: "#00d4ff",
  },
};

export function totalCost(cost: Partial<RoverInventory>): number {
  return (cost.cuprion ?? 0) + (cost.pythorium ?? 0) + (cost.javium ?? 0);
}

export function canAfford(
  inventory: RoverInventory,
  cost: Partial<RoverInventory>
): boolean {
  return (
    inventory.cuprion >= (cost.cuprion ?? 0) &&
    inventory.pythorium >= (cost.pythorium ?? 0) &&
    inventory.javium >= (cost.javium ?? 0)
  );
}
