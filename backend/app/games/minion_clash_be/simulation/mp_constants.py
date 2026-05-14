"""
Multiplayer-supported card whitelist.

Full parity with cards.json (30 cards). The simulation now supports
auras, onDeath summons, on-hit slow, taunt, low-HP rage, siege bonus,
and AoE+slow / AoE+heal spells.

The client `DeckEditor` filters the visible roster to this set when
building a multiplayer deck. The server enforces the same filter on
deck handshake (defense in depth).
"""

from __future__ import annotations

MP_SUPPORTED_CARD_IDS: frozenset[str] = frozenset({
    # Summons (25)
    "skeleton_squad",
    "goblin_pack",
    "imp_trio",
    "wolf_pair",
    "knight",
    "stone_golem",
    "troll_brute",
    "iron_sentinel",
    "crossbowman",
    "archer_trio",
    "mage_apprentice",
    "frost_sniper",
    "bat_swarm",
    "wyvern",
    "phoenix",
    "drake",
    "healer",
    "war_banner",
    "time_witch",
    "necromancer",
    "plague_doctor",
    "shield_maiden",
    "berserker",
    "assassin",
    "cannon",
    # Spells (5)
    "fireball",
    "frost_nova",
    "lightning_bolt",
    "heal_wave",
    "earthquake",
})


def is_mp_supported(card_id: str) -> bool:
    return card_id in MP_SUPPORTED_CARD_IDS
