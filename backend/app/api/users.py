"""User and Role Management API Endpoints."""

import logging
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.auth import UpdateUserRoleRequest, UserResponse

logger = logging.getLogger("api_users")

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all accounts in the workspace with their roles (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: admin access required to view workspace users.",
        )

    stmt = select(User).order_by(User.created_at.asc())
    result = await db.execute(stmt)
    users = result.scalars().all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details for a single workspace user."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: admin access required.",
        )

    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    request: UpdateUserRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change a workspace user's role and persist to the database (admin only, cannot change self)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: only administrators can change user roles.",
        )

    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    target_user = result.scalars().first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if target_user.id == current_user.id or str(target_user.email).lower() == str(current_user.email).lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role.",
        )

    old_role = target_user.role
    new_role = request.role.lower()

    if old_role == new_role:
        return target_user

    target_user.role = new_role

    # Record in audit log
    audit_entry = AuditLog(
        event_type="user_role_updated",
        actor_type="user",
        actor_id=current_user.id,
        entity_type="user",
        entity_id=target_user.id,
        details={
            "target_user_email": target_user.email,
            "target_user_name": target_user.name,
            "previous_role": old_role,
            "new_role": new_role,
            "updated_by": current_user.email,
        },
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(target_user)

    logger.info(
        f"User role updated for {target_user.email}: {old_role} -> {new_role} by {current_user.email}"
    )

    return target_user
