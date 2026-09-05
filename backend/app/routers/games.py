from fastapi import APIRouter, HTTPException, status, Request, Depends
from typing import Annotated, List
from app.routers.admin import verify_token_from_cookie
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

# Reusable description strings (Sonar S1192 - duplicated string literals).
# Endpoints with more than one status code spell out the full literal dict
# below instead of `**`-merging these: Sonar's S8415 checker only resolves
# literal int status-code keys in `responses=`, not dict spreads.
_DESC_ADMIN_401 = "Admin authentication required"
_DESC_SERVER_500 = "Server error"
_DESC_INVALID_GAME_ID_400 = "Invalid game_id"
_DESC_GAME_404 = "Game not found"
_DESC_RULE_404 = "Rule not found"
_RESP_SERVER_500 = {500: {"model": ErrorResponse, "description": _DESC_SERVER_500}}

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
        401: {"model": ErrorResponse, "description": _DESC_ADMIN_401},
        409: {"model": ErrorResponse, "description": "Game already exists"},
        400: {"model": ErrorResponse, "description": "Invalid game data"}
    }
)
@limiter.limit("10/hour")
async def register_game(request: Request, game_data: GameRegister, admin_username: Annotated[str, Depends(verify_token_from_cookie)]):
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
    responses=_RESP_SERVER_500
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
                active_campaign=game.get('active_campaign'),
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
    "/{game_id}/metadata",
    response_model=GameResponse,
    responses={
        400: {"model": ErrorResponse, "description": _DESC_INVALID_GAME_ID_400},
        404: {"model": ErrorResponse, "description": _DESC_GAME_404},
        500: {"model": ErrorResponse, "description": _DESC_SERVER_500},
    }
)
async def get_game_metadata(game_id: str):
    """
    Get metadata for a specific game.
    
    - **game_id**: The unique identifier of the game
    """
    # Validate game_id to prevent path traversal
    game_id = validate_game_id(game_id)
    
    try:
        game = get_game_by_id(game_id)
        
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{game_id}' not found"
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
    "/{game_id}",
    response_model=SuccessResponse,
    responses={
        401: {"model": ErrorResponse, "description": _DESC_ADMIN_401},
        404: {"model": ErrorResponse, "description": _DESC_GAME_404},
        400: {"model": ErrorResponse, "description": "Invalid update data"}
    }
)
async def update_game_metadata(game_id: str, game_data: GameRegister, admin_username: Annotated[str, Depends(verify_token_from_cookie)]):
    """
    Update an existing game's metadata.
    
    - **game_id**: The unique identifier of the game to update
    """
    game_id = validate_game_id(game_id)
    try:
        existing_game = get_game_by_id(game_id)
        if not existing_game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{game_id}' not found"
            )
        
        # Update game
        game_dict = game_data.dict()
        updated_game = update_game(game_id, game_dict)
        
        return SuccessResponse(
            success=True,
            message=f"Game '{game_id}' updated successfully",
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
    "/{game_id}",
    response_model=SuccessResponse,
    responses={
        400: {"model": ErrorResponse, "description": _DESC_INVALID_GAME_ID_400},
        401: {"model": ErrorResponse, "description": _DESC_ADMIN_401},
        404: {"model": ErrorResponse, "description": _DESC_GAME_404},
    }
)
async def delete_game_endpoint(game_id: str, admin_username: Annotated[str, Depends(verify_token_from_cookie)]):
    """
    Delete a game from the platform.
    
    - **game_id**: The unique identifier of the game to delete
    """
    game_id = validate_game_id(game_id)
    try:
        deleted = delete_game(game_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{game_id}' not found"
            )
        
        return SuccessResponse(
            success=True,
            message=f"Game '{game_id}' deleted successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete game: {str(e)}"
        )

