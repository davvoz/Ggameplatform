"""
BattleSession — server-authoritative match. Owns one room's entire
simulation: tick loop, world, two TeamStates, win/timeout detection,
and event/snapshot broadcasting via a callback.

Public API used by the Room:
    * BattleSession(host_id, host_hero, host_deck, guest_id, guest_hero,
                    guest_deck, broadcast)
    * await session.start()        — spawns the asyncio tick task
    * await session.stop()         — cancels and awaits the task
    * session.request_play_card(seat, slot, card_id, x, y, *, mirror)
                                   — returns (ok, error_code)
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from typing import Any, Awaitable, Callable, Optional

from . import arena
from .combat_system import CombatSystem
from .data_loader import DataRegistry, get_registry
from .entities import KIND_HERO, KIND_TOWER, Entity
from .entity_manager import EntityManager
from .movement_system import MovementSystem
from .mp_constants import is_mp_supported
from .snapshot import build_state, mirror_event_for, mirror_state_for
from .spatial_index import SpatialIndex
from .spawn_system import SpawnSystem
from .spells import SpellResolver
from .team_state import TeamState

logger = logging.getLogger("minion_clash.simulation")

# Broadcast callback signature:
#   async fn(seat_team, message_dict) — called once per recipient per message,
#   already mirrored by the session for that recipient.
BroadcastFn = Callable[[str, dict[str, Any]], Awaitable[None]]


class SimWorld:
    """Lightweight container exposed to entities during their tick."""

    def __init__(
        self,
        entities: EntityManager,
        spatial: SpatialIndex,
        combat: CombatSystem,
        spawn: SpawnSystem,
        spells: SpellResolver,
        data: DataRegistry,
    ):
        self.entities = entities
        self.spatial = spatial
        self.combat = combat
        self.spawn = spawn
        self.spells = spells
        self.data = data
        self.events: list[dict[str, Any]] = []
        # Absolute simulation clock (seconds). Updated by BattleSession
        # before each tick. Status-effect timestamps are relative to it.
        self.now: float = 0.0


class BattleSession:
    """One match. host = canonical 'player' team. guest = canonical 'enemy'."""

    def __init__(
        self,
        *,
        host_id: str,
        host_hero_id: str,
        host_deck: list[str],
        guest_id: str,
        guest_hero_id: str,
        guest_deck: list[str],
        broadcast: BroadcastFn,
        seed: Optional[int] = None,
    ):
        self._broadcast = broadcast
        self._host_id = host_id
        self._guest_id = guest_id
        self._seat_team: dict[str, str] = {host_id: "player", guest_id: "enemy"}
        self._rng = random.Random(seed if seed is not None else random.randint(1, 2**31 - 1))

        data = get_registry()
        em = EntityManager()
        spatial = SpatialIndex()
        combat = CombatSystem(em)
        spawn = SpawnSystem(em, data)
        spells = SpellResolver(spatial)
        self._world = SimWorld(em, spatial, combat, spawn, spells, data)

        tower_def = data.get_tower_def()
        host_hero = data.get_hero(host_hero_id)
        guest_hero = data.get_hero(guest_hero_id)
        self._teams: dict[str, TeamState] = {
            "player": TeamState(
                team="player",
                hero_def=host_hero,
                deck_ids=host_deck,
                tower_def=tower_def,
                em=em,
                rng=self._rng,
            ),
            "enemy": TeamState(
                team="enemy",
                hero_def=guest_hero,
                deck_ids=guest_deck,
                tower_def=tower_def,
                em=em,
                rng=self._rng,
            ),
        }
        em.flush_additions()

        self._tick = 0
        self._t = 0.0
        self._time_left = arena.MATCH_TIME_LIMIT
        self._outcome: Optional[dict[str, str]] = None
        self._task: Optional[asyncio.Task[None]] = None
        self._stopped = asyncio.Event()
        self._lock = asyncio.Lock()

    # ─── Lifecycle ──────────────────────────────────────────────
    def start(self) -> None:
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._loop(), name="mc-battle-session")

    async def stop(self) -> None:
        self._stopped.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
            self._task = None

    @property
    def outcome(self) -> Optional[dict[str, str]]:
        return self._outcome

    # ─── Inputs ─────────────────────────────────────────────────
    async def request_play_card(
        self,
        *,
        seat_id: str,
        slot: int,
        card_id: str,
        x: float,
        y: float,
    ) -> tuple[bool, Optional[str]]:
        """Validate & apply a play. Coordinates arrive in the SEAT's local
        frame (always 'I am at the bottom'); we mirror to canonical here.
        """
        team = self._seat_team.get(seat_id)
        if team is None:
            return False, "INVALID_SEAT"
        if self._outcome is not None:
            return False, "MATCH_OVER"
        if not is_mp_supported(card_id):
            return False, "CARD_NOT_MP_SUPPORTED"

        cx, cy = self._mirror_in(team, float(x), float(y))
        async with self._lock:
            ts = self._teams[team]
            slot_card = ts.hand.card_at(int(slot))
            if slot_card != card_id:
                return False, "SLOT_MISMATCH"
            try:
                card = self._world.data.get_card(card_id)
            except KeyError:
                return False, "UNKNOWN_CARD"
            if not arena.is_in_team_half(team, cx, cy):
                return False, "OUT_OF_ZONE"
            cost = float(card.get("cost", 0))
            if not ts.mana.can_consume(cost):
                return False, "INSUFFICIENT_MANA"
            if ts.cooldowns.is_on_cooldown(card_id):
                return False, "ON_COOLDOWN"

            ts.mana.consume(cost)
            ts.hand.play(int(slot))
            ts.cooldowns.set(card_id, float(card.get("cooldown", 0)))

            kind = card.get("kind")
            if kind == "summon":
                self._world.spawn.enqueue_from_card(card, team, cx, cy)
                # The actual unit ids come on next tick (after flush). Emit a
                # spawn intent immediately so the renderer can show drop FX.
                self._world.events.append({
                    "type": "cardPlayed",
                    "team": team,
                    "cardId": card_id,
                    "x": cx,
                    "y": cy,
                })
            elif kind == "spell":
                self._world.spells.cast(card, cx, cy, team, self._world)
            else:
                return False, "UNKNOWN_CARD_KIND"
        return True, None

    # ─── Tick loop ──────────────────────────────────────────────
    async def _loop(self) -> None:
        try:
            next_t = time.monotonic()
            while not self._stopped.is_set():
                await self._step(arena.TICK_DT)
                next_t += arena.TICK_DT
                delay = next_t - time.monotonic()
                if delay > 0:
                    await asyncio.sleep(delay)
                else:
                    # Falling behind: skip catch-up sleep
                    next_t = time.monotonic()
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("[battle_session] tick loop crashed")

    async def _step(self, dt: float) -> None:
        if self._outcome is not None:
            return
        async with self._lock:
            self._tick += 1
            self._t += dt
            self._time_left = max(0.0, arena.MATCH_TIME_LIMIT - self._t)
            self._world.now = self._t

            # 1. team controllers (mana / cd / hand / hero respawn)
            for ts in self._teams.values():
                ts.update(dt)

            # 2. flush spawns + new entities
            spawned = self._world.spawn.flush()
            for u in spawned:
                self._world.events.append({
                    "type": "unitSpawn",
                    "id": u.id,
                    "team": u.team,
                    "defId": u.def_id,
                    "x": u.x,
                    "y": u.y,
                })
            self._world.entities.flush_additions()

            # 3. spatial rebuild
            self._world.spatial.rebuild(self._world.entities)

            # 4. entity update (entities are added via deferred queue, so it's
            # safe to iterate the live list here)
            for e in self._world.entities.list():
                e.update(dt, self._world)

            # 5. soft-body separation
            MovementSystem(self._world.spatial).update(self._world.entities, dt)

            # 6. cull dead
            self._world.entities.cull_dead()

            # 7. win / timeout check
            self._check_outcome()

            # 8. broadcast state @ 10 Hz, events every tick
            await self._broadcast_events()
            if (self._tick % arena.SNAPSHOT_EVERY_N_TICKS) == 0:
                await self._broadcast_state()

            # 9. broadcast outcome if any
            if self._outcome is not None:
                await self._broadcast_outcome()

    def _check_outcome(self) -> None:
        if self._teams["player"].tower.is_dead():
            self._outcome = {"result": "guest", "reason": "tower"}
            return
        if self._teams["enemy"].tower.is_dead():
            self._outcome = {"result": "host", "reason": "tower"}
            return
        if self._time_left <= 0:
            ph = self._teams["player"].tower.hp / self._teams["player"].tower.max_hp
            eh = self._teams["enemy"].tower.hp / self._teams["enemy"].tower.max_hp
            if abs(ph - eh) < 0.01:
                self._outcome = {"result": "draw", "reason": "timeout"}
            elif ph > eh:
                self._outcome = {"result": "host", "reason": "timeout"}
            else:
                self._outcome = {"result": "guest", "reason": "timeout"}

    # ─── Broadcast helpers ──────────────────────────────────────
    async def _broadcast_state(self) -> None:
        canonical = build_state(
            tick=self._tick,
            t=self._t,
            time_left=self._time_left,
            teams=self._teams,
            em=self._world.entities,
        )
        await self._broadcast("player", mirror_state_for(canonical, "player"))
        await self._broadcast("enemy", mirror_state_for(canonical, "enemy"))

    async def _broadcast_events(self) -> None:
        if not self._world.events:
            return
        events = self._world.events
        self._world.events = []
        for ev in events:
            wrapped = {"type": "event", "tick": self._tick, "event": ev}
            await self._broadcast("player", {
                **wrapped, "event": mirror_event_for(ev, "player"),
            })
            await self._broadcast("enemy", {
                **wrapped, "event": mirror_event_for(ev, "enemy"),
            })

    async def _broadcast_outcome(self) -> None:
        if self._outcome is None:
            return
        # Translate canonical (host/guest/draw) into per-seat win/lose/timeout
        for seat_id, team in self._seat_team.items():
            seat_role = "host" if seat_id == self._host_id else "guest"
            result = self._outcome["result"]
            if result == "draw":
                local = "timeout"
            elif result == seat_role:
                local = "win"
            else:
                local = "lose"
            await self._broadcast(team, {
                "type": "outcome",
                "result": local,
                "reason": self._outcome["reason"],
            })
        # After broadcasting the final outcome we let the loop finish via stop()
        self._stopped.set()

    # ─── Coord mirroring (input side) ───────────────────────────
    @staticmethod
    def _mirror_in(seat_team: str, x: float, y: float) -> tuple[float, float]:
        """Convert from seat-local (player-at-bottom) into canonical."""
        if seat_team == "player":
            return x, y
        return arena.VIEW_WIDTH - x, arena.VIEW_HEIGHT - y
