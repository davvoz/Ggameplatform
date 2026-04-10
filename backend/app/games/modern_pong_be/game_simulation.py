"""
Server-authoritative game simulation for Modern Pong.

Runs the complete game loop at 20 Hz — physics, collisions, scoring,
power-ups, super shots — and emits events for the router to relay
to both connected clients.

Design:
  * Single async ``run()`` coroutine drives the full match lifecycle.
  * ``apply_input()`` is called from the WebSocket handler (thread-safe
    on the same event loop).
  * All events are queued during a synchronous ``_tick()`` and flushed
    asynchronously immediately after.
"""

from __future__ import annotations

import asyncio
import math
import random
from enum import Enum
from typing import Awaitable, Callable

from .game_constants import (
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    BALL_BASE_SPEED, BALL_MAX_SPEED,
    POWERUP_SPAWN_INTERVAL, MAX_ACTIVE_POWERUPS, POWERUP_DURATION,
    COUNTDOWN_DURATION, ROUND_END_DELAY, ROUND_END_DELAY_DEUCE,
    TICK_RATE, TICK_INTERVAL,
    SUPER_CHARGE_HIT, SUPER_CHARGE_POWERUP,
    HIT_COOLDOWN, FIREBALL_PASS_COOLDOWN,
    FREEZE_STUN, FROST_SUPER_STUN, SHADOW_BLAZE_DURATION,
    BLAZE_SUPER_FIREBALL, VENOM_MIRROR_DURATION,
)
from .entities import (
    ServerBall, ServerPlayer, ServerPowerUp, ServerShield,
    ServerSuperShield, ServerObstacle, POWERUP_TYPE_IDS,
)
from .physics import CollisionSystem


# Type alias for the event callback the router injects.
EventCallback = Callable[[str, dict], Awaitable[None]]


class GamePhase(Enum):
    WAITING = "waiting"
    COUNTDOWN = "countdown"
    PLAYING = "playing"
    ROUND_END = "round_end"
    MATCH_END = "match_end"
    ABORTED = "aborted"


