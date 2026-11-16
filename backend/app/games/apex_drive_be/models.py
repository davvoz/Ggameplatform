"""
Apex Drive: a career per player, and the races they start (career races and
challenge runs), each with the car it started with, so that what the game
reports at the end can be checked against it.
"""

from sqlalchemy import Boolean, Column, Float, Integer, String, Text

from app.models import Base


class ApexDriveCareer(Base):
    __tablename__ = "apex_drive_careers"

    user_id = Column(String, primary_key=True)
    data = Column(Text, nullable=False)          # career.Career.to_dict(), as JSON
    updated_at = Column(Float, nullable=False)


class ApexDriveRace(Base):
    __tablename__ = "apex_drive_races"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    kind = Column(String, nullable=False)        # "career" or "challenge"
    track_id = Column(String, nullable=False)
    week_id = Column(String, nullable=True, index=True)   # challenge runs: the week raced
    seed = Column(Integer, nullable=False)
    stats = Column(Text, nullable=False)         # the car's stats at the start, as JSON
    started_at = Column(Float, nullable=False)
    finished_at = Column(Float, nullable=True)
    time = Column(Float, nullable=True)          # challenge runs: race time, seconds
    score = Column(Integer, nullable=True)       # challenge runs: leaderboard points
    claimed = Column(Boolean, nullable=False, default=False)  # its score reached the leaderboard
