"""
Hexforge: one row per player holding their whole game state, and the attack log.

City, heroes and materials are JSON: they are always read and written
together, and the city is small (a few dozen buildings). `version` is bumped
on every save so two requests racing on the same player cannot both win
(e.g. collecting the same materials twice).
"""

from sqlalchemy import Column, Float, Integer, String, Text

from app.models import Base


class HexforgePlayer(Base):
    __tablename__ = "hexforge_players"

    user_id = Column(String, primary_key=True)
    city_json = Column(Text, nullable=False)
    heroes_json = Column(Text, nullable=False)
    materials_json = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    trophies = Column(Integer, nullable=False, default=0, index=True)   # PvP score, never reset
    created_at = Column(Float, nullable=False)
    updated_at = Column(Float, nullable=False)


class HexforgeAttack(Base):
    """One attack on another player. The battle is deterministic, so the
    inputs (squad, choices, the defender's city at that moment) are enough
    to rebuild its replay later."""

    __tablename__ = "hexforge_attacks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attacker_id = Column(String, nullable=False, index=True)
    defender_id = Column(String, nullable=False, index=True)
    created_at = Column(Float, nullable=False)
    setup_json = Column(Text, nullable=False)     # {squad, side, priority, tactic}
    city_json = Column(Text, nullable=False)      # the defender's battle city
    summary_json = Column(Text, nullable=False)
    loot_json = Column(Text, nullable=False)
    trophies = Column(Integer, nullable=False, default=0)   # the attacker's change
    defender_trophies = Column(Integer, nullable=False, default=0)
    seen = Column(Integer, nullable=False, default=0)       # the defender has read it