class GameSimulation:
    """
    Authoritative Pong simulation.

    *event_callback* is an ``async def(event_type: str, data: dict)``
    that the owning ``GameRoom`` uses to broadcast events to both clients.
    """

    def __init__(
        self,
        rounds_to_win: int,
        stage_obstacles: list[dict] | None = None,
        event_callback: EventCallback | None = None,
    ):
        self.rounds_to_win = rounds_to_win
        self.phase = GamePhase.WAITING
        self.top_score = 0
        self.bottom_score = 0
        self.current_round = 1

        # Entities (populated in ``setup()``)
        self.ball: ServerBall | None = None
        self.top_player: ServerPlayer | None = None
        self.bottom_player: ServerPlayer | None = None
        self.extra_balls: list[ServerBall] = []
        self.powerups: list[ServerPowerUp] = []
        self.field_objects: list = []
        self.obstacles: list[ServerObstacle] = []

        # Obstacle templates for round resets
        self._obstacle_defs: list[dict] = stage_obstacles or []

        # Client inputs (written by ``apply_input``, read by ``_tick``)
        self._top_input: dict = {"dx": 0, "dy": 0}
        self._bottom_input: dict = {"dx": 0, "dy": 0}

        # Collision bookkeeping
        self._no_collide: dict[str, float] = {}
        self._hit_cooldown: dict[str, float] = {}
        self._last_hitter: ServerPlayer | None = None
        self._powerup_timer: float = 0.0
        self._pu_id_counter: int = 0
        self._last_scorer_id: str | None = None

        # State sequence counter
        self._seq: int = 0

        # Event queue (filled during sync tick, flushed async)
        self._pending_events: list[tuple[str, dict]] = []

        # Event callback
        self._emit_cb = event_callback

    # ── Setup ────────────────────────────────────────────────────

    def setup(self, top_char_id: str, bottom_char_id: str):
        """Create entities with the selected characters."""
        self.top_player = ServerPlayer(top_char_id, is_top=True)
        self.bottom_player = ServerPlayer(bottom_char_id, is_top=False)
        self.ball = ServerBall()
        self.extra_balls.clear()
        self.powerups.clear()
        self.field_objects.clear()
        self._rebuild_obstacles()
        self._reset_collision_state()

    # ── Public input API (called from WS handler) ────────────────

    def apply_input(self, role: str, dx: float, dy: float):
        """Apply clamped movement input from a client."""
        dx = max(-1.0, min(1.0, float(dx)))
        dy = max(-1.0, min(1.0, float(dy)))
        if role == "top":
            self._top_input = {"dx": dx, "dy": dy}
        elif role == "bottom":
            self._bottom_input = {"dx": dx, "dy": dy}

    # ── Lifecycle ────────────────────────────────────────────────

    async def run(self):
        """
        Drive the full match lifecycle::

            countdown → (playing → round_end)* → match_end
        """
        self.phase = GamePhase.COUNTDOWN
        await self._emit("countdown", {"duration": COUNTDOWN_DURATION})
        await asyncio.sleep(COUNTDOWN_DURATION)

        if self.phase == GamePhase.ABORTED:
            return

        while True:
            # ---- Start round ----
            self.ball.unfreeze()
            self.phase = GamePhase.PLAYING
            await self._emit("roundStart", {
                "round": self.current_round,
                "lastScorerId": self._last_scorer_id,
            })

            # ---- Play until a goal changes the phase ----
            await self._run_playing_phase()

            if self.phase == GamePhase.MATCH_END:
                await self._flush_events()
                break
            if self.phase == GamePhase.ABORTED:
                return

            # ---- Round-end pause ----
            await self._flush_events()
            delay = (
                ROUND_END_DELAY_DEUCE
                if (self.is_deuce or self.advantage)
                else ROUND_END_DELAY
            )
            await asyncio.sleep(delay)

            if self.phase == GamePhase.ABORTED:
                return

            self._prepare_next_round()

    def stop(self):
        """Signal the simulation to abort and exit."""
        self.phase = GamePhase.ABORTED

    # ── Playing phase tick-loop ──────────────────────────────────

    async def _run_playing_phase(self):
        """Precision tick loop — schedule-based to avoid asyncio.sleep jitter.

        On Windows the default timer resolution is ~15 ms, so plain
        ``asyncio.sleep(0.033)`` can sleep 15-47 ms.  Instead we keep a
        monotonic ``next_tick`` target, sleep only for the bulk of the
        remaining time (minus a 2 ms margin), then busy-yield through
        the event loop for the final sub-millisecond stretch.
        """
        loop = asyncio.get_running_loop()
        dt = TICK_INTERVAL
        next_tick = loop.time()

        while self.phase == GamePhase.PLAYING:
            now = loop.time()
            remaining = next_tick - now

            if remaining > 0.002:
                # Sleep for the bulk, leave 2 ms margin
                await asyncio.sleep(remaining - 0.002)
                continue
            if remaining > 0:
                # Busy-yield for the last ~2 ms
                await asyncio.sleep(0)
                continue

            # Tick is due
            next_tick += dt
            # If we fell behind by more than 3 ticks, reset schedule
            if loop.time() - next_tick > dt * 3:
                next_tick = loop.time()

            self._tick(dt)
            await self._send_snapshot()

    # ── Single tick ──────────────────────────────────────────────

    def _tick(self, dt: float):
        if self.phase != GamePhase.PLAYING:
            return

        # Apply inputs
        self.top_player.move(
            self._top_input["dx"], self._top_input["dy"], dt,
        )
        self.bottom_player.move(
            self._bottom_input["dx"], self._bottom_input["dy"], dt,
        )

        # Obstacle push-out
        for obs in self.obstacles:
            CollisionSystem.push_character_out_of_obstacle(self.top_player, obs)
            CollisionSystem.push_character_out_of_obstacle(self.bottom_player, obs)

        # Update entities
        self.top_player.update(dt)
        self.bottom_player.update(dt)
        self.ball.update(dt)
        for eb in self.extra_balls:
            eb.update(dt)

        # Cooldowns
        self._update_cooldowns(dt)

        # Wall hit event
        if self.ball.wall_hit:
            self._queue("wallHit", {})

        # Power-up spawning
        self._powerup_timer += dt
        alive_count = sum(1 for p in self.powerups if p.alive)
        if self._powerup_timer >= POWERUP_SPAWN_INTERVAL and alive_count < MAX_ACTIVE_POWERUPS:
            self._powerup_timer = 0.0
            self._spawn_powerup()

        # Collisions
        self._handle_collisions()

        # Goals
        self._check_goals()

    # ── Collision handling ───────────────────────────────────────

    def _handle_collisions(self):
        ball = self.ball

        # Ball vs characters
        self._check_ball_vs_character(ball, self.bottom_player)
        self._check_ball_vs_character(ball, self.top_player)

        # Ball vs power-ups
        for pu in list(self.powerups):
            if not pu.alive:
                continue
            if CollisionSystem.check_ball_powerup(ball, pu):
                collector = self._last_hitter or self.bottom_player
                self._apply_powerup(pu, collector)
                continue
            if CollisionSystem.check_character_powerup(self.bottom_player, pu):
                self._apply_powerup(pu, self.bottom_player)
                continue
            if CollisionSystem.check_character_powerup(self.top_player, pu):
                self._apply_powerup(pu, self.top_player)

        # Ball vs shields
        for obj in list(self.field_objects):
            if not obj.alive:
                continue
            if CollisionSystem.check_ball_shield(ball, obj):
                ball.vy = -ball.vy
                if hasattr(obj, "hit"):
                    obj.hit()
                else:
                    obj.destroy()
                self._queue("shieldHit", {})

        # Ball vs obstacles
        for obs in self.obstacles:
            if CollisionSystem.check_ball_obstacle(ball, obs):
                self._queue("obstacleHit", {})

        # Extra balls
        self._handle_extra_ball_collisions()

        # Garbage-collect
        self.field_objects = [o for o in self.field_objects if o.alive]
        self.powerups = [p for p in self.powerups if p.alive]

    def _check_ball_vs_character(self, ball: ServerBall, player: ServerPlayer):
        """Handle ball-character collision including fireball pass-through."""
        key = "top" if player.is_top else "bottom"

        if key in self._hit_cooldown:
            return
        if key in self._no_collide:
            return

        is_fireball = ball.fireball
        is_opponent = self._last_hitter is not None and self._last_hitter is not player

        # Fireball pass-through
        if is_fireball and is_opponent:
            dx = ball.x - player.x
            dy = ball.y - player.y
            dist = math.sqrt(dx * dx + dy * dy)
            min_dist = ball.radius + player.hitbox_radius
            if dist < min_dist:
                ball.consume_fireball()
                self._no_collide[key] = FIREBALL_PASS_COOLDOWN
                self._queue("fireballPassThrough", {
                    "isTopPlayer": player.is_top,
                    "ballX": round(ball.x, 1),
                    "ballY": round(ball.y, 1),
                })
            return

        # Normal collision
        if CollisionSystem.check_ball_character(ball, player):
            self._hit_cooldown[key] = HIT_COOLDOWN
            self._last_hitter = player

            self._queue("paddleHit", {
                "isTopPlayer": player.is_top,
                "ballX": round(ball.x, 1),
                "ballY": round(ball.y, 1),
                "charId": player.char_id,
            })

            # Super shot
            if player.super_ready:
                player.consume_super()
                self._execute_super_shot(player)

            player.charge_super(SUPER_CHARGE_HIT)

    def _handle_extra_ball_collisions(self):
        for i in range(len(self.extra_balls) - 1, -1, -1):
            eb = self.extra_balls[i]
            goal = eb.check_goal()
            if goal != 0:
                scorer_id = "bottom" if goal == 1 else "top"
                goal_x = (ARENA_LEFT + ARENA_RIGHT) / 2
                goal_y = ARENA_TOP if goal == 1 else ARENA_BOTTOM
                self.extra_balls.pop(i)
                self._queue("extraBallGoal", {
                    "scorerId": scorer_id,
                    "goalX": goal_x,
                    "goalY": goal_y,
                })
                self._score_goal(scorer_id)
                return  # One goal per tick

            CollisionSystem.check_ball_character(eb, self.bottom_player)
            CollisionSystem.check_ball_character(eb, self.top_player)
            for obj in self.field_objects:
                if obj.alive and CollisionSystem.check_ball_shield(eb, obj):
                    eb.vy = -eb.vy
                    if hasattr(obj, "hit"):
                        obj.hit()
                    else:
                        obj.destroy()
            for obs in self.obstacles:
                CollisionSystem.check_ball_obstacle(eb, obs)

    # ── Power-up logic ───────────────────────────────────────────

    def _spawn_powerup(self):
        type_id = random.choice(POWERUP_TYPE_IDS)
        margin = 24.0
        x = ARENA_LEFT + margin + random.random() * (ARENA_RIGHT - ARENA_LEFT - 2 * margin)
        zone_h = (ARENA_BOTTOM - ARENA_TOP) * 0.3
        y = ARENA_MID_Y + (random.random() - 0.5) * zone_h

        self._pu_id_counter += 1
        pu = ServerPowerUp(type_id, x, y, self._pu_id_counter)
        self.powerups.append(pu)

        self._queue("powerUpSpawned", {
            "id": pu.net_id,
            "typeId": pu.type_id,
            "x": round(pu.x, 1),
            "y": round(pu.y, 1),
        })

    def _apply_powerup(self, powerup: ServerPowerUp, collector: ServerPlayer):
        powerup.collect()
        collector.charge_super(SUPER_CHARGE_POWERUP)

        collector_id = "top" if collector.is_top else "bottom"
        opponent = self.top_player if not collector.is_top else self.bottom_player
        type_id = powerup.type_id

        if type_id == "fireball":
            self.ball.set_fireball(POWERUP_DURATION)
        elif type_id == "shield":
            self.field_objects.append(ServerShield(collector.is_top))
        elif type_id == "multiball":
            self._spawn_extra_balls(2)
        elif type_id == "grow":
            collector.apply_effect("giant", POWERUP_DURATION, {"sizeMultiplier": 2})
        elif type_id == "freeze":
            opponent.stun(FREEZE_STUN)
        elif type_id == "magnet":
            target_y = ARENA_BOTTOM if collector.is_top else ARENA_TOP
            self.ball.set_magnet(target_y, POWERUP_DURATION)
        elif type_id == "speed":
            collector.apply_effect("speed", POWERUP_DURATION, {"speedMultiplier": 1.5})

        self._queue("powerUpCollected", {
            "powerUpId": powerup.net_id,
            "collectorId": collector_id,
            "typeId": type_id,
        })

    def _spawn_extra_balls(self, count: int):
        for _ in range(count):
            eb = ServerBall()
            eb.x = (ARENA_LEFT + ARENA_RIGHT) / 2
            eb.y = ARENA_MID_Y
            angle = (random.random() - 0.5) * math.pi * 0.6
            direction = -1 if random.random() < 0.5 else 1
            eb.vx = math.sin(angle) * BALL_BASE_SPEED
            eb.vy = math.cos(angle) * BALL_BASE_SPEED * direction
            eb.frozen = False
            self.extra_balls.append(eb)

    # ── Super shots ──────────────────────────────────────────────

    def _execute_super_shot(self, player: ServerPlayer):
        opponent = self.top_player if not player.is_top else self.bottom_player
        ball = self.ball
        char_id = player.char_id
        direction = 1 if player.is_top else -1

        if char_id == "blaze":
            ball.set_fireball(BLAZE_SUPER_FIREBALL)
            ball.vx *= 1.5
            ball.vy *= 1.5

        elif char_id == "frost":
            opponent.stun(FROST_SUPER_STUN)
            ball.vx += -150 if player.x > ball.x else 150

        elif char_id == "shadow":
            mag = BALL_MAX_SPEED * 0.95
            ball.vy = mag * direction
            ball.vx = (random.random() - 0.5) * 80
            ball.set_shadow_blaze(SHADOW_BLAZE_DURATION)

        elif char_id == "tank":
            self.field_objects.append(ServerSuperShield(player.is_top))
            ball.vx *= 1.8
            ball.vy *= 1.8

        elif char_id == "spark":
            ball.x = ARENA_LEFT + random.random() * (ARENA_RIGHT - ARENA_LEFT - 40) + 20
            ball.y = ARENA_MID_Y + direction * 80
            ball.vy = BALL_MAX_SPEED * 0.85 * direction
            ball.vx = (random.random() - 0.5) * 120

        elif char_id == "venom":
            opponent.apply_effect("mirror", VENOM_MIRROR_DURATION, {"controlsReversed": True})

        self._queue("superShot", {
            "charId": char_id,
            "isTopPlayer": player.is_top,
        })

    # ── Goal detection ───────────────────────────────────────────

    def _check_goals(self):
        goal_result = self.ball.check_goal()
        if goal_result == 0:
            return

        scorer_id = "bottom" if goal_result == 1 else "top"
        self.ball.freeze()

        goal_x = (ARENA_LEFT + ARENA_RIGHT) / 2
        goal_y = ARENA_TOP if goal_result == 1 else ARENA_BOTTOM

        goal_data: dict = {
            "scorerId": scorer_id,
            "goalX": goal_x,
            "goalY": goal_y,
        }

        self._score_goal(scorer_id, goal_data)

    def _score_goal(self, scorer_id: str, goal_data: dict | None = None):
        if scorer_id == "bottom":
            self.bottom_score += 1
        else:
            self.top_score += 1

        self._last_scorer_id = scorer_id

        if goal_data is None:
            goal_data = {"scorerId": scorer_id}

        goal_data["topScore"] = self.top_score
        goal_data["bottomScore"] = self.bottom_score

        if self._is_match_won():
            winner = "bottom" if self.bottom_score > self.top_score else "top"
            self.phase = GamePhase.MATCH_END
            goal_data["matchEnd"] = True
            goal_data["winner"] = winner
        else:
            self.phase = GamePhase.ROUND_END

        self._queue("goal", goal_data)

    # ── Round / match management ─────────────────────────────────

    def _prepare_next_round(self):
        self.current_round += 1
        self.powerups.clear()
        self.field_objects.clear()
        self.extra_balls.clear()
        self._rebuild_obstacles()
        self._reset_collision_state()

        self.top_player.reset_position()
        self.bottom_player.reset_position()

        serve_dir = -1 if self._last_scorer_id == "bottom" else 1
        self.ball.reset(serve_dir)

    def _is_match_won(self) -> bool:
        target = self.rounds_to_win
        top = self.top_score
        bot = self.bottom_score
        if top < target and bot < target:
            return False
        return abs(top - bot) >= 2

    @property
    def is_deuce(self) -> bool:
        t = self.rounds_to_win
        return (
            self.top_score >= t - 1
            and self.bottom_score >= t - 1
            and self.top_score == self.bottom_score
        )

    @property
    def advantage(self) -> str | None:
        t = self.rounds_to_win
        if self.top_score < t - 1 or self.bottom_score < t - 1:
            return None
        if self.top_score == self.bottom_score:
            return None
        if abs(self.top_score - self.bottom_score) != 1:
            return None
        return "top" if self.top_score > self.bottom_score else "bottom"

    # ── Helpers ──────────────────────────────────────────────────

    def _rebuild_obstacles(self):
        self.obstacles = [ServerObstacle(d) for d in self._obstacle_defs]

    def _reset_collision_state(self):
        self._no_collide.clear()
        self._hit_cooldown.clear()
        self._last_hitter = None
        self._powerup_timer = 0.0

    def _update_cooldowns(self, dt: float):
        for key in list(self._no_collide):
            self._no_collide[key] -= dt
            if self._no_collide[key] <= 0:
                del self._no_collide[key]

        for key in list(self._hit_cooldown):
            self._hit_cooldown[key] -= dt
            if self._hit_cooldown[key] <= 0:
                del self._hit_cooldown[key]

    # ── Event system ─────────────────────────────────────────────

    def _queue(self, event_type: str, data: dict):
        self._pending_events.append((event_type, data))

    async def _flush_events(self):
        events = self._pending_events[:]
        self._pending_events.clear()
        if self._emit_cb:
            for event_type, data in events:
                await self._emit_cb(event_type, data)

    async def _emit(self, event_type: str, data: dict):
        if self._emit_cb:
            await self._emit_cb(event_type, data)

    async def _send_snapshot(self):
        """Build snapshot and send it together with any queued events
        as a single 'tick' message to minimise WebSocket frame overhead."""
        self._seq += 1
        state = {
            "seq": self._seq,
            "ball": self.ball.get_state(),
            "top": self.top_player.get_state(),
            "bottom": self.bottom_player.get_state(),
            "topScore": self.top_score,
            "bottomScore": self.bottom_score,
            "extraBalls": [eb.get_state() for eb in self.extra_balls],
        }

        # Collect queued events and bundle with snapshot in one message
        events = self._pending_events[:]
        self._pending_events.clear()

        await self._emit("tick", {
            "state": state,
            "events": [{"t": et, "d": ed} for et, ed in events] if events else [],
        })
