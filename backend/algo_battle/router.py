"""HTTP + WebSocket routes for Algo Battle."""

from __future__ import annotations

import asyncio
from typing import Any

import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from . import db
from .problems import all_problems, get_problem
from .room_manager import handle_join, room_manager

router = APIRouter(tags=["algo-battle"])
ws_router = APIRouter(tags=["algo-battle"])
bearer_scheme = HTTPBearer(auto_error=False)


def _backend_main():
    import main as backend_main  # uvicorn loads the app as `main`

    return backend_main


def _current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    backend_main = _backend_main()
    return backend_main._get_current_user(credentials)


async def _resolve_ws_user(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    backend_main = _backend_main()
    try:
        payload = jwt.decode(
            token,
            backend_main.JWT_SECRET,
            algorithms=[backend_main.JWT_ALGORITHM],
        )
        user_id = int(payload.get("sub", ""))
    except (jwt.PyJWTError, TypeError, ValueError):
        return None

    try:
        return await asyncio.to_thread(backend_main._get_user_by_id, user_id)
    except Exception:
        return None


class RoomCreateRequest(BaseModel):
    problemId: str | None = None
    mode: str = "duel"


class RoomCodeResponse(BaseModel):
    roomCode: str
    mode: str


@router.get("/algo-battle/problems")
async def list_problems() -> list[dict[str, Any]]:
    return [problem.public_dict() for problem in all_problems()]


@router.get("/algo-battle/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)) -> list[dict[str, Any]]:
    return await asyncio.to_thread(db.leaderboard, limit)


@router.get("/algo-battle/rating")
async def get_my_rating(
    current_user: dict[str, Any] = Depends(_current_user),
) -> dict[str, Any]:
    rating = await asyncio.to_thread(db.get_rating, int(current_user["id"]))
    rating["username"] = current_user["username"]
    return rating


@router.post("/algo-battle/rooms", response_model=RoomCodeResponse, status_code=201)
async def create_room(
    request: RoomCreateRequest,
    current_user: dict[str, Any] = Depends(_current_user),
) -> RoomCodeResponse:
    if request.problemId and get_problem(request.problemId) is None:
        raise HTTPException(status_code=404, detail="Unknown problem")
    room = await room_manager.create_room(
        mode="duel",
        problem_id=request.problemId,
    )
    return RoomCodeResponse(roomCode=room.code, mode=room.mode)


@router.post("/algo-battle/quick-match", response_model=RoomCodeResponse)
async def quick_match(
    current_user: dict[str, Any] = Depends(_current_user),
) -> RoomCodeResponse:
    room = await room_manager.quick_match(
        int(current_user["id"]), current_user["username"]
    )
    return RoomCodeResponse(roomCode=room.code, mode=room.mode)


@router.get("/algo-battle/rooms/{room_code}")
async def get_room_state(
    room_code: str,
    current_user: dict[str, Any] = Depends(_current_user),
) -> dict[str, Any]:
    room = room_manager.get_room(room_code)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room.public_state()


@router.post("/algo-battle/rooms/{room_code}/join")
async def check_join_room(
    room_code: str,
    current_user: dict[str, Any] = Depends(_current_user),
) -> dict[str, Any]:
    room = room_manager.get_room(room_code)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    user_id = int(current_user["id"])
    if (
        user_id not in room.players
        and len(room.ordered_players()) >= 2
    ):
        raise HTTPException(status_code=409, detail="Room is full")
    if room.status == "FINISHED" and user_id not in room.players:
        raise HTTPException(status_code=409, detail="This duel has already finished")
    return {"roomCode": room.code, "status": room.status}


@ws_router.websocket("/ws/algo-battle/{room_code}")
async def algo_battle_socket(
    websocket: WebSocket,
    room_code: str,
    token: str | None = Query(default=None),
) -> None:
    await websocket.accept()

    user = await _resolve_ws_user(token)
    if user is None:
        await websocket.send_json(
            {"type": "ERROR", "message": "Authentication failed."}
        )
        await websocket.close(code=4401)
        return

    room = room_manager.get_room(room_code)
    if room is None:
        await websocket.send_json({"type": "ERROR", "message": "Room not found."})
        await websocket.close(code=4404)
        return

    try:
        room, player = await handle_join(room_manager, room_code, user, websocket)
    except ValueError as exc:
        await websocket.send_json({"type": "ERROR", "message": str(exc)})
        await websocket.close(code=4409)
        return

    await websocket.send_json(
        {"type": "ROOM_STATE", **room.public_state()}
    )
    rating = await asyncio.to_thread(db.get_rating, int(user["id"]))
    await websocket.send_json(
        {
            "type": "PLAYER_PROFILE",
            "rating": rating,
            "user_id": int(user["id"]),
            "username": user["username"],
        }
    )

    try:
        while True:
            payload = await websocket.receive_json()
            if not isinstance(payload, dict):
                continue
            if payload.get("type") == "JOIN_ROOM":
                if int(payload.get("userId", user["id"])) != int(user["id"]):
                    await websocket.send_json(
                        {
                            "type": "ERROR",
                            "message": "Token does not match the requested player.",
                        }
                    )
                continue
            await room_manager.handle_message(room, player, payload)
    except WebSocketDisconnect:
        await room_manager.disconnect(room_code, int(user["id"]), websocket)
    except Exception:
        await room_manager.disconnect(room_code, int(user["id"]), websocket)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


router.include_router(ws_router)

__all__ = ["router"]
