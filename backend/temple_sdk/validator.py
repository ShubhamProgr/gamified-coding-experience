"""AST-based safety validator for Temple of Echoes submissions."""

from __future__ import annotations

import ast

MAX_CODE_LENGTH = 20_000
FORBIDDEN_NAMES = {"os", "sys", "open", "exec", "eval", "compile", "__import__"}
FORBIDDEN_CALLS = {"move"}


class ValidationError(ValueError):
    """Raised when a submission contains unsafe syntax."""


def validate_code(code: str) -> ast.Module:
    if not isinstance(code, str) or not code.strip():
        raise ValidationError("Submit Python code before running.")
    if len(code) > MAX_CODE_LENGTH:
        raise ValidationError(f"Code must be at most {MAX_CODE_LENGTH} characters.")
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        raise ValidationError(f"Syntax error: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            raise ValidationError("Import statements are not allowed in the temple.")
        if isinstance(node, (ast.Global, ast.Nonlocal)):
            raise ValidationError(
                "global / nonlocal statements are not allowed. "
                "True recursion lives in function parameters, not global state."
            )
        if isinstance(node, ast.Name) and node.id in FORBIDDEN_NAMES:
            raise ValidationError(f"'{node.id}' is not allowed in the temple.")
        if isinstance(node, ast.Attribute) and node.attr.startswith("_"):
            raise ValidationError("Private and dunder attributes are not allowed.")
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_CALLS:
                raise ValidationError(
                    "You cannot call the built-in move() directly. "
                    "Implement your own hanoi() that uses peg.push() and peg.pop()."
                )
    return tree
