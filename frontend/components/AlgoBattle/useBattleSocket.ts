"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  BattleMatch,
  BattleRating,
  BattleResult,
  BattleRoomState,
  BattleSocketMessage,
  ProfileResult,
} from "./types";
import { getBackendWsUrl } from "@/lib/api";

type ConnectionState = "connecting" | "open" | "closed";

type TestPayload = {
  result: ProfileResult;
  language: string;
  sample: boolean;
};

type UseBattleSocketOptions = {
  roomId: string;
  token: string | null;
  userId: number | null;
  username: string | null;
  enabled?: boolean;
};

export function useBattleSocket({
  roomId,
  token,
  userId,
  username,
  enabled = true,
}: UseBattleSocketOptions) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [testPending, setTestPending] = useState(false);
  const [room, setRoom] = useState<BattleRoomState | null>(null);
  const [match, setMatch] = useState<BattleMatch | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [testPayload, setTestPayload] = useState<TestPayload | null>(null);
  const [evaluation, setEvaluation] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [rating, setRating] = useState<BattleRating | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushError = useCallback((message: string) => {
    setError(message);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
  }, []);

  const send = useCallback((payload: BattleSocketMessage): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  useEffect(() => {
    if (!enabled || !token || !userId || !username) {
      return;
    }

    let disposed = false;
    let attempts = 0;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const applyRoomState = (state: BattleRoomState) => {
      setRoom(state);

      if (state.status === "CODING" && state.problem) {
        setMatch({
          problem: state.problem,
          durationSeconds: state.durationSeconds,
          startedAt: state.startedAt ?? Date.now() / 1000,
          endsAt: Date.now() + Math.max(0, state.remainingSeconds) * 1000,
        });
      }

      if (state.status === "WAITING") {
        setMatch(null);
        setCountdown(null);
        setEvaluation(false);
        setResult(null);
      }
      if (state.status === "EVALUATION") {
        setEvaluation(true);
      }
      if (state.status === "FINISHED" && state.result) {
        const nextResult = state.result;
        setResult((previous) =>
          previous && previous.evaluated_at === nextResult.evaluated_at
            ? previous
            : nextResult
        );
        setEvaluation(false);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      let data: BattleSocketMessage;
      try {
        data = JSON.parse(event.data as string) as BattleSocketMessage;
      } catch {
        return;
      }

      switch (data.type) {
        case "ROOM_STATE":
          applyRoomState(data as unknown as BattleRoomState & { type: string });
          break;
        case "COUNTDOWN":
          setCountdown(Number(data.seconds ?? 0));
          setRoom((prev) =>
            prev ? { ...prev, status: "COUNTDOWN" } : prev
          );
          break;
        case "MATCH_START": {
          const problem = data.problem as BattleRoomState["problem"];
          if (!problem) break;
          const durationSeconds = Number(data.durationSeconds ?? 600);
          const startedAt = Number(data.startedAt ?? Date.now() / 1000);
          const serverNow = Number(data.serverNow ?? Date.now() / 1000);
          const remaining = Math.max(0, durationSeconds - (serverNow - startedAt));
          setMatch({
            problem,
            durationSeconds,
            startedAt,
            endsAt: Date.now() + remaining * 1000,
          });
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  status: "CODING",
                  problem,
                  startedAt,
                  durationSeconds,
                }
              : prev
          );
          setCountdown(null);
          setEvaluation(false);
          setResult(null);
          setTestPayload(null);
          break;
        }
        case "TEST_RESULTS": {
          setTestPending(false);
          const payload: TestPayload = {
            result: data.result as ProfileResult,
            language: String(data.language ?? "python"),
            sample: Boolean(data.sample),
          };
          setTestPayload(payload);
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  players: prev.players.map((player) =>
                    player.user_id === userId
                      ? {
                          ...player,
                          passed_tests: payload.result.passed_count,
                          total_tests: payload.result.total_count,
                          status: payload.result.passed_count
                            ? "passed_tests"
                            : "coding",
                        }
                      : player
                  ),
                }
              : prev
          );
          break;
        }
        case "OPPONENT_UPDATE": {
          const targetId = Number(data.user_id);
          const status = String(data.status ?? "coding");
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  players: prev.players.map((player) =>
                    player.user_id === targetId
                      ? {
                          ...player,
                          status,
                          passed_tests: Number(
                            data.passed_count ?? player.passed_tests
                          ),
                          total_tests: Number(
                            data.total_count ?? player.total_tests
                          ),
                          submitted:
                            player.submitted || status === "submitted",
                        }
                      : player
                  ),
                }
              : prev
          );
          break;
        }
        case "EVALUATION_START":
          setTestPending(false);
          setEvaluation(true);
          setTestPayload(null);
          setRoom((prev) =>
            prev ? { ...prev, status: "EVALUATION" } : prev
          );
          break;
        case "MATCH_RESULT": {
          setTestPending(false);
          const nextResult = data.result as BattleResult;
          setResult(nextResult);
          setEvaluation(false);
          setRoom((prev) =>
            prev
              ? { ...prev, status: "FINISHED", result: nextResult }
              : prev
          );
          break;
        }
        case "PLAYER_PROFILE":
          setRating(data.rating as BattleRating);
          break;
        case "ERROR":
          setTestPending(false);
          pushError(String(data.message ?? "Something went wrong."));
          break;
        default:
          break;
      }
    };

    const connect = () => {
      if (disposed) return;
      setConnection("connecting");

      const socket = new WebSocket(
        `${getBackendWsUrl()}/ws/algo-battle/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) {
          socket.close();
          return;
        }
        attempts = 0;
        setConnection("open");
        socket.send(
          JSON.stringify({
            type: "JOIN_ROOM",
            userId,
            username,
          })
        );
        heartbeat = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "PING" }));
          }
        }, 20_000);
      };

      socket.onmessage = handleMessage;

      socket.onerror = () => {
        if (!disposed) {
          pushError("Connection to the duel was interrupted.");
        }
      };

      socket.onclose = (event) => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (disposed) return;
        setConnection("closed");
        if (event.code >= 4400 && event.code < 4500) return;
        if (attempts < 6) {
          attempts += 1;
          reconnectTimer = setTimeout(connect, Math.min(1000 * attempts, 6000));
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [roomId, token, userId, username, enabled, pushError]);

  const setReady = useCallback(
    (ready = true) => send({ type: "PLAYER_READY", ready }),
    [send]
  );

  const runTests = useCallback(
    (code: string, language: string) => {
      setTestPayload(null);
      setTestPending(true);
      const sent = send({ type: "RUN_TESTS", code, language });
      if (!sent) {
        setTestPending(false);
      }
      return sent;
    },
    [send]
  );

  const submitSolution = useCallback(
    (code: string, language: string) =>
      send({ type: "SUBMIT_SOLUTION", code, language }),
    [send]
  );

  const forfeit = useCallback(() => send({ type: "FORFEIT" }), [send]);

  return {
    connection:
      !enabled || !token || !userId || !username ? "closed" : connection,
    room,
    match,
    countdown,
    testPayload,
    testPending,
    evaluation,
    result,
    rating,
    error,
    setReady,
    runTests,
    submitSolution,
    forfeit,
  };
}
