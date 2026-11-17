from temple_sdk.runner import run_submission

REFERENCE = (
    "def hanoi(n, source, aux, target):\n"
    "    if n == 0:\n"
    "        return\n"
    "    hanoi(n - 1, source, target, aux)\n"
    "    target.push(source.pop())\n"
    "    hanoi(n - 1, aux, source, target)\n"
)


def _moves(result):
    return [event for event in result.timeline if event.get("action") == "MOVE_DISK"]


def test_reference_solution_solves_every_level_with_three_stars():
    for level_id in range(1, 13):
        result = run_submission(REFERENCE, level_id=level_id)
        assert result.success, (level_id, result.error)
        assert result.stars_earned == 3, level_id
        assert result.star_details == {
            "objective": True,
            "optimal_moves": True,
            "no_globals": True,
        }


def test_trace_starts_with_initial_state_and_moves_disks():
    result = run_submission(REFERENCE, level_id=3)

    assert [event["action"] for event in result.timeline[:2]] == [
        "INITIAL_STATE",
        "MOVE_DISK",
    ]
    assert result.timeline[0]["pegs"] == {"A": [3, 2, 1], "B": [], "C": []}
    assert len(_moves(result)) == 7
    assert result.metrics["move_count"] == 7


def test_base_case_only_solves_first_level():
    only_base_case = (
        "def hanoi(n, source, aux, target):\n"
        "    if n == 1:\n"
        "        target.push(source.pop())\n"
        "        return\n"
    )

    first = run_submission(only_base_case, level_id=1)
    second = run_submission(only_base_case, level_id=2)

    assert first.success
    assert not second.success


def test_missing_base_case_is_reported_as_recursion_error():
    no_base_case = (
        "def hanoi(n, source, aux, target):\n"
        "    hanoi(n - 1, source, target, aux)\n"
        "    target.push(source.pop())\n"
        "    hanoi(n - 1, aux, source, target)\n"
    )

    result = run_submission(no_base_case, level_id=3)

    assert not result.success
    assert result.stars_earned == 0
    assert "temple trembles" in (result.error or "").lower()


def test_illegal_placement_is_rejected():
    illegal = (
        "def hanoi(n, source, aux, target):\n"
        "    if n == 0:\n"
        "        return\n"
        "    hanoi(n - 1, source, target, aux)\n"
        "    source.push(target.pop())\n"
        "    hanoi(n - 1, aux, source, target)\n"
    )

    result = run_submission(illegal, level_id=3)

    assert not result.success
    assert result.error


def test_imports_are_blocked():
    result = run_submission("import os\n\n" + REFERENCE)

    assert not result.success
    assert "Import statements" in (result.error or "")


def test_global_state_is_blocked():
    global_code = (
        "moves = 0\n"
        "def hanoi(n, source, aux, target):\n"
        "    global moves\n"
        "    moves += 1\n"
    )

    result = run_submission(global_code)

    assert not result.success
    assert "global" in (result.error or "").lower()


def test_reference_move_helper_is_blocked():
    result = run_submission("move(3, A, B, C)")

    assert not result.success
    assert "move()" in (result.error or "")


def test_private_attributes_are_blocked():
    result = run_submission(
        "def hanoi(n, source, aux, target):\n"
        "    return source._stack\n"
    )

    assert not result.success
    assert "Private" in (result.error or "")


def test_extra_moves_fail_optimality_but_still_solve():
    wasteful = (
        "def hanoi(n, source, aux, target):\n"
        "    if n == 0:\n"
        "        return\n"
        "    hanoi(n - 1, source, target, aux)\n"
        "    target.push(source.pop())\n"
        "    hanoi(n - 1, aux, source, target)\n"
        "    if n == 1:\n"
        "        aux.push(target.pop())\n"
        "        target.push(aux.pop())\n"
    )

    result = run_submission(wasteful, level_id=2)

    assert result.success
    assert result.stars_earned == 2
    assert not result.star_details["optimal_moves"]
