from fastapi import APIRouter, HTTPException, status, Request
from typing import List
from app.schemas import (
    GameRegister, 
    GameResponse, 
    GameListResponse, 
    SuccessResponse, 
    ErrorResponse
)
from app.database import (
    create_game,
    get_all_games,
    get_game_by_id,
    update_game,
    delete_game,
    increment_play_count,
    get_game_xp_rules,
    create_xp_rule,
    get_xp_rule_by_id,
    update_xp_rule,
    delete_xp_rule,
    toggle_xp_rule
)
from app.models import Game
from slowapi import Limiter
from slowapi.util import get_remote_address
import re

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Path validation regex - only alphanumeric, dash, underscore
GAME_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')

def validate_game_id(game_id: str) -> str:
    """Validate and sanitize game_id to prevent path traversal"""
    if not game_id:
        raise HTTPException(status_code=400, detail="game_id is required")
    
    # Block path traversal attempts
    if '..' in game_id or '/' in game_id or '\\' in game_id:
        raise HTTPException(status_code=400, detail="Invalid game_id: path traversal detected")
    
    # Only allow safe characters
    if not GAME_ID_PATTERN.match(game_id):
        raise HTTPException(status_code=400, detail="Invalid game_id: only alphanumeric, dash and underscore allowed")
    
    # Limit length
    if len(game_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid game_id: too long (max 100 chars)")
    
    return game_id

@router.post(
    "/register",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": ErrorResponse, "description": "Game already exists"},
        400: {"model": ErrorResponse, "description": "Invalid game data"}
    }
)
@limiter.limit("10/hour")
async def register_game(request: Request, game_data: GameRegister):
    """
    Register a new game in the platform.
    
    - **gameId**: Unique identifier for the game
    - **title**: Game title
    - **entryPoint**: Path to game's HTML entry file
    - **description**: Optional game description
    - **author**: Optional game author
    - **version**: Game version (default: 1.0.0)
    - **thumbnail**: URL to game thumbnail image
    - **category**: Game category
    - **tags**: List of tags for categorization
    - **metadata**: Additional game metadata
    """
    try:
        # Validate game_id to prevent path traversal
        game_data.gameId = validate_game_id(game_data.gameId)
        
        # Check if game already exists
        existing_game = get_game_by_id(game_data.gameId)
        if existing_game:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Game with ID '{game_data.gameId}' already exists"
            )
        
        # Convert Pydantic model to dict
        game_dict = game_data.dict()
        
        # Create game in database
        created_game = create_game(game_dict)
        
        return SuccessResponse(
            success=True,
            message=f"Game '{game_data.title}' registered successfully",
            data=created_game
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to register game: {str(e)}"
        )

@router.get(
    "/list",
    response_model=GameListResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def list_games(
    category: str = None,
    tag: str = None,
    featured: bool = None
):
    """
    List all registered games.
    
    Optional filters:
    - **category**: Filter by category
    - **tag**: Filter by tag
    - **featured**: Filter featured games only
    """
    try:
        games = get_all_games()
        
        # Apply filters
        if category:
            games = [g for g in games if g.get('category') == category]
        
        if tag:
            games = [g for g in games if tag in g.get('tags', [])]
        
        if featured is not None:
            games = [
                g for g in games 
                if g.get('metadata', {}).get('featured') == featured
            ]
        
        # Convert to response format
        game_responses = []
        for game in games:
            game_responses.append(GameResponse(
                game_id=game['game_id'],
                title=game['title'],
                description=game['description'],
                author=game['author'],
                version=game['version'],
                steem_rewards_enabled=game.get('steem_rewards_enabled', False),
                thumbnail=game['thumbnail'],
                entry_point=game['entry_point'],
                category=game['category'],
                tags=game['tags'],
                status_id=game.get('status_id'),
                status=game.get('status'),
                created_at=game['created_at'],
                updated_at=game['updated_at'],
                metadata=game['metadata']
            ))
        
        return GameListResponse(
            total=len(game_responses),
            games=game_responses
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve games: {str(e)}"
        )

@router.get(
    "/{gameId}/metadata",
    response_model=GameResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Game not found"},
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def get_game_metadata(gameId: str):
    """
    Get metadata for a specific game.
    
    - **gameId**: The unique identifier of the game
    """
    # Validate game_id to prevent path traversal
    gameId = validate_game_id(gameId)
    
    try:
        game = get_game_by_id(gameId)
        
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{gameId}' not found"
            )
        
        return GameResponse(
            game_id=game['game_id'],
            title=game['title'],
            description=game['description'],
            author=game['author'],
            version=game['version'],
            thumbnail=game['thumbnail'],
            entry_point=game['entry_point'],
            category=game['category'],
            tags=game['tags'],
            status_id=game.get('status_id'),
            status=game.get('status'),
            created_at=game['created_at'],
            updated_at=game['updated_at'],
            metadata=game['metadata']
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve game metadata: {str(e)}"
        )

@router.put(
    "/{gameId}",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Game not found"},
        400: {"model": ErrorResponse, "description": "Invalid update data"}
    }
)
async def update_game_metadata(gameId: str, game_data: GameRegister):
    """
    Update an existing game's metadata.
    
    - **gameId**: The unique identifier of the game to update
    """
    gameId = validate_game_id(gameId)
    try:
        existing_game = get_game_by_id(gameId)
        if not existing_game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{gameId}' not found"
            )
        
        # Update game
        game_dict = game_data.dict()
        updated_game = update_game(gameId, game_dict)
        
        return SuccessResponse(
            success=True,
            message=f"Game '{gameId}' updated successfully",
            data=updated_game
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update game: {str(e)}"
        )

