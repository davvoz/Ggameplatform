from fastapi import APIRouter, HTTPException, status
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
    increment_play_count
)
from app.models import Game

router = APIRouter()

@router.post(
    "/register",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": ErrorResponse, "description": "Game already exists"},
        400: {"model": ErrorResponse, "description": "Invalid game data"}
    }
)
async def register_game(game_data: GameRegister):
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
                thumbnail=game['thumbnail'],
                entry_point=game['entry_point'],
                category=game['category'],
                tags=game['tags'],
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
    Increment the play count for a game.
    
    - **gameId**: The unique identifier of the game
    """
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
