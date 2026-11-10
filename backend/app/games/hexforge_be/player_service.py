"""
Hexforge: a player's saved state and the actions that change it.

Every action loads the row, applies a pure rule from `economy`, and saves
with a version check. A save that loses a race raises StaleState and changes
nothing; the client simply retries with fresh state.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import User

from . import defense, economy, forge, outposts, progress, pvp, rewards
from .catalog import BUILDINGS
from .errors import ActionError, StaleState
from .models import HexforgeAttack, HexforgePlayer
from .simulation import DEFAULT_AIM, simulate

__all__ = ["ActionError", "PlayerService", "PlayerState", "StaleState", "public_state"]


@dataclass
class PlayerState:
    user_id: str
    city: dict
    heroes: list
    materials: dict
    version: int
    trophies: int = 0


class PlayerService:
    def __init__(self, db: Session):
        self.db = db

    # ── load / save ────────────────────────────────────────────────────
    def load(self, user_id: str, now: float) -> PlayerState:
        """The player's state, creating the starter city on first visit."""
        row = self.db.get(HexforgePlayer, user_id)
        if row is None:
            city = economy.starter_city(now)
            forge.ensure_forge(city)
            outposts.ensure_campaign(city, now)
            pvp.ensure_pvp(city)
            progress.ensure_progress(city)
            row = HexforgePlayer(
                user_id=user_id,
                city_json=json.dumps(city),
                heroes_json=json.dumps(economy.starter_heroes()),
                materials_json=json.dumps(economy.STARTING_MATERIALS),
                version=1,
                trophies=0,
                created_at=now,
                updated_at=now,
            )
            self.db.add(row)
            try:
                self.db.commit()
            except IntegrityError:
                # a parallel first visit created the row: use that one
                self.db.rollback()
                row = self.db.get(HexforgePlayer, user_id)
        return _state_of(row, now)

    def existing(self, user_id: str, now: float):
        """Another player's state, or None if they never played (nothing is created)."""
        row = self.db.get(HexforgePlayer, user_id)
        return _state_of(row, now) if row is not None else None

    def save(self, state: PlayerState, now: float) -> None:
        self.save_together([state], now)

    def save_together(self, states: list, now: float, extra_rows=()) -> None:
        """Save several players (and log rows) in one transaction, or none of them."""
        for state in states:
            if not self._update(state, now):
                self.db.rollback()
                raise StaleState()
        self.db.add_all(list(extra_rows))
        self.db.commit()
        for state in states:
            state.version += 1

    def _update(self, state: PlayerState, now: float) -> bool:
        updated = (
            self.db.query(HexforgePlayer)
            .filter(HexforgePlayer.user_id == state.user_id,
                    HexforgePlayer.version == state.version)
            .update({
                HexforgePlayer.city_json: json.dumps(state.city),
                HexforgePlayer.heroes_json: json.dumps(state.heroes),
                HexforgePlayer.materials_json: json.dumps(state.materials),
                HexforgePlayer.version: state.version + 1,
                HexforgePlayer.trophies: state.trophies,
                HexforgePlayer.updated_at: now,
            }, synchronize_session=False)
        )
        return updated == 1

    # ── actions ────────────────────────────────────────────────────────
    def collect(self, user_id: str, now: float, building_ids=None) -> tuple[PlayerState, dict, dict]:
        state = self.load(user_id, now)
        gained = economy.collect(state.city, state.materials, now, building_ids)
        units = sum(gained.values())
        if units:
            rewards.record(state.city, "collect")
            rewards.record(state.city, "collect_units", units)
        earned = _earn(state, progress.xp_for_collecting(units))
        if any(gained.values()):
            self.save(state, now)
        return state, gained, earned

    def move_building(self, user_id: str, building_id: int, x: int, y: int, now: float) -> PlayerState:
        state = self.load(user_id, now)
        building = next((b for b in state.city["buildings"] if b["id"] == building_id), None)
        if building is None:
            raise ActionError("unknown_building")
        error = economy.placement_error(state.city, building["type"], x, y, ignore_id=building_id)
        if error:
            raise ActionError(error)
        building["x"], building["y"] = x, y
        self.save(state, now)
        return state

    def start_forging(self, user_id: str, recipe_id: str, now: float) -> PlayerState:
        state = self.load(user_id, now)
        forge.start(state.city, state.heroes, state.materials, recipe_id, now)
        rewards.record(state.city, "forge")
        self.save(state, now)
        return state

    def claim_forged(self, user_id: str, job_id: int, now: float) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        result = forge.claim(state.city, state.heroes, job_id, now)
        result.update(_earn(state, progress.xp_for_forging(forge.RECIPES[result["item"]].seconds)))
        rewards.record(state.city, "claim")
        self.save(state, now)
        return state, result

    def place_building(self, user_id: str, building_type: str, x: int, y: int, now: float) -> PlayerState:
        state = self.load(user_id, now)
        forge.place(state.city, building_type, x, y, now)
        self.save(state, now)
        return state

    def attack_outpost(self, user_id: str, outpost_id: int, hero_ids: list, side: str,
                       priority: str, tactic: str, now: float) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        result = outposts.attack(state.city, state.heroes, state.materials, outpost_id,
                                 hero_ids, side, priority, tactic, now)
        result["rewards"].update(_earn(state, progress.xp_for_attack("outpost", result["summary"]["victory"])))
        _record_attack(state, result["summary"]["victory"])
        self.save(state, now)
        return state, result

    def set_aim(self, user_id: str, building_id: int, aim: str, now: float) -> PlayerState:
        state = self.load(user_id, now)
        defense.set_aim(state.city, building_id, aim)
        self.save(state, now)
        return state

    def defense_test(self, user_id: str, now: float) -> dict:
        """Read only: the city is tested as saved, nothing changes."""
        return defense.run_defense_test(self.load(user_id, now).city)

    # ── PvP ────────────────────────────────────────────────────────────
    def find_rival(self, user_id: str, now: float, rng: random.Random | None = None) -> PlayerState:
        state = self.load(user_id, now)
        pvp.require_arena(state.city)
        rows = (self.db.query(HexforgePlayer.user_id, HexforgePlayer.city_json, HexforgePlayer.trophies)
                .filter(HexforgePlayer.user_id != user_id).all())
        candidates = [(uid, json.loads(city), trophies or 0) for uid, city, trophies in rows]
        state.city["pvp"]["scout"] = pvp.choose_rival(state.city, state.trophies, candidates, now, rng)
        self.save(state, now)
        return state

    def rival_view(self, state: PlayerState, now: float):
        """The scouted rival as the attacker may see it, or None."""
        rival_id = state.city["pvp"]["scout"]
        rival = self.existing(rival_id, now) if rival_id else None
        if rival is None:
            return None
        return pvp.public_rival(self.names([rival_id])[rival_id], defense.battle_city(rival.city),
                                rival.materials, pvp.attackable(rival.city, now),
                                rival.trophies, state.trophies)

    def attack_rival(self, user_id: str, hero_ids: list, side: str, priority: str, tactic: str,
                     now: float) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        pvp.require_arena(state.city)
        rival_id = state.city["pvp"]["scout"]
        if rival_id is None:
            raise ActionError("no_rival")
        rival = self.existing(rival_id, now)
        if rival is None or not pvp.attackable(rival.city, now):
            raise ActionError("rival_unavailable")
        classes = outposts.squad_classes(state.heroes, hero_ids, now)
        outposts.spend_energy(state.city, now)

        target = defense.battle_city(rival.city)
        battle = simulate(target, classes, side, priority, tactic)
        summary = battle["summary"]
        loot = pvp.settle_attack(state.city, rival.city, state.materials, rival.materials, summary, now)
        injured = outposts.injure_fallen(state.heroes, hero_ids, summary, now)
        rival_before = rival.trophies
        state.trophies, rival.trophies, trophies = pvp.settle_trophies(
            state.trophies, rival.trophies, summary["victory"])
        earned = _earn(state, progress.xp_for_attack("rival", summary["victory"]))
        _record_attack(state, summary["victory"])
        log = HexforgeAttack(
            attacker_id=user_id, defender_id=rival_id, created_at=now,
            setup_json=json.dumps({"squad": classes, "side": side, "priority": priority, "tactic": tactic}),
            city_json=json.dumps(target), summary_json=json.dumps(summary), loot_json=json.dumps(loot),
            trophies=trophies, defender_trophies=rival.trophies - rival_before,
        )
        self.save_together([state, rival], now, [log])
        name = self.names([rival_id])[rival_id]
        return state, {"rival": name, "city": target, **battle,
                       "rewards": {"loot": loot, "injured": injured, "trophies": trophies, **earned}}

    # ── defence log ────────────────────────────────────────────────────
    def defense_log(self, user_id: str, now: float, limit: int = 20) -> dict:
        """The latest raids on your city, newest first."""
        state = self.load(user_id, now)
        rows = (self.db.query(HexforgeAttack).filter(HexforgeAttack.defender_id == user_id)
                .order_by(HexforgeAttack.created_at.desc(), HexforgeAttack.id.desc()).limit(limit).all())
        raider_ids = sorted({r.attacker_id for r in rows})
        names = self.names(raider_ids)
        raiders = {uid: self.existing(uid, now) for uid in raider_ids}
        raids = []
        for r in rows:
            summary = json.loads(r.summary_json)
            raider = raiders[r.attacker_id]
            raids.append({
                "id": r.id, "at": r.created_at, "raider": names[r.attacker_id],
                "breached": summary["victory"], "destruction": summary["destruction"],
                "core_destroyed": summary["core_destroyed"], "loot": json.loads(r.loot_json),
                "trophies": r.defender_trophies, "seen": bool(r.seen),
                "can_revenge": pvp.can_revenge(state.city, r.created_at, raider.city if raider else None, now),
            })
        unseen = (self.db.query(HexforgeAttack)
                  .filter(HexforgeAttack.defender_id == user_id, HexforgeAttack.seen == 0).count())
        return {"raids": raids, "unseen": unseen}

    def mark_defenses_seen(self, user_id: str) -> None:
        (self.db.query(HexforgeAttack)
         .filter(HexforgeAttack.defender_id == user_id, HexforgeAttack.seen == 0)
         .update({HexforgeAttack.seen: 1}, synchronize_session=False))
        self.db.commit()

    def _raid_on(self, user_id: str, raid_id: int) -> HexforgeAttack:
        row = self.db.get(HexforgeAttack, raid_id)
        if row is None or row.defender_id != user_id:
            raise ActionError("unknown_raid")
        return row

    def defense_replay(self, user_id: str, raid_id: int) -> dict:
        """Rebuild a raid's replay from its inputs: the battle is deterministic."""
        row = self._raid_on(user_id, raid_id)
        setup = json.loads(row.setup_json)
        city = json.loads(row.city_json)
        battle = simulate(city, setup["squad"], setup["side"], setup["priority"], setup["tactic"])
        return {"raider": self.names([row.attacker_id])[row.attacker_id], "city": city, **setup, **battle}

    def revenge(self, user_id: str, raid_id: int, now: float) -> PlayerState:
        """Scout the player who raided you, skipping matchmaking."""
        row = self._raid_on(user_id, raid_id)
        state = self.load(user_id, now)
        pvp.require_arena(state.city)
        raider = self.existing(row.attacker_id, now)
        if not pvp.can_revenge(state.city, row.created_at, raider.city if raider else None, now):
            raise ActionError("revenge_unavailable")
        state.city["pvp"]["scout"] = row.attacker_id
        self.save(state, now)
        return state

    def leaderboard(self, user_id: str, now: float, limit: int = 50) -> dict:
        """The best players by trophies, and where you stand."""
        rows = (self.db.query(HexforgePlayer.user_id, HexforgePlayer.trophies)
                .filter(HexforgePlayer.trophies > 0)
                .order_by(HexforgePlayer.trophies.desc(), HexforgePlayer.user_id)
                .limit(limit).all())
        names = self.names([uid for uid, _ in rows])
        top = [{"rank": i, "name": names[uid], "trophies": trophies, "league": pvp.league(trophies),
                "me": uid == user_id} for i, (uid, trophies) in enumerate(rows, start=1)]
        mine = self.load(user_id, now).trophies
        rank = None
        if mine > 0:
            rank = 1 + self.db.query(HexforgePlayer).filter(HexforgePlayer.trophies > mine).count()
        return {"top": top, "me": {"trophies": mine, "rank": rank, "league": pvp.league(mine),
                                   "next_league": pvp.next_league(mine)}}

    def names(self, user_ids: list) -> dict:
        """Display names for players; anonymous players get a stable placeholder."""
        rows = (self.db.query(User.user_id, User.username, User.steem_username)
                .filter(User.user_id.in_(user_ids)).all())
        found = {uid: username or steem for uid, username, steem in rows}
        return {uid: found.get(uid) or f"Raider {uid[-4:].upper()}" for uid in user_ids}

    # ── rewards and bonuses ────────────────────────────────────────────
    def claim_login(self, user_id: str, now: float) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        got = rewards.claim_login(state.city, state.materials, now)
        self.save(state, now)
        return state, got

    def claim_task(self, user_id: str, task_id: str, now: float) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        got = rewards.claim_task(state.city, state.materials, task_id)
        self.save(state, now)
        return state, got

    def claim_chest(self, user_id: str, now: float) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        got = rewards.claim_chest(state.city, state.materials)
        self.save(state, now)
        return state, got

    def use_bonus(self, user_id: str, bonus: str, now: float, **target) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        used = rewards.use_bonus(state.city, state.heroes, bonus, now, **target)
        self.save(state, now)
        return state, used

    def dismantle_building(self, user_id: str, building_id: int, now: float) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        refund = forge.dismantle(state.city, state.materials, building_id, now)
        self.save(state, now)
        return state, refund


