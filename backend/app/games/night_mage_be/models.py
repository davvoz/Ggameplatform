"""
Night Mage: one row per invader a player sent out.

An invader is a monster with its owner's name over its head. For two days it
turns up in other players' nights; what it does there (hearts taken, mages
defeated, times slain) is added up here and shown to its owner.
"""

from sqlalchemy import Column, Float, Integer, String

from app.models import Base


class NightMageInvader(Base):
    __tablename__ = "night_mage_invaders"

    id = Column(String, primary_key=True)
    owner_id = Column(String, nullable=False, index=True)
    kind = Column(String, nullable=False)
    level = Column(Integer, nullable=False)
    created_at = Column(Float, nullable=False)
    expires_at = Column(Float, nullable=False, index=True)
    appearances = Column(Integer, nullable=False, default=0)
    hits = Column(Integer, nullable=False, default=0)     # hearts taken from mages
    kills = Column(Integer, nullable=False, default=0)    # mages it defeated
    slain = Column(Integer, nullable=False, default=0)    # times a mage killed it
