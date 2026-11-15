from wander_sdk.runner import run_submission


def _visits(result):
    return [
        event["node_id"]
        for event in result.timeline
        if event.get("action") == "VISIT_NODE"
    ]


TRAVERSAL = (
    "def solve(head):\n"
    "    curr = head\n"
    "    while curr:\n"
    "        print(curr.name)\n"
    "        curr = curr.next\n"
)

REVERSE = (
    "def solve(head):\n"
    "    prev = None\n"
    "    curr = head\n"
    "    while curr:\n"
    "        nxt = curr.next\n"
    "        curr.next = prev\n"
    "        prev = curr\n"
    "        curr = nxt\n"
    "    return prev\n"
)


def test_submission_emits_pointer_metrics():
    result = run_submission(TRAVERSAL, level_id=1)

    assert result.success
    assert result.stars_earned == 3
    assert result.metrics["pointer_reads"] == 4
    assert _visits(result) == ["node_1", "node_2", "node_3", "node_4"]


def test_movement_follows_the_submitted_code():
    result = run_submission("def solve(head):\n    return head\n", level_id=1)

    assert not result.success
    assert result.stars_earned == 0
    assert _visits(result) == ["node_1"]


def test_movement_keeps_partial_trace_when_code_raises():
    result = run_submission(
        "def solve(head):\n"
        "    curr = head\n"
        "    curr.next\n"
        "    raise ValueError('boom')\n",
        level_id=1,
    )

    assert not result.success
    assert "ValueError: boom" in (result.error or "")
    assert _visits(result) == ["node_1", "node_2"]


def test_submission_rejects_imports():
    result = run_submission("import os\n\ndef solve(head):\n    return head")

    assert not result.success
    assert "Import statements" in (result.error or "")


def test_submission_stops_infinite_loops():
    result = run_submission("def solve(head):\n    while True:\n        pass")

    assert not result.success
    assert "execution limit" in (result.error or "").lower()


def test_counting_level_requires_a_count():
    counting = (
        "def solve(head):\n"
        "    total = 0\n"
        "    curr = head\n"
        "    while curr:\n"
        "        total += 1\n"
        "        curr = curr.next\n"
        "    print(total)\n"
    )

    assert not run_submission(TRAVERSAL, level_id=2).success
    assert run_submission(counting, level_id=2).success


def test_reverse_level_scores_the_reversed_route():
    result = run_submission(REVERSE, level_id=7)

    assert result.success


def test_circular_level_accepts_a_closed_loop():
    close_loop = (
        "def solve(head):\n"
        "    curr = head\n"
        "    while curr.next:\n"
        "        curr = curr.next\n"
        "    curr.next = head\n"
        "    return head\n"
    )

    result = run_submission(close_loop, level_id=8)

    assert result.success


def test_cycle_detection_level_rewards_a_true_result():
    detect = (
        "def solve(head):\n"
        "    slow = head\n"
        "    fast = head\n"
        "    while fast and fast.next:\n"
        "        slow = slow.next\n"
        "        fast = fast.next.next\n"
        "        if slow is fast:\n"
        "            return True\n"
        "    return False\n"
    )

    assert run_submission(detect, level_id=10).success


def test_prev_links_are_validated_on_doubly_levels():
    wire_prev = (
        "def solve(head):\n"
        "    curr = head\n"
        "    while curr:\n"
        "        nxt = curr.next\n"
        "        if nxt:\n"
        "            nxt.prev = curr\n"
        "        curr = nxt\n"
    )

    assert not run_submission(TRAVERSAL, level_id=12).success
    assert run_submission(wire_prev, level_id=12).success
