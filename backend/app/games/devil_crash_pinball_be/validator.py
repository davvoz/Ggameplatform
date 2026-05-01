"""Server-side validation for community board payloads.

Mirrors the constraints enforced by the in-browser LevelValidator: rejects
malformed data so we never store junk that would crash the runtime.

Kept intentionally minimal — exhaustive entity checks remain client-side
(LevelValidator). The server only protects against:
  * missing required keys
  * wrong types
  * suspicious sizes (DoS via giant payloads)
  * unknown / dangerous keys
"""

from typing import Any, Dict, List, Tuple

# Hard limits (anti-DoS)
MAX_SECTIONS = 12
MAX_SECTION_BYTES = 64 * 1024          # 64 KB per section
MAX_PAYLOAD_BYTES = 512 * 1024         # 512 KB total
MAX_KEY_LENGTH = 40

# Section key syntax: snake_case-ish, alphanum + underscore + dash
_VALID_KEY_CHARS = set("abcdefghijklmnopqrstuvwxyz0123456789_-")


class BoardValidationError(ValueError):
    """Raised on any structural problem in a board payload."""


def _is_valid_key(key: str) -> bool:
    if not isinstance(key, str) or not key or len(key) > MAX_KEY_LENGTH:
        return False
    return all(c in _VALID_KEY_CHARS for c in key.lower())


def _validate_top_level(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any], List[Any]]:
    """Validate the outer shape; return (board, sections, section_keys)."""
    if not isinstance(payload, dict):
        raise BoardValidationError("payload must be an object")
    board = payload.get("board")
    sections = payload.get("sections")
    if not isinstance(board, dict):
        raise BoardValidationError("payload.board must be an object")
    if not isinstance(sections, dict):
        raise BoardValidationError("payload.sections must be an object")
    section_keys = board.get("sections")
    if not isinstance(section_keys, list) or not section_keys:
        raise BoardValidationError("payload.board.sections must be a non-empty list")
    if len(section_keys) > MAX_SECTIONS:
        raise BoardValidationError(f"too many sections (max {MAX_SECTIONS})")
    return board, sections, section_keys


def _validate_section_keys(section_keys: List[Any], sections: Dict[str, Any]) -> set:
    """Validate the ordered list of section keys; return the seen set."""
    seen: set = set()
    for key in section_keys:
        if not _is_valid_key(key):
            raise BoardValidationError(f"invalid section key: {key!r}")
        if key in seen:
            raise BoardValidationError(f"duplicate section key: {key!r}")
        seen.add(key)
        if key not in sections:
            raise BoardValidationError(f"section payload missing for key: {key!r}")
    return seen


def _validate_section_payloads(sections: Dict[str, Any], seen: set) -> None:
    """Verify every section payload is referenced and is a dict."""
    for key, section in sections.items():
        if key not in seen:
            raise BoardValidationError(f"orphan section payload: {key!r}")
        if not isinstance(section, dict):
            raise BoardValidationError(f"section {key!r} must be an object")


def validate_payload(payload: Dict[str, Any]) -> None:
    """Raise BoardValidationError on any structural problem."""
    _board, sections, section_keys = _validate_top_level(payload)
    seen = _validate_section_keys(section_keys, sections)
    _validate_section_payloads(sections, seen)


def enforce_size_limits(serialized: str, per_section: List[Tuple[str, str]]) -> None:
    """Reject payloads above hard byte limits."""
    if len(serialized.encode('utf-8')) > MAX_PAYLOAD_BYTES:
        raise BoardValidationError(
            f"payload too large (max {MAX_PAYLOAD_BYTES // 1024} KB)"
        )
    for key, blob in per_section:
        if len(blob.encode('utf-8')) > MAX_SECTION_BYTES:
            raise BoardValidationError(
                f"section {key!r} too large (max {MAX_SECTION_BYTES // 1024} KB)"
            )
