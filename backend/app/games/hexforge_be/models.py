"""
Hexforge: one row per player holding their whole game state.

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
    created_at = Column(Float, nullable=False)
    updated_at = Column(Float, nullable=False)
