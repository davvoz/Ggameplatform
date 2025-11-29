from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas import (
    GameStatusCreate,
    GameStatusResponse,
    GameStatusUpdate,
    SuccessResponse,
    ErrorResponse
)
from app.database import (
    create_game_status,
    get_all_game_statuses,
    get_game_status_by_id,
    get_game_status_by_code,
    update_game_status,
    delete_game_status,
    get_active_game_statuses
)

router = APIRouter()


@router.post(
    "/",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": ErrorResponse, "description": "Status code already exists"},
        400: {"model": ErrorResponse, "description": "Invalid status data"}
    }
)
async def create_status(status_data: GameStatusCreate):
    """
    Create a new game status.
    
    - **status_name**: Display name of the status (e.g., "Sviluppato")
    - **status_code**: Unique code for the status (e.g., "developed")
    - **description**: Optional description
    - **display_order**: Order for sorting (default: 0)
    - **is_active**: Whether this status is active (default: True)
    """
    try:
        created_status = create_game_status(status_data.dict())
        
        return SuccessResponse(
            success=True,
            message=f"Game status '{status_data.status_name}' created successfully",
            data=created_status
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create game status: {str(e)}"
        )


@router.get(
    "/",
    response_model=List[GameStatusResponse],
    responses={
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def list_statuses(active_only: bool = False):
    """
    List all game statuses.
    
    Optional filters:
    - **active_only**: If True, only return active statuses
    """
    try:
        if active_only:
            statuses = get_active_game_statuses()
        else:
            statuses = get_all_game_statuses()
        
        return [GameStatusResponse(**s) for s in statuses]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve game statuses: {str(e)}"
        )


@router.get(
    "/{status_id}",
    response_model=GameStatusResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Status not found"},
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def get_status(status_id: int):
    """
    Get a specific game status by ID.
    
    - **status_id**: The ID of the status to retrieve
    """
    try:
        status = get_game_status_by_id(status_id)
        
        if not status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game status with ID {status_id} not found"
            )
        
        return GameStatusResponse(**status)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve game status: {str(e)}"
        )


@router.get(
    "/code/{status_code}",
    response_model=GameStatusResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Status not found"},
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def get_status_by_code(status_code: str):
    """
    Get a specific game status by code.
    
    - **status_code**: The code of the status to retrieve (e.g., "developed")
    """
    try:
        status = get_game_status_by_code(status_code)
        
        if not status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game status with code '{status_code}' not found"
            )
        
        return GameStatusResponse(**status)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve game status: {str(e)}"
        )


@router.put(
    "/{status_id}",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Status not found"},
        409: {"model": ErrorResponse, "description": "Status code conflict"},
        400: {"model": ErrorResponse, "description": "Invalid update data"}
    }
)
async def update_status(status_id: int, status_data: GameStatusUpdate):
    """
    Update an existing game status.
    
    - **status_id**: The ID of the status to update
    - All fields are optional
    """
    try:
        # Filter out None values
        update_dict = {k: v for k, v in status_data.dict().items() if v is not None}
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        updated_status = update_game_status(status_id, update_dict)
        
        if not updated_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game status with ID {status_id} not found"
            )
        
        return SuccessResponse(
            success=True,
            message=f"Game status updated successfully",
            data=updated_status
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update game status: {str(e)}"
        )


@router.delete(
    "/{status_id}",
    response_model=SuccessResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Status not found"},
        400: {"model": ErrorResponse, "description": "Status in use by games"}
    }
)
async def delete_status(status_id: int):
    """
    Delete a game status.
    
    - **status_id**: The ID of the status to delete
    
    Note: Cannot delete a status that is being used by any games.
    """
    try:
        success = delete_game_status(status_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game status with ID {status_id} not found"
            )
        
        return SuccessResponse(
            success=True,
            message=f"Game status deleted successfully",
            data=None
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
            detail=f"Failed to delete game status: {str(e)}"
        )