@router.delete(
    "/{gameId}",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Game not found"}
    }
)
async def delete_game_endpoint(gameId: str):
    """
    Delete a game from the platform.
    
    - **gameId**: The unique identifier of the game to delete
    """
    gameId = validate_game_id(gameId)
    try:
        deleted = delete_game(gameId)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{gameId}' not found"
            )
        
        return SuccessResponse(
            success=True,
            message=f"Game '{gameId}' deleted successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete game: {str(e)}"
        )

@router.post(
    "/{gameId}/play",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Game not found"}
    }
)
async def track_game_play(gameId: str):
    """
    Track when a game is played (increment play count).
    
    - **gameId**: The unique identifier of the game
    """
    gameId = validate_game_id(gameId)
    try:
        success = increment_play_count(gameId)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{gameId}' not found"
            )
        
        return SuccessResponse(
            success=True,
            message="Play count incremented"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to track play: {str(e)}"
        )


# ============ XP RULES ENDPOINTS ============

@router.get(
    "/{gameId}/xp-rules",
    responses={
        404: {"model": ErrorResponse, "description": "Game not found"},
        200: {"description": "List of XP rules for the game"}
    }
)
async def get_game_xp_rules_endpoint(gameId: str, active_only: bool = True):
    """
    Get all XP rules for a specific game.
    
    - **gameId**: The unique identifier of the game
    - **active_only**: Filter only active rules (default: True)
    """
    gameId = validate_game_id(gameId)
    try:
        # Verify game exists
        game = get_game_by_id(gameId)
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{gameId}' not found"
            )
        
        rules = get_game_xp_rules(gameId, active_only=active_only)
        
        return {
            "success": True,
            "game_id": gameId,
            "total_rules": len(rules),
            "rules": rules
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve XP rules: {str(e)}"
        )


@router.post(
    "/{gameId}/xp-rules",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"model": ErrorResponse, "description": "Game not found"},
        400: {"model": ErrorResponse, "description": "Invalid rule data"}
    }
)
async def create_xp_rule_endpoint(gameId: str, rule_data: dict):
    """
    Create a new XP calculation rule for a game.
    
    - **gameId**: The unique identifier of the game
    - **rule_data**: Rule configuration (name, type, parameters, priority)
    
    Example request body:
    ```json
    {
        "rule_name": "Score Multiplier",
        "rule_type": "score_multiplier",
        "parameters": {"multiplier": 0.01, "max_xp": 100},
        "priority": 10,
        "is_active": true
    }
    ```
    
    Available rule types:
    - **score_multiplier**: XP = score * multiplier
    - **time_bonus**: XP based on time played
    - **threshold**: XP awarded when score reaches thresholds
    - **high_score_bonus**: Bonus XP for new high score
    - **combo**: Bonus for meeting multiple conditions
    - **percentile_improvement**: XP for % improvement
    """
    try:
        # Verify game exists
        game = get_game_by_id(gameId)
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{gameId}' not found"
            )
        
        # Validate required fields
        required_fields = ['rule_name', 'rule_type', 'parameters']
        for field in required_fields:
            if field not in rule_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        # Create rule
        rule = create_xp_rule(
            game_id=gameId,
            rule_name=rule_data['rule_name'],
            rule_type=rule_data['rule_type'],
            parameters=rule_data['parameters'],
            priority=rule_data.get('priority', 0),
            is_active=rule_data.get('is_active', True)
        )
        
        return SuccessResponse(
            success=True,
            message=f"XP rule '{rule_data['rule_name']}' created successfully",
            data=rule
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create XP rule: {str(e)}"
        )


