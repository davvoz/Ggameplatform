"""
Hexforge: A* on the battle grid.

Deterministic by construction: neighbours are visited in a fixed order and
ties on the open list are broken by insertion order.
"""

from __future__ import annotations

import heapq
import math
from typing import Callable, Optional

Cell = tuple[int, int]
CostFn = Callable[[int, int], Optional[float]]   # None = impassable
GoalFn = Callable[[int, int], bool]

_STRAIGHT = ((0, -1), (1, 0), (0, 1), (-1, 0))
_DIAGONAL = ((1, -1), (1, 1), (-1, 1), (-1, -1))
_SQRT2 = math.sqrt(2.0)


def find_path(start: Cell, cost: CostFn, is_goal: GoalFn,
              heuristic: Callable[[int, int], float]) -> Optional[list[Cell]]:
    """Cheapest path from `start` to any goal cell, start excluded.

    Returns [] when `start` is already a goal and None when no goal is reachable.
    Diagonal steps are allowed only when both straight neighbours are free
    ground (cost 1), so units never cut through the corner of a building or wall.
    """
    if is_goal(*start):
        return []
    counter = 0
    open_list: list[tuple[float, int, Cell]] = [(heuristic(*start), counter, start)]
    came_from: dict[Cell, Cell] = {}
    best: dict[Cell, float] = {start: 0.0}
    closed: set[Cell] = set()

    while open_list:
        _, _, current = heapq.heappop(open_list)
        if current in closed:
            continue
        if is_goal(*current):
            return _rebuild(came_from, current)
        closed.add(current)
        cx, cy = current
        for dx, dy, step in _neighbours(cx, cy, cost):
            nxt = (cx + dx, cy + dy)
            if nxt in closed:
                continue
            g = best[current] + step
            if g < best.get(nxt, math.inf):
                best[nxt] = g
                came_from[nxt] = current
                counter += 1
                heapq.heappush(open_list, (g + heuristic(*nxt), counter, nxt))
    return None


def _neighbours(cx: int, cy: int, cost: CostFn):
    for dx, dy in _STRAIGHT:
        c = cost(cx + dx, cy + dy)
        if c is not None:
            yield dx, dy, c
    for dx, dy in _DIAGONAL:
        c = cost(cx + dx, cy + dy)
        if c is None or not _open(cost(cx + dx, cy)) or not _open(cost(cx, cy + dy)):
            continue
        yield dx, dy, c * _SQRT2


def _open(c: Optional[float]) -> bool:
    """A straight neighbour a diagonal may brush past: free ground, not a wall."""
    return c is not None and c <= 1.0


def _rebuild(came_from: dict[Cell, Cell], end: Cell) -> list[Cell]:
    path = [end]
    while path[-1] in came_from:
        path.append(came_from[path[-1]])
    path.pop()          # drop the start cell
    path.reverse()
    return path
