"""
Handler Registry — maps game IDs to their quest handler classes.

To add a new game, create a handler in ``game_handlers/`` and add one entry
to ``GAME_HANDLERS`` below.  No other file needs to change (OCP).
"""

from typing import Dict, Optional, Type

from app.quest_tracker.base_game_handler import BaseGameQuestHandler
from app.quest_tracker.game_handlers.seven import SevenHandler
from app.quest_tracker.game_handlers.yatzi import YatziHandler
from app.quest_tracker.game_handlers.merge_td import MergeTDHandler
from app.quest_tracker.game_handlers.rainbow_rush import RainbowRushHandler
from app.quest_tracker.game_handlers.briscola import BriscolaHandler
from app.quest_tracker.game_handlers.sky_tower import SkyTowerHandler
from app.quest_tracker.game_handlers.survivor_arena import SurvivorArenaHandler
from app.quest_tracker.game_handlers.space_shooter import SpaceShooterHandler
from app.quest_tracker.game_handlers.space_shooter_2 import SpaceShooter2Handler
from app.quest_tracker.game_handlers.setteemezzo import SettemezzoHandler
from app.quest_tracker.game_handlers.modern_pong import ModernPongHandler

GAME_HANDLERS: Dict[str, Type[BaseGameQuestHandler]] = {
    "seven": SevenHandler,
    "yatzi_3d_by_luciogiolli": YatziHandler,
    "merge-tower-defense": MergeTDHandler,
    "rainbow-rush": RainbowRushHandler,
    "briscola": BriscolaHandler,
    "sky-tower": SkyTowerHandler,
    "survivor-arena": SurvivorArenaHandler,
    "space_shooter": SpaceShooterHandler,
    "space_shooter_2": SpaceShooter2Handler,
    "setteemezzo": SettemezzoHandler,
    "modern_pong": ModernPongHandler,
}


def get_handler_class(game_id: str) -> Optional[Type[BaseGameQuestHandler]]:
    """Return the handler class for *game_id*, or ``None``."""
    return GAME_HANDLERS.get(game_id)