@router.get(
    "/{gameId}/xp-rules/{ruleId}",
    responses={
        404: {"model": ErrorResponse, "description": "Rule not found"}
    }
)
async def get_xp_rule_endpoint(gameId: str, ruleId: str):
    """
    Get a specific XP rule by ID.
    
    - **gameId**: The unique identifier of the game
    - **ruleId**: The unique identifier of the XP rule
    """
    try:
        rule = get_xp_rule_by_id(ruleId)
        
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{ruleId}' not found"
            )
        
        # Verify rule belongs to this game
        if rule['game_id'] != gameId:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{ruleId}' does not belong to game '{gameId}'"
            )
        
        return {
            "success": True,
            "rule": rule
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve XP rule: {str(e)}"
        )


@router.put(
    "/{gameId}/xp-rules/{ruleId}",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Rule not found"},
        400: {"model": ErrorResponse, "description": "Invalid update data"}
    }
)
async def update_xp_rule_endpoint(gameId: str, ruleId: str, updates: dict):
    """
    Update an existing XP rule.
    
    - **gameId**: The unique identifier of the game
    - **ruleId**: The unique identifier of the XP rule
    - **updates**: Fields to update (rule_name, rule_type, parameters, priority, is_active)
    """
    try:
        # Verify rule exists and belongs to game
        existing_rule = get_xp_rule_by_id(ruleId)
        if not existing_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{ruleId}' not found"
            )
        
        if existing_rule['game_id'] != gameId:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{ruleId}' does not belong to game '{gameId}'"
            )
        
        # Update rule
        updated_rule = update_xp_rule(ruleId, updates)
        
        return SuccessResponse(
            success=True,
            message=f"XP rule '{ruleId}' updated successfully",
            data=updated_rule
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update XP rule: {str(e)}"
        )


@router.delete(
    "/{gameId}/xp-rules/{ruleId}",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Rule not found"}
    }
)
async def delete_xp_rule_endpoint(gameId: str, ruleId: str):
    """
    Delete an XP rule.
    
    - **gameId**: The unique identifier of the game
    - **ruleId**: The unique identifier of the XP rule
    """
    try:
        # Verify rule exists and belongs to game
        existing_rule = get_xp_rule_by_id(ruleId)
        if not existing_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{ruleId}' not found"
            )
        
        if existing_rule['game_id'] != gameId:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{ruleId}' does not belong to game '{gameId}'"
            )
        
        # Delete rule
        deleted = delete_xp_rule(ruleId)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete XP rule"
            )
        
        return SuccessResponse(
            success=True,
            message=f"XP rule '{ruleId}' deleted successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete XP rule: {str(e)}"
        )


@router.patch(
    "/{gameId}/xp-rules/{ruleId}/toggle",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Rule not found"}
    }
)
async def toggle_xp_rule_endpoint(gameId: str, ruleId: str, is_active: bool):
    """
    Toggle an XP rule's active status.
    
    - **gameId**: The unique identifier of the game
    - **ruleId**: The unique identifier of the XP rule
    - **is_active**: New active status (true/false)
    """
    try:
        # Verify rule exists and belongs to game
        existing_rule = get_xp_rule_by_id(ruleId)
        if not existing_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{ruleId}' not found"
            )
        
        if existing_rule['game_id'] != gameId:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{ruleId}' does not belong to game '{gameId}'"
            )
        
        # Toggle rule
        updated_rule = toggle_xp_rule(ruleId, is_active)
        
        status_text = "activated" if is_active else "deactivated"
        
        return SuccessResponse(
            success=True,
            message=f"XP rule '{ruleId}' {status_text} successfully",
            data=updated_rule
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle XP rule: {str(e)}"
        )