def _state_of(row: HexforgePlayer, now: float) -> PlayerState:
    state = PlayerState(
        user_id=row.user_id,
        city=json.loads(row.city_json),
        heroes=json.loads(row.heroes_json),
        materials=json.loads(row.materials_json),
        version=row.version,
        trophies=row.trophies or 0,
    )
    forge.ensure_forge(state.city)
    outposts.ensure_campaign(state.city, now)
    pvp.ensure_pvp(state.city)
    progress.ensure_progress(state.city)
    rewards.ensure_rewards(state.city, row.user_id, now)
    return state


def _record_attack(state: PlayerState, victory: bool) -> None:
    rewards.record(state.city, "attack")
    if victory:
        rewards.record(state.city, "win")


def _earn(state: PlayerState, xp: int) -> dict:
    """Give XP; returns {"xp": gained, "levels": [levels reached with their gifts]}."""
    return {"xp": xp, "levels": progress.gain(state.city, state.materials, xp)}


def public_state(state: PlayerState, now: float) -> dict:
    """What the client sees: buildings with size, HP and what they have made."""
    buildings = []
    for b in state.city["buildings"]:
        spec = BUILDINGS[b["type"]]
        item = {"id": b["id"], "type": b["type"], "x": b["x"], "y": b["y"],
                "size": spec.size, "hp": spec.hp}
        if b["type"] in economy.PRODUCTION:
            material, per_hour = economy.PRODUCTION[b["type"]]
            item["production"] = {
                "material": material,
                "per_hour": per_hour,
                "pending": economy.pending(b, now),
                "capacity": economy.capacity(b["type"]),
            }
        if defense.is_tower(b):
            item["aim"] = b.get("aim", DEFAULT_AIM)
            item["range"] = spec.attack_range
        buildings.append(item)
    jobs = [{**job, "ready": job["ready_at"] <= now} for job in state.city["forge"]["jobs"]]
    return {
        "city": {"grid": state.city["grid"], "buildings": buildings},
        "heroes": state.heroes,
        "materials": state.materials,
        "storage": state.city["storage"],
        "forge": {"slots": state.city["forge"]["slots"], "jobs": jobs},
        "recipes": forge.public_recipes(state.city, state.heroes),
        "energy": outposts.public_energy(state.city["energy"], now),
        "progress": progress.public_progress(state.city),
        "bonuses": state.city["bonuses"],
        "rewards": {**rewards.public_rewards(state.city, now),
                    "ready": rewards.ready_count(state.city, now)},
        "pvp": {**_public_pvp(state.city, now), "trophies": state.trophies, "league": pvp.league(state.trophies),
                "next_league": pvp.next_league(state.trophies)},
        "version": state.version,
        "server_time": now,
    }


def _public_pvp(city: dict, now: float) -> dict:
    shield = pvp.shield_until(city)
    return {"arena": pvp.in_arena(city), "shield_until": shield if shield > now else None}