@router.post(
    "/{game_id}/play",
    response_model=SuccessResponse,
    responses={
        400: {"model": ErrorResponse, "description": _DESC_INVALID_GAME_ID_400},
        404: {"model": ErrorResponse, "description": _DESC_GAME_404},
    }
)
async def track_game_play(game_id: str):
    """
    Track when a game is played (increment play count).
    
    - **game_id**: The unique identifier of the game
    """
    game_id = validate_game_id(game_id)
    try:
        success = increment_play_count(game_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{game_id}' not found"
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
    "/{game_id}/xp-rules",
    responses={
        400: {"model": ErrorResponse, "description": _DESC_INVALID_GAME_ID_400},
        404: {"model": ErrorResponse, "description": _DESC_GAME_404},
        200: {"description": "List of XP rules for the game"}
    }
)
async def get_game_xp_rules_endpoint(game_id: str, active_only: bool = True):
    """
    Get all XP rules for a specific game.
    
    - **game_id**: The unique identifier of the game
    - **active_only**: Filter only active rules (default: True)
    """
    game_id = validate_game_id(game_id)
    try:
        # Verify game exists
        game = get_game_by_id(game_id)
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{game_id}' not found"
            )
        
        rules = get_game_xp_rules(game_id, active_only=active_only)
        
        return {
            "success": True,
            "game_id": game_id,
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
    "/{game_id}/xp-rules",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse, "description": _DESC_ADMIN_401},
        404: {"model": ErrorResponse, "description": _DESC_GAME_404},
        400: {"model": ErrorResponse, "description": "Invalid rule data"},
        500: {"model": ErrorResponse, "description": _DESC_SERVER_500},
    }
)
async def create_xp_rule_endpoint(game_id: str, rule_data: dict, admin_username: Annotated[str, Depends(verify_token_from_cookie)]):
    """
    Create a new XP calculation rule for a game.
    
    - **game_id**: The unique identifier of the game
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
        game = get_game_by_id(game_id)
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with ID '{game_id}' not found"
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
            game_id=game_id,
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
    "/{game_id}/xp-rules/{rule_id}",
    responses={
        404: {"model": ErrorResponse, "description": _DESC_RULE_404},
        500: {"model": ErrorResponse, "description": _DESC_SERVER_500},
    }
)
async def get_xp_rule_endpoint(game_id: str, rule_id: str):
    """
    Get a specific XP rule by ID.
    
    - **game_id**: The unique identifier of the game
    - **rule_id**: The unique identifier of the XP rule
    """
    try:
        rule = get_xp_rule_by_id(rule_id)
        
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{rule_id}' not found"
            )
        
        # Verify rule belongs to this game
        if rule['game_id'] != game_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{rule_id}' does not belong to game '{game_id}'"
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
    "/{game_id}/xp-rules/{rule_id}",
    response_model=SuccessResponse,
    responses={
        401: {"model": ErrorResponse, "description": _DESC_ADMIN_401},
        404: {"model": ErrorResponse, "description": _DESC_RULE_404},
        500: {"model": ErrorResponse, "description": _DESC_SERVER_500},
    }
)
async def update_xp_rule_endpoint(game_id: str, rule_id: str, updates: dict, admin_username: Annotated[str, Depends(verify_token_from_cookie)]):
    """
    Update an existing XP rule.
    
    - **game_id**: The unique identifier of the game
    - **rule_id**: The unique identifier of the XP rule
    - **updates**: Fields to update (rule_name, rule_type, parameters, priority, is_active)
    """
    try:
        # Verify rule exists and belongs to game
        existing_rule = get_xp_rule_by_id(rule_id)
        if not existing_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{rule_id}' not found"
            )
        
        if existing_rule['game_id'] != game_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{rule_id}' does not belong to game '{game_id}'"
            )
        
        # Update rule
        updated_rule = update_xp_rule(rule_id, updates)
        
        return SuccessResponse(
            success=True,
            message=f"XP rule '{rule_id}' updated successfully",
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
    "/{game_id}/xp-rules/{rule_id}",
    response_model=SuccessResponse,
    responses={
        401: {"model": ErrorResponse, "description": _DESC_ADMIN_401},
        404: {"model": ErrorResponse, "description": _DESC_RULE_404},
        500: {"model": ErrorResponse, "description": _DESC_SERVER_500},
    }
)
async def delete_xp_rule_endpoint(game_id: str, rule_id: str, admin_username: Annotated[str, Depends(verify_token_from_cookie)]):
    """
    Delete an XP rule.
    
    - **game_id**: The unique identifier of the game
    - **rule_id**: The unique identifier of the XP rule
    """
    try:
        # Verify rule exists and belongs to game
        existing_rule = get_xp_rule_by_id(rule_id)
        if not existing_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{rule_id}' not found"
            )
        
        if existing_rule['game_id'] != game_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{rule_id}' does not belong to game '{game_id}'"
            )
        
        # Delete rule
        deleted = delete_xp_rule(rule_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete XP rule"
            )
        
        return SuccessResponse(
            success=True,
            message=f"XP rule '{rule_id}' deleted successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete XP rule: {str(e)}"
        )


@router.patch(
    "/{game_id}/xp-rules/{rule_id}/toggle",
    response_model=SuccessResponse,
    responses={
        401: {"model": ErrorResponse, "description": _DESC_ADMIN_401},
        404: {"model": ErrorResponse, "description": _DESC_RULE_404},
        500: {"model": ErrorResponse, "description": _DESC_SERVER_500},
    }
)
async def toggle_xp_rule_endpoint(game_id: str, rule_id: str, is_active: bool, admin_username: Annotated[str, Depends(verify_token_from_cookie)]):
    """
    Toggle an XP rule's active status.
    
    - **game_id**: The unique identifier of the game
    - **rule_id**: The unique identifier of the XP rule
    - **is_active**: New active status (true/false)
    """
    try:
        # Verify rule exists and belongs to game
        existing_rule = get_xp_rule_by_id(rule_id)
        if not existing_rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule with ID '{rule_id}' not found"
            )
        
        if existing_rule['game_id'] != game_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"XP rule '{rule_id}' does not belong to game '{game_id}'"
            )
        
        # Toggle rule
        updated_rule = toggle_xp_rule(rule_id, is_active)
        
        status_text = "activated" if is_active else "deactivated"
        
        return SuccessResponse(
            success=True,
            message=f"XP rule '{rule_id}' {status_text} successfully",
            data=updated_rule
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle XP rule: {str(e)}"
        )
