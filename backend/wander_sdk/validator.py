"""AST and execution guards for WanderList submissions."""

from __future__ import annotations

import ast

MAX_CODE_LENGTH = 20_000
MAX_POINTER_OPS = 5_000
MAX_LOOP_VISITS = 100
FORBIDDEN_IMPORTS = {"os", "sys", "subprocess", "socket", "ctypes", "copy", "pathlib"}
FORBIDDEN_CALLS = {"eval", "exec", "compile", "open", "__import__"}


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
        raise ValidationError(f"SyntaxError: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            module = node.names[0].name.split(".", 1)[0]
            if module in FORBIDDEN_IMPORTS or isinstance(node, (ast.Import, ast.ImportFrom)):
                raise ValidationError("Import statements are not allowed in WanderList submissions.")
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_CALLS:
            raise ValidationError(f"Calling {node.func.id} is not allowed.")
        if isinstance(node, ast.Attribute) and node.attr.startswith("_"):
            raise ValidationError("Private and dunder attributes are not allowed.")
    return tree
