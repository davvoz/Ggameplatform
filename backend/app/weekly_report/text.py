"""Small text helpers shared by the post and the banner."""

from datetime import date
from typing import List

_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]


def number(value: int) -> str:
    return f"{value:,}"


def amount(value: float) -> str:
    """12.0 -> '12', 2.5 -> '2.5', 1500 -> '1,500'."""
    rounded = round(value, 3)
    if rounded == int(rounded):
        return number(int(rounded))
    return f"{rounded:,.3f}".rstrip("0").rstrip(".")


def count_word(n: int) -> str:
    return _WORDS[n] if 0 <= n < len(_WORDS) else str(n)


def join_words(words: List[str]) -> str:
    """['a'] -> 'a', ['a', 'b'] -> 'a and b', ['a', 'b', 'c'] -> 'a, b and c'."""
    if len(words) <= 1:
        return "".join(words)
    return f"{', '.join(words[:-1])} and {words[-1]}"


def date_range(start: date, end: date) -> str:
    """'November 16 - November 22, 2026', with both years when the week spans two."""
    if start.year == end.year:
        return f"{start:%B} {start.day} - {end:%B} {end.day}, {end.year}"
    return f"{start:%B} {start.day}, {start.year} - {end:%B} {end.day}, {end.year}"
