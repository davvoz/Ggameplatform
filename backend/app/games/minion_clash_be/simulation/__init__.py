"""
Minion Clash — Server-Authoritative Simulation (Level A2.1)
============================================================

This package owns the entire battle simulation for multiplayer matches.
The server is the single source of truth for tower HP, hero HP, mana,
cooldowns and the match outcome.

Module layout (dependency order):
    arena.py            — engine constants (mirror of GameConfig.BATTLE/ARENA)
    mp_constants.py     — list of cards supported in MP (A2.1 subset)
    data_loader.py      — loads cards/units/heroes/towers JSON catalogs
    entities.py         — Entity, Unit, Hero, Tower, Projectile
    entity_manager.py   — add/remove/iterate + cull
    spatial_index.py    — uniform-grid spatial queries
    spawn_system.py     — cluster spawn from cards
    movement_system.py  — soft-body separation
    combat_system.py    — projectile factory
    spells.py           — A2.1 spell resolver (aoe_damage + single_damage)
    team_state.py       — mana + cooldowns + hand + deck + tower + hero
    snapshot.py         — JSON serialization for WS broadcast
    battle_session.py   — asyncio tick loop, top-level orchestrator
"""
