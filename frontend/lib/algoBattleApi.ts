import { apiRequest } from "./api";
import type {
  BattleProblem,
  BattleRating,
} from "@/components/AlgoBattle/types";

export type RoomCreated = {
  roomCode: string;
  mode: string;
};

export function getProblems(): Promise<BattleProblem[]> {
  return apiRequest<BattleProblem[]>("/algo-battle/problems");
}

export function getLeaderboard(limit = 10): Promise<BattleRating[]> {
  return apiRequest<BattleRating[]>(`/algo-battle/leaderboard?limit=${limit}`);
}

export function getMyRating(token: string): Promise<BattleRating> {
  return apiRequest<BattleRating>("/algo-battle/rating", { token });
}

export function createRoom(
  token: string,
  problemId?: string
): Promise<RoomCreated> {
  return apiRequest<RoomCreated>("/algo-battle/rooms", {
    method: "POST",
    token,
    body: { problemId },
  });
}

export function quickMatch(token: string): Promise<RoomCreated> {
  return apiRequest<RoomCreated>("/algo-battle/quick-match", {
    method: "POST",
    token,
  });
}

export function joinRoom(
  token: string,
  roomCode: string
): Promise<{ roomCode: string; status: string }> {
  return apiRequest<{ roomCode: string; status: string }>(
    `/algo-battle/rooms/${encodeURIComponent(roomCode)}/join`,
    { method: "POST", token }
  );
}
