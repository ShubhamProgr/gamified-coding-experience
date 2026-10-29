"""Problem bank, sample cases and asymptotic stress generators for Algo Battle.

Every problem exposes:
  * a human readable statement / constraints / examples for the arena UI
  * starter code for Python, C++ and Java
  * functional test cases (small, edge-case heavy)
  * stress cases (large enough to separate O(N) from O(N^2))
  * an argument/return specification used by the multi-language profiler

Test expectations are stored as canonical strings so the exact same comparison
can be used by the Python, Java and C++ harnesses.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any, Callable, Literal

ArgSpec = Literal["int", "str", "int_list"]
ReturnSpec = Literal["int", "bool", "int_list", "str_list"]
Normalizer = Literal["int", "bool", "int_list", "str_list"]
Difficulty = Literal["EASY", "MEDIUM", "HARD"]


@dataclass(frozen=True)
class TestCase:
    args: list[Any]
    expected: str
    label: str = ""


@dataclass(frozen=True)
class Problem:
    id: str
    title: str
    difficulty: Difficulty
    description: str
    constraints: str
    examples: list[dict[str, str]]
    function_name: str
    arg_specs: list[ArgSpec]
    return_spec: ReturnSpec
    normalizer: Normalizer
    starter_code: dict[str, str]
    functional_tests: list[TestCase]
    stress_tests: list[TestCase]
    editorial: str
    tags: list[str] = field(default_factory=list)

    @property
    def sample_tests(self) -> list[dict[str, str]]:
        return [
            {
                "label": test.label or f"Sample {index + 1}",
                "input": format_input(self, test.args),
                "output": test.expected,
            }
            for index, test in enumerate(self.functional_tests[:3])
        ]

    def all_tests(self, include_stress: bool = True) -> list[TestCase]:
        return [
            *self.functional_tests,
            *(self.stress_tests if include_stress else []),
        ]

    def public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "difficulty": self.difficulty,
            "description": self.description,
            "constraints": self.constraints,
            "examples": self.examples,
            "sampleTests": self.sample_tests,
            "starterCode": self.starter_code,
            "tags": self.tags,
        }


def _canon_list(value: list[int]) -> str:
    return ",".join(str(int(item)) for item in sorted(value))


def format_input(problem: Problem, args: list[Any]) -> str:
    """Render an input list in a LeetCode-ish way for the problem panel."""
    parts: list[str] = []
    for spec, value in zip(problem.arg_specs, args):
        if spec == "int":
            parts.append(f"{problem_arg_name(problem, len(parts))} = {value}")
        elif spec == "str":
            parts.append(f'{problem_arg_name(problem, len(parts))} = "{value}"')
        else:
            preview = list(value)
            if len(preview) > 14:
                preview = preview[:14]
                rendered = "[" + ", ".join(str(v) for v in preview) + ", …]"
            else:
                rendered = "[" + ", ".join(str(v) for v in preview) + "]"
            parts.append(f"{problem_arg_name(problem, len(parts))} = {rendered}")
    return ", ".join(parts)


_ARG_NAMES: dict[str, list[str]] = {
    "two-sum": ["nums", "target"],
    "maximum-subarray": ["nums"],
    "valid-anagram": ["s", "t"],
    "valid-parentheses": ["s"],
}


def problem_arg_name(problem: Problem, index: int) -> str:
    names = _ARG_NAMES.get(problem.id, [])
    return names[index] if index < len(names) else f"arg{index}"


# ── Helpers for building test cases ────────────────────────────────────────


def _two_sum_case(nums: list[int], target: int, label: str = "") -> TestCase:
    seen: dict[int, int] = {}
    answer: list[int] | None = None
    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            answer = [seen[complement], index]
            break
        seen[value] = index
    if answer is None:
        raise ValueError(f"two-sum fixture has no answer: {nums!r} -> {target}")
    return TestCase(args=[nums, target], expected=_canon_list(answer), label=label)


def _kadane(nums: list[int]) -> int:
    best = current = nums[0]
    for value in nums[1:]:
        current = max(value, current + value)
        best = max(best, current)
    return best


def _max_subarray_case(nums: list[int], label: str = "") -> TestCase:
    return TestCase(args=[nums], expected=str(_kadane(nums)), label=label)


def _anagram_case(s: str, t: str, expected: bool, label: str = "") -> TestCase:
    return TestCase(args=[s, t], expected="true" if expected else "false", label=label)


def _parentheses_case(s: str, expected: bool, label: str = "") -> TestCase:
    return TestCase(args=[s], expected="true" if expected else "false", label=label)


def _valid_parentheses(value: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []
    for char in value:
        if char in "([{":
            stack.append(char)
        elif char in pairs:
            if not stack or stack.pop() != pairs[char]:
                return False
    return not stack


def _sorted_anagram(value: str) -> str:
    return "".join(sorted(value))


# ── Problem fixtures ───────────────────────────────────────────────────────

_RNG = random.Random(20261029)


def _build_two_sum() -> Problem:
    functional = [
        _two_sum_case([2, 7, 11, 15], 9, "Classic pair"),
        _two_sum_case([3, 2, 4], 6, "Middle pair"),
        _two_sum_case([-3, 4, 3, 90], 0, "Negative numbers"),
        _two_sum_case([5, 5], 10, "Duplicate values"),
        _two_sum_case([0, 4, 3, 0], 0, "Zero pair"),
        _two_sum_case([1, 2, 3, 4, 5, 6, 7, 8], 15, "Pair at the end"),
    ]

    size = 50_000
    stress_nums = list(range(0, size * 2, 2))
    stress_target = stress_nums[-1] + stress_nums[-2]
    stress = [
        TestCase(
            args=[stress_nums, stress_target],
            expected=_canon_list([size - 2, size - 1]),
            label="Stress · 50,000 elements",
        )
    ]

    return Problem(
        id="two-sum",
        title="Two Sum",
        difficulty="EASY",
        description=(
            "Given an array of integers `nums` and an integer `target`, return the "
            "indices of the two numbers that add up to `target`.\n\n"
            "Each input has exactly one valid answer and you may not use the same "
            "element twice. The arena compares the sorted pair of indices, so any "
            "valid ordering is accepted."
        ),
        constraints=(
            "2 ≤ nums.length ≤ 100,000\n"
            "-1,000,000,000 ≤ nums[i], target ≤ 1,000,000,000\n"
            "Exactly one valid answer exists."
        ),
        examples=[
            {
                "input": "nums = [2, 7, 11, 15], target = 9",
                "output": "[0, 1]",
                "explanation": "nums[0] + nums[1] = 2 + 7 = 9.",
            },
            {
                "input": "nums = [3, 2, 4], target = 6",
                "output": "[1, 2]",
                "explanation": "nums[1] + nums[2] = 2 + 4 = 6.",
            },
        ],
        function_name="twoSum",
        arg_specs=["int_list", "int"],
        return_spec="int_list",
        normalizer="int_list",
        starter_code={
            "python": (
                "class Solution:\n"
                "    def twoSum(self, nums: list[int], target: int) -> list[int]:\n"
                "        # Write your solution here\n"
                "        pass\n"
            ),
            "cpp": (
                "class Solution {\n"
                "public:\n"
                "    vector<int> twoSum(vector<int>& nums, int target) {\n"
                "        // Write your solution here\n"
                "        return {};\n"
                "    }\n"
                "};\n"
            ),
            "java": (
                "class Solution {\n"
                "    public int[] twoSum(int[] nums, int target) {\n"
                "        // Write your solution here\n"
                "        return new int[]{};\n"
                "    }\n"
                "}\n"
            ),
        },
        functional_tests=functional,
        stress_tests=stress,
        editorial=(
            "A brute-force pair scan is O(N²). Store each value's index in a hash "
            "map and look for `target - nums[i]`; that turns the duel into O(N) "
            "time and O(N) space."
        ),
        tags=["Array", "Hash Table"],
    )


def _build_maximum_subarray() -> Problem:
    functional = [
        _max_subarray_case([-2, 1, -3, 4, -1, 2, 1, -5, 4], "Classic Kadane"),
        _max_subarray_case([1], "Single element"),
        _max_subarray_case([5, 4, -1, 7, 8], "Mostly positive"),
        _max_subarray_case([-3, -2, -5], "All negative"),
        _max_subarray_case([0, -1, 0], "Zeroes"),
        _max_subarray_case([-1, 0, -2], "Crosses zero"),
    ]

    size = 100_000
    stress_nums = [_RNG.randint(-1_000, 1_000) for _ in range(size)]
    stress = [
        TestCase(
            args=[stress_nums],
            expected=str(_kadane(stress_nums)),
            label="Stress · 100,000 elements",
        )
    ]

    return Problem(
        id="maximum-subarray",
        title="Maximum Subarray",
        difficulty="MEDIUM",
        description=(
            "Given an integer array `nums`, find the contiguous subarray with the "
            "largest sum and return that sum.\n\n"
            "A subarray must contain at least one element."
        ),
        constraints=(
            "1 ≤ nums.length ≤ 100,000\n"
            "-10,000 ≤ nums[i] ≤ 10,000"
        ),
        examples=[
            {
                "input": "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
                "output": "6",
                "explanation": "The subarray [4, -1, 2, 1] has the largest sum 6.",
            },
            {
                "input": "nums = [1]",
                "output": "1",
                "explanation": "The only subarray is the whole array.",
            },
        ],
        function_name="maxSubArray",
        arg_specs=["int_list"],
        return_spec="int",
        normalizer="int",
        starter_code={
            "python": (
                "class Solution:\n"
                "    def maxSubArray(self, nums: list[int]) -> int:\n"
                "        # Write your solution here\n"
                "        pass\n"
            ),
            "cpp": (
                "class Solution {\n"
                "public:\n"
                "    int maxSubArray(vector<int>& nums) {\n"
                "        // Write your solution here\n"
                "        return 0;\n"
                "    }\n"
                "};\n"
            ),
            "java": (
                "class Solution {\n"
                "    public int maxSubArray(int[] nums) {\n"
                "        // Write your solution here\n"
                "        return 0;\n"
                "    }\n"
                "}\n"
            ),
        },
        functional_tests=functional,
        stress_tests=stress,
        editorial=(
            "Kadane's algorithm keeps a running sum and resets whenever it falls "
            "below the current value. One pass, O(N) time and O(1) space."
        ),
        tags=["Array", "Dynamic Programming", "Divide and Conquer"],
    )


def _build_valid_anagram() -> Problem:
    functional = [
        _anagram_case("anagram", "nagaram", True, "Reordered letters"),
        _anagram_case("rat", "car", False, "Different letters"),
        _anagram_case("", "", True, "Empty strings"),
        _anagram_case("a", "ab", False, "Different lengths"),
        _anagram_case("listen", "silent", True, "Another anagram"),
        _anagram_case("aabb", "abab", True, "Repeated characters"),
    ]

    size = 100_000
    letters = "abcdefghijklmnopqrstuvwxyz"
    s = "".join(_RNG.choice(letters) for _ in range(size))
    shuffled = list(s)
    _RNG.shuffle(shuffled)
    t = "".join(shuffled)
    stress = [
        TestCase(
            args=[s, t],
            expected="true",
            label="Stress · 100,000 characters",
        )
    ]

    return Problem(
        id="valid-anagram",
        title="Valid Anagram",
        difficulty="EASY",
        description=(
            "Given two strings `s` and `t`, return `true` when `t` is an anagram "
            "of `s` and `false` otherwise.\n\n"
            "An anagram uses every character exactly as many times as the original."
        ),
        constraints=(
            "1 ≤ s.length, t.length ≤ 100,000\n"
            "s and t consist of lowercase English letters."
        ),
        examples=[
            {
                "input": 's = "anagram", t = "nagaram"',
                "output": "true",
                "explanation": "Both strings contain the same letters.",
            },
            {
                "input": 's = "rat", t = "car"',
                "output": "false",
                "explanation": "The letters r, a and t do not match c, a and r.",
            },
        ],
        function_name="isAnagram",
        arg_specs=["str", "str"],
        return_spec="bool",
        normalizer="bool",
        starter_code={
            "python": (
                "class Solution:\n"
                "    def isAnagram(self, s: str, t: str) -> bool:\n"
                "        # Write your solution here\n"
                "        pass\n"
            ),
            "cpp": (
                "class Solution {\n"
                "public:\n"
                "    bool isAnagram(string s, string t) {\n"
                "        // Write your solution here\n"
                "        return false;\n"
                "    }\n"
                "};\n"
            ),
            "java": (
                "class Solution {\n"
                "    public boolean isAnagram(String s, String t) {\n"
                "        // Write your solution here\n"
                "        return false;\n"
                "    }\n"
                "}\n"
            ),
        },
        functional_tests=functional,
        stress_tests=stress,
        editorial=(
            "Count character frequencies (or compare sorted strings). The counting "
            "approach runs in O(N) time with a small 26-slot frequency table."
        ),
        tags=["String", "Hash Table", "Sorting"],
    )


def _build_valid_parentheses() -> Problem:
    functional = [
        _parentheses_case("()", True, "Simple pair"),
        _parentheses_case("()[]{}", True, "All bracket types"),
        _parentheses_case("(]", False, "Wrong closing bracket"),
        _parentheses_case("([)]", False, "Crossed brackets"),
        _parentheses_case("{[]}", True, "Nested brackets"),
        _parentheses_case("", True, "Empty string"),
        _parentheses_case("(", False, "Unclosed bracket"),
    ]

    size = 100_000
    stress_input = "(" * (size // 2) + ")" * (size // 2)
    stress = [
        TestCase(
            args=[stress_input],
            expected="true",
            label="Stress · 100,000 brackets",
        )
    ]

    return Problem(
        id="valid-parentheses",
        title="Valid Parentheses",
        difficulty="EASY",
        description=(
            "Given a string `s` containing only the characters `(`, `)`, `{`, `}`, "
            "`[` and `]`, determine whether the brackets are valid.\n\n"
            "Brackets are valid when every opening bracket is closed by the same "
            "type, in the correct order."
        ),
        constraints=(
            "1 ≤ s.length ≤ 100,000\n"
            "s consists only of bracket characters."
        ),
        examples=[
            {
                "input": 's = "()[]{}"',
                "output": "true",
                "explanation": "Each pair closes in the right order.",
            },
            {
                "input": 's = "([)]"',
                "output": "false",
                "explanation": "The brackets cross instead of nesting.",
            },
        ],
        function_name="isValid",
        arg_specs=["str"],
        return_spec="bool",
        normalizer="bool",
        starter_code={
            "python": (
                "class Solution:\n"
                "    def isValid(self, s: str) -> bool:\n"
                "        # Write your solution here\n"
                "        pass\n"
            ),
            "cpp": (
                "class Solution {\n"
                "public:\n"
                "    bool isValid(string s) {\n"
                "        // Write your solution here\n"
                "        return false;\n"
                "    }\n"
                "};\n"
            ),
            "java": (
                "class Solution {\n"
                "    public boolean isValid(String s) {\n"
                "        // Write your solution here\n"
                "        return false;\n"
                "    }\n"
                "}\n"
            ),
        },
        functional_tests=functional,
        stress_tests=stress,
        editorial=(
            "Push opening brackets onto a stack. A closing bracket must match the "
            "top of the stack; at the end the stack must be empty. O(N) time."
        ),
        tags=["String", "Stack"],
    )


_PROBLEMS: dict[str, Problem] = {
    problem.id: problem
    for problem in (
        _build_two_sum(),
        _build_maximum_subarray(),
        _build_valid_anagram(),
        _build_valid_parentheses(),
    )
}


def all_problems() -> list[Problem]:
    return list(_PROBLEMS.values())


def get_problem(problem_id: str) -> Problem | None:
    return _PROBLEMS.get(problem_id)


def pick_problem(problem_id: str | None = None) -> Problem:
    if problem_id and problem_id in _PROBLEMS:
        return _PROBLEMS[problem_id]
    return random.choice(list(_PROBLEMS.values()))


def canonicalize(value: Any, normalizer: Normalizer) -> str:
    """Python-side canonicalisation used by the in-process harness."""
    if normalizer == "bool":
        return "true" if bool(value) else "false"
    if normalizer == "int":
        try:
            return str(int(value))
        except (TypeError, ValueError):
            return str(value)
    if normalizer == "int_list":
        try:
            return ",".join(str(int(item)) for item in sorted(value))
        except TypeError:
            return str(value)
    if normalizer == "str_list":
        try:
            groups = [sorted(str(item) for item in group) for group in value]
            groups.sort()
            return "|".join(",".join(group) for group in groups)
        except TypeError:
            return str(value)
    return str(value)


CompareFn = Callable[[Any, str], bool]
