"""
Hexforge: server-side battle simulation.

A battle is a pure function of (city, squad, side, priority, tactic): no
randomness, a fixed tick, a fixed order of updates. The same input always
gives the same replay, so the server is the only place where a fight is
decided and the client only draws the log it receives.

Output (see `simulate`):
  frames  every FRAME_STRIDE ticks, one [x, y, hp] per hero (client interpolates)
  events  everything else the replay draws: hits, spells, traps, deaths
  summary result, destruction %, loot %, per-hero numbers
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from .upgrades import building_spec
from .catalog import BUILDINGS, CORE, TRAP, WALL, BuildingType, HeroClass
from .evolution import parse_unit, spec_of
from .items import apply as apply_items
from .pathfinding import find_path

TICK_RATE = 10                 # ticks per second
MAX_SECONDS = 90
MAX_TICKS = TICK_RATE * MAX_SECONDS
FRAME_STRIDE = 2
WALL_PATH_COST = 8.0           # how much a squad prefers walking round a wall to breaking it
LEAP_MIN_TICKS = 5             # a leap over walls takes at least half a second
LOOT_WIN = 30                  # % of unprotected materials, taken only by bringing down the core
AIMS = ("closest", "weakest", "ranged")   # how a tower picks among heroes in range
DEFAULT_AIM = "closest"

_DT = 1.0 / TICK_RATE


@dataclass
class _Building:
    id: int
    type: str
    spec: BuildingType
    x: int
    y: int
    size: int
    hp: int
    aim: str = DEFAULT_AIM
    alive: bool = True
    ready_tick: int = 0

    @property
    def cx(self) -> float:
        return self.x + self.size / 2

    @property
    def cy(self) -> float:
        return self.y + self.size / 2

    @property
    def counts(self) -> bool:
        """Counts towards destruction % (walls and traps do not)."""
        return self.spec.category not in ("wall", "trap")

    def distance_to(self, px: float, py: float) -> float:
        dx = max(self.x - px, 0.0, px - (self.x + self.size))
        dy = max(self.y - py, 0.0, py - (self.y + self.size))
        return math.hypot(dx, dy)


@dataclass
class _Hero:
    id: int
    cls: str
    spec: HeroClass
    x: float
    y: float
    group: int
    form: Optional[str] = None
    tier: int = 1
    items: list = field(default_factory=list)
    shield: int = 0                # an item's barrier, soaked before health
    regen_due: float = 0.0         # health regained but not yet a whole point
    hp: int = 0
    alive: bool = True
    target: Optional[int] = None
    path: list = field(default_factory=list)
    needs_path: bool = True
    ready_tick: int = 0
    nova_ready_tick: int = 0
    slow_until: int = -1
    slow_factor: float = 1.0
    leap: Optional[tuple] = None   # (x0, y0, x1, y1, start tick, end tick, path cells it clears)
    dealt: int = 0
    taken: int = 0

    def __post_init__(self):
        self.hp = self.spec.hp
        self.shield = self.spec.barrier


class Battle:
    def __init__(self, city: dict, squad: list, side: str, priority: str, tactic: str):
        self.grid = city["grid"]
        self.priority = priority
        self.tactic = tactic
        self.buildings = [
            _Building(id=b["id"], type=b["type"], spec=building_spec(b),
                      x=b["x"], y=b["y"], size=b["size"], hp=b["hp"],
                      aim=b.get("aim", DEFAULT_AIM))
            for b in city["buildings"]
        ]
        self.by_id = {b.id: b for b in self.buildings}
        self.occupant: dict[tuple[int, int], int] = {}
        for b in self.buildings:
            for cx in range(b.x, b.x + b.size):
                for cy in range(b.y, b.y + b.size):
                    self.occupant[(cx, cy)] = b.id
        self.heroes = self._spawn(squad, side)
        self.tick = 0
        self.engaged = False
        self.core_destroyed = False
        self.first_tower_lost: Optional[str] = None
        self.events: list[dict] = []
        self.frames: list[list[list[float]]] = []

    # ── setup ───────────────────────────────────────────────────────────
    def _spawn(self, squad: list, side: str) -> list[_Hero]:
        """`squad`: class names, or {"cls", "form", "tier"} for evolved heroes."""
        heroes = []
        for i, unit in enumerate(squad):
            cls, form, tier, carried = parse_unit(unit)
            if self.tactic == "spread":
                fraction, group = 0.2 + 0.2 * i, i
            elif self.tactic == "split":
                fraction, group = (0.3 if i % 2 == 0 else 0.7), i % 2
            else:
                fraction, group = 0.5, 0
            if self.tactic != "spread":
                # small offsets so heroes sharing a spawn point do not overlap exactly
                fraction += (i - 1.5) * 0.035
            x, y = self._edge_point(side, fraction)
            heroes.append(_Hero(id=i, cls=cls, spec=apply_items(spec_of(cls, form, tier), carried), x=x, y=y,
                                group=group, form=form if tier > 1 else None, tier=tier, items=carried))
        return heroes

    def _edge_point(self, side: str, fraction: float) -> tuple[float, float]:
        along = 1.0 + fraction * (self.grid - 2)
        edge_near, edge_far = 0.5, self.grid - 0.5
        return {
            "north": (along, edge_near),
            "south": (along, edge_far),
            "west": (edge_near, along),
            "east": (edge_far, along),
        }[side]

    # ── main loop ───────────────────────────────────────────────────────
    def run(self) -> dict:
        for hero in self.heroes:
            self._event("spawn", hero=hero.id, x=round(hero.x, 2), y=round(hero.y, 2))
        self._record_frame()
        while self.tick < MAX_TICKS and not self._finished():
            self._step()
        if self.tick % FRAME_STRIDE != 0:
            self._record_frame()
        return self._result()

    def _step(self) -> None:
        """One tick, always in the same order: heroes, traps, towers."""
        self.tick += 1
        for hero in self.heroes:
            if hero.alive:
                self._regenerate(hero)
                self._hero_step(hero)
        self._traps_step()
        for b in self.buildings:
            if b.alive and b.spec.damage and b.spec.attack_range and b.spec.category in ("tower", "core"):
                self._tower_step(b)          # a beacon core shoots like a tower
        if self.tick % FRAME_STRIDE == 0:
            self._record_frame()

    def _finished(self) -> bool:
        if not any(h.alive for h in self.heroes):
            return True
        return not any(b.alive and b.counts for b in self.buildings)

    # ── heroes ──────────────────────────────────────────────────────────
    def _hero_step(self, hero: _Hero) -> None:
        if hero.leap is not None:
            self._leap_step(hero)
            return
        target = self.by_id.get(hero.target) if hero.target is not None else None
        if target is None or not target.alive:
            target = self._choose_target(hero)
            hero.target = target.id if target else None
            hero.needs_path = True
        if target is None:
            return

        if target.distance_to(hero.x, hero.y) <= hero.spec.attack_range:
            self._hero_attack(hero, target)
            return

        if hero.needs_path:
            self._plan_path(hero, target)
        if not hero.path:
            return

        nx, ny = hero.path[0]
        blocker = self._wall_at(nx, ny)
        if blocker is not None and hero.spec.jumps_walls and self._start_leap(hero):
            return
        if blocker is not None and not hero.spec.jumps_walls:
            if blocker.distance_to(hero.x, hero.y) <= hero.spec.attack_range:
                self._hero_attack(hero, blocker)
                return
        self._move(hero, nx + 0.5, ny + 0.5)

    def _start_leap(self, hero: _Hero) -> bool:
        """Jump over the walls ahead in one arc, landing on the first free cell of the path."""
        landing = next((i for i, (cx, cy) in enumerate(hero.path) if self._wall_at(cx, cy) is None), None)
        if landing is None:
            return False
        lx, ly = hero.path[landing][0] + 0.5, hero.path[landing][1] + 0.5
        distance = math.hypot(lx - hero.x, ly - hero.y)
        ticks = max(LEAP_MIN_TICKS, math.ceil(distance / self._speed(hero) * TICK_RATE))
        hero.leap = (hero.x, hero.y, lx, ly, self.tick, self.tick + ticks, landing + 1)
        self._event("leap", hero=hero.id, x0=round(hero.x, 2), y0=round(hero.y, 2),
                    x1=round(lx, 2), y1=round(ly, 2), until=self.tick + ticks)
        self._leap_step(hero)
        return True

    def _leap_step(self, hero: _Hero) -> None:
        x0, y0, x1, y1, start, end, cleared = hero.leap
        k = min(1.0, (self.tick - start) / (end - start))
        hero.x, hero.y = x0 + (x1 - x0) * k, y0 + (y1 - y0) * k
        if self.tick >= end:
            hero.leap = None
            del hero.path[:cleared]

    def _choose_target(self, hero: _Hero) -> Optional[_Building]:
        alive = [b for b in self.buildings if b.alive and b.counts]
        if hero.cls == "guardian":
            wanted = "tower"
        else:
            wanted = {"towers": "tower", "core": "core", "production": "production"}[self.priority]
        preferred = [b for b in alive if b.spec.category == wanted]
        pool = preferred or alive
        if not pool:
            return None
        return min(pool, key=lambda b: (math.hypot(b.cx - hero.x, b.cy - hero.y), b.id))

    def _plan_path(self, hero: _Hero, target: _Building) -> None:
        jumps = hero.spec.jumps_walls
        reach = hero.spec.attack_range

        def cost(cx: int, cy: int) -> Optional[float]:
            return self._cell_cost(cx, cy, jumps)

        def is_goal(cx: int, cy: int) -> bool:
            # a hero never stops on top of a standing wall
            return cost(cx, cy) is not None and self._wall_at(cx, cy) is None and \
                target.distance_to(cx + 0.5, cy + 0.5) <= reach

        def heuristic(cx: int, cy: int) -> float:
            return max(0.0, math.hypot(target.cx - cx - 0.5, target.cy - cy - 0.5) - reach)

        start = (min(max(int(hero.x), 0), self.grid - 1), min(max(int(hero.y), 0), self.grid - 1))
        path = find_path(start, cost, is_goal, heuristic)
        if path == []:
            path = [start]        # already in a goal cell: step to its centre, which is in range
        hero.path = path or []    # None: no route this tick, retried after the next destruction
        hero.needs_path = False

    def _cell_cost(self, cx: int, cy: int, jumps_walls: bool) -> Optional[float]:
        """Path cost of stepping onto a cell; None = impassable."""
        if not (0 <= cx < self.grid and 0 <= cy < self.grid):
            return None
        occupant = self.occupant.get((cx, cy))
        if occupant is None:
            return 1.0
        b = self.by_id[occupant]
        if not b.alive or b.type == TRAP:
            return 1.0
        if b.type == WALL:
            return 1.0 if jumps_walls else 1.0 + WALL_PATH_COST
        return None

    def _wall_at(self, cx: int, cy: int) -> Optional[_Building]:
        occupant = self.occupant.get((cx, cy))
        if occupant is None:
            return None
        b = self.by_id[occupant]
        return b if b.alive and b.type == WALL else None

    def _move(self, hero: _Hero, tx: float, ty: float) -> None:
        speed = self._speed(hero)
        step = speed * _DT
        dx, dy = tx - hero.x, ty - hero.y
        dist = math.hypot(dx, dy)
        if dist <= step:
            hero.x, hero.y = tx, ty
            hero.path.pop(0)
        else:
            hero.x += dx / dist * step
            hero.y += dy / dist * step

    def _speed(self, hero: _Hero) -> float:
        speed = hero.spec.speed
        if not self.engaged and self.tactic != "spread":
            # the group marches at the pace of its slowest member until the first blow
            speed = min(h.spec.speed for h in self.heroes if h.group == hero.group and h.alive)
        if self.tick <= hero.slow_until:
            speed *= hero.slow_factor
        return speed

    def _hero_attack(self, hero: _Hero, target: _Building) -> None:
        if self.tick < hero.ready_tick:
            return
        spec = hero.spec
        if spec.nova_damage and self.tick >= hero.nova_ready_tick:
            hits = []
            for b in self.buildings:
                if b.alive and b.type != TRAP and b.distance_to(target.cx, target.cy) <= spec.nova_radius:
                    hits.append(self._damage_building(hero, b, spec.nova_damage))
            self._event("nova", hero=hero.id, x=target.cx, y=target.cy,
                        radius=spec.nova_radius, hits=hits)
            hero.nova_ready_tick = self.tick + round(spec.nova_cooldown * TICK_RATE)
        else:
            damage = round(spec.damage * (spec.tower_bonus if target.spec.category == "tower" else 1))
            hit = self._damage_building(hero, target, damage)
            splash = []
            if spec.splash_radius:
                for b in self.buildings:
                    if (b is not target and b.alive and b.type != TRAP
                            and b.distance_to(target.cx, target.cy) <= spec.splash_radius):
                        splash.append(self._damage_building(hero, b, damage // 2))
            if splash:
                hit["splash"] = splash
            self._event("strike", hero=hero.id, **hit)
            if target.spec.thorns and hero.alive:
                # a spiked wall bites back
                self._event("shot", building=target.id, thorns=True, **self._damage_hero(hero, target.spec.thorns))
                self._finalise_dead()
        hero.ready_tick = self.tick + round(spec.cooldown * TICK_RATE)
        self._finalise_destroyed()

    def _damage_building(self, hero: _Hero, b: _Building, amount: int) -> dict:
        dealt = min(amount, b.hp)
        b.hp -= dealt
        hero.dealt += dealt
        self.engaged = True
        return {"building": b.id, "dmg": dealt, "hp": b.hp}

    def _finalise_destroyed(self) -> None:
        for b in self.buildings:
            if b.alive and b.hp <= 0:
                b.alive = False
                self._event("destroyed", building=b.id)
                if b.type == CORE:
                    self.core_destroyed = True
                if b.spec.category == "tower" and self.first_tower_lost is None:
                    self.first_tower_lost = b.type
                for h in self.heroes:
                    h.needs_path = True

    # ── defences ────────────────────────────────────────────────────────
    def _traps_step(self) -> None:
        for trap in self.buildings:
            if not trap.alive or trap.type != TRAP:
                continue
            if not any(h.alive and math.hypot(h.x - trap.cx, h.y - trap.cy) <= trap.spec.trigger_radius
                       for h in self.heroes):
                continue
            trap.alive = False
            caught = [h for h in self.heroes
                      if h.alive and math.hypot(h.x - trap.cx, h.y - trap.cy) <= trap.spec.splash_radius]
            hits = [self._damage_hero(h, trap.spec.damage) for h in caught]
            if trap.spec.slow_seconds:          # a snare: caught heroes are held fast
                for h in caught:
                    h.slow_until = self.tick + round(trap.spec.slow_seconds * TICK_RATE)
                    h.slow_factor = trap.spec.slow_factor
            self._event("trap", building=trap.id, x=trap.cx, y=trap.cy,
                        radius=trap.spec.splash_radius, hits=hits)
            self._finalise_dead()

    def _tower_step(self, tower: _Building) -> None:
        if self.tick < tower.ready_tick:
            return
        target = self._tower_target(tower)
        if target is None:
            return
        spec = tower.spec
        if spec.chain_targets:
            self._fire_lightning(tower, target)
        elif spec.splash_radius:
            self._fire_frost(tower, target)
        else:
            self._event("shot", building=tower.id, **self._damage_hero(target, spec.damage))
        tower.ready_tick = self.tick + round(spec.cooldown * TICK_RATE)
        self._finalise_dead()

    def _fire_lightning(self, tower: _Building, first: _Hero) -> None:
        spec = tower.spec
        chain = [first]
        while len(chain) <= spec.chain_targets:
            nxt = self._nearest_hero(chain[-1], exclude=chain, radius=spec.chain_radius)
            if nxt is None:
                break
            chain.append(nxt)
        hits = [self._damage_hero(h, spec.damage) for h in chain]
        self._event("bolt", building=tower.id, hits=hits)

    def _nearest_hero(self, origin: _Hero, exclude: list, radius: float) -> Optional[_Hero]:
        def distance(h: _Hero) -> float:
            return math.hypot(h.x - origin.x, h.y - origin.y)

        near = [h for h in self.heroes if h.alive and h not in exclude and distance(h) <= radius]
        return min(near, key=lambda h: (distance(h), h.id)) if near else None

    def _fire_frost(self, tower: _Building, target: _Hero) -> None:
        spec = tower.spec
        hits = []
        for h in self.heroes:
            if h.alive and math.hypot(h.x - target.x, h.y - target.y) <= spec.splash_radius:
                hits.append(self._damage_hero(h, spec.damage))
                h.slow_until = self.tick + round(spec.slow_seconds * TICK_RATE)
                h.slow_factor = spec.slow_factor
        self._event("frost", building=tower.id, x=round(target.x, 2), y=round(target.y, 2),
                    radius=spec.splash_radius, hits=hits)

    def _tower_target(self, tower: _Building) -> Optional[_Hero]:
        """A guardian close by draws the fire; otherwise the tower follows its aim."""
        # reach is measured from the tower's edge, like a hero's reach to a building
        in_range = [h for h in self.heroes
                    if h.alive and tower.distance_to(h.x, h.y) <= tower.spec.attack_range]
        if not in_range:
            return None

        def distance(h: _Hero) -> float:
            return math.hypot(h.x - tower.cx, h.y - tower.cy)

        taunting = [h for h in in_range if h.spec.taunt_radius and distance(h) <= h.spec.taunt_radius]
        if taunting:
            return min(taunting, key=lambda h: (distance(h), h.id))
        if tower.aim == "weakest":
            return min(in_range, key=lambda h: (h.hp, distance(h), h.id))
        if tower.aim == "ranged":
            return min(in_range, key=lambda h: (-h.spec.attack_range, distance(h), h.id))
        return min(in_range, key=lambda h: (distance(h), h.id))

    def _regenerate(self, hero: _Hero) -> None:
        """A mending rune gives health back, a little every tick."""
        if not hero.spec.regen or hero.hp >= hero.spec.hp:
            return
        hero.regen_due += hero.spec.regen / TICK_RATE
        whole = int(hero.regen_due)
        if whole:
            hero.regen_due -= whole
            hero.hp = min(hero.spec.hp, hero.hp + whole)

    def _damage_hero(self, hero: _Hero, amount: int) -> dict:
        soaked = min(hero.shield, amount)       # a ward sigil takes the first blows
        hero.shield -= soaked
        amount -= soaked
        dealt = min(amount, hero.hp)
        hero.hp -= dealt
        hero.taken += dealt
        self.engaged = True
        hit = {"hero": hero.id, "dmg": dealt, "hp": hero.hp}
        if soaked:
            hit["soaked"] = soaked
        return hit

    def _finalise_dead(self) -> None:
        for h in self.heroes:
            if h.alive and h.hp <= 0:
                h.alive = False
                self._event("hero_down", hero=h.id)

    # ── output ──────────────────────────────────────────────────────────
    def _event(self, kind: str, **data) -> None:
        self.events.append({"t": self.tick, "type": kind, **data})

    def _record_frame(self) -> None:
        self.frames.append([[round(h.x, 2), round(h.y, 2), h.hp] for h in self.heroes])

    def _result(self) -> dict:
        counted = [b for b in self.buildings if b.counts]
        destroyed = sum(1 for b in counted if not b.alive)
        destruction = round(100 * destroyed / len(counted)) if counted else 0
        victory = self.core_destroyed        # the core is the city: nothing else wins
        loot = LOOT_WIN if victory else 0
        return {
            "tick_rate": TICK_RATE,
            "frame_stride": FRAME_STRIDE,
            "ticks": self.tick,
            "squad": [{"id": h.id, "cls": h.cls, "form": h.form, "tier": h.tier, "hp": h.spec.hp,
                       "barrier": h.spec.barrier, "items": h.items} for h in self.heroes],
            "frames": self.frames,
            "events": self.events,
            "summary": {
                "victory": victory,
                "core_destroyed": self.core_destroyed,
                "destruction": destruction,
                "loot_percent": loot,
                "seconds": round(self.tick / TICK_RATE, 1),
                "first_tower_lost": self.first_tower_lost,
                "heroes": [{"id": h.id, "cls": h.cls, "form": h.form, "tier": h.tier, "dealt": h.dealt,
                            "taken": h.taken, "survived": h.alive} for h in self.heroes],
            },
        }


def simulate(city: dict, squad: list, side: str, priority: str, tactic: str) -> dict:
    """Run one battle and return its replay log and summary."""
    return Battle(city, squad, side, priority, tactic).run()
