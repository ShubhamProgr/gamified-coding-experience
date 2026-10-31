from wander_sdk.runner import run_submission


def test_submission_emits_pointer_metrics():
    result = run_submission(
        "def solve(head):\n"
        "    curr = head\n"
        "    while curr:\n"
        "        curr = curr.next\n",
        level_id=1,
    )

    assert result.success
    assert result.metrics["pointer_reads"] == 4
    assert any(event["action"] == "VISIT_NODE" for event in result.timeline)


def test_submission_rejects_imports():
    result = run_submission("import os\n\ndef solve(head):\n    return head")

    assert not result.success
    assert "Import statements" in (result.error or "")


def test_submission_stops_infinite_loops():
    result = run_submission("def solve(head):\n    while True:\n        pass")

    assert not result.success
    assert "execution limit" in (result.error or "").lower()
