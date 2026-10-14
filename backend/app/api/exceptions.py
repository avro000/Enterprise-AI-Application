"""Exceptions API Routes."""

import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import require_authenticated, require_manager_or_admin
from app.models.customer import Customer
from app.models.exception_action import ExceptionAction
from app.models.exception_case import ExceptionCase
from app.models.order import Order
from app.models.user import User
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.exception import (
    ActionApproveRequest,
    ActionRejectRequest,
    BatchActionApproveRequest,
    ExceptionActionResponse,
    ExceptionAssignRequest,
    ExceptionCaseResponse,
    InvestigationResponse,
    PendingActionItemResponse,
)
from app.services.exception_detector import ExceptionDetectorService
from app.services.investigation_service import InvestigationService

logger = logging.getLogger("api_exceptions")

router = APIRouter(prefix="/exceptions", tags=["Exceptions"])


@router.get("", response_model=PaginatedResponse[ExceptionCaseResponse])
async def list_exceptions(
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Lists operational exception cases with filtering by status and severity."""
    stmt = (
        select(ExceptionCase)
        .options(
            selectinload(ExceptionCase.actions).selectinload(ExceptionAction.approver),
            selectinload(ExceptionCase.resolver),
            selectinload(ExceptionCase.assignee),
        )
    )
    count_stmt = select(func.count(ExceptionCase.id))

    if status:
        stmt = stmt.where(ExceptionCase.status == status)
        count_stmt = count_stmt.where(ExceptionCase.status == status)
    if severity:
        stmt = stmt.where(ExceptionCase.severity == severity)
        count_stmt = count_stmt.where(ExceptionCase.severity == severity)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(ExceptionCase.detected_at.desc()).offset(offset).limit(limit)
    items = (await db.execute(stmt)).scalars().all()

    return PaginatedResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/detect", response_model=MessageResponse)
async def trigger_detection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Manually triggers the exception detection scan across pending orders."""
    new_cases = await ExceptionDetectorService.detect_exceptions(db)
    return MessageResponse(message=f"Detection run complete. Created {len(new_cases)} new exception cases.")


@router.get("/actions/pending", response_model=List[PendingActionItemResponse])
async def list_pending_actions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Module E Action Center: Lists all pending operational actions staged for human governance review."""
    stmt = (
        select(ExceptionAction, ExceptionCase, Customer, Order)
        .join(ExceptionCase, ExceptionAction.exception_id == ExceptionCase.id)
        .outerjoin(Customer, ExceptionCase.related_customer_id == Customer.id)
        .outerjoin(Order, ExceptionCase.related_order_id == Order.id)
        .where(ExceptionAction.status == "pending", ExceptionAction.requires_approval.is_(True))
        .order_by(ExceptionAction.created_at.desc())
    )
    results = (await db.execute(stmt)).all()

    items = []
    for action, case, cust, ord_obj in results:
        items.append(
            PendingActionItemResponse(
                id=action.id,
                exception_id=action.exception_id,
                case_number=case.case_number,
                severity=case.severity,
                customer_name=cust.company_name if cust else None,
                order_number=ord_obj.order_number if ord_obj else None,
                action_type=action.action_type,
                description=action.description,
                requires_approval=action.requires_approval,
                status=action.status,
                created_at=action.created_at,
            )
        )
    return items


@router.post("/actions/batch-approve", response_model=List[ExceptionActionResponse])
async def batch_approve_actions(
    request: BatchActionApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Module E Action Center: Bulk approves multiple pending actions across cases."""
    try:
        approved = await InvestigationService.batch_approve_actions(
            db=db,
            action_ids=request.action_ids,
            user_id=current_user.id,
            comment=request.comment,
        )
        return approved
    except Exception as e:
        logger.error(f"Batch approval error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Batch approval failed")


@router.get("/{exception_id}", response_model=ExceptionCaseResponse)
async def get_exception(
    exception_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Retrieves full details, evidence, and actions for a single exception case."""
    stmt = (
        select(ExceptionCase)
        .options(
            selectinload(ExceptionCase.actions).selectinload(ExceptionAction.approver),
            selectinload(ExceptionCase.resolver),
            selectinload(ExceptionCase.assignee),
        )
        .where(ExceptionCase.id == exception_id)
    )
    case = (await db.execute(stmt)).scalars().first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception case not found")
    return case


@router.post("/{exception_id}/assign", response_model=ExceptionCaseResponse)
async def assign_exception(
    exception_id: UUID,
    request: ExceptionAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Module B AI Exception Manager: Assigns case ownership to a designated operator/manager."""
    try:
        case = await InvestigationService.assign_exception_owner(
            db=db,
            exception_id=exception_id,
            assigned_user_id=request.user_id,
            assigning_user_id=current_user.id,
        )
        return case
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Assignment error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Assignment failed")


@router.post("/{exception_id}/investigate", response_model=InvestigationResponse)
async def trigger_investigation(
    exception_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Triggers automated context fusion investigation over the exception."""
    try:
        case = await InvestigationService.investigate_case(db, exception_id)
        auto_count = sum(1 for a in case.actions if a.status == "executed")
        pending_count = sum(1 for a in case.actions if a.status == "pending")

        return InvestigationResponse(
            status=case.status,
            message="Investigation completed successfully",
            case_number=case.case_number,
            confidence_score=case.confidence_score,
            investigation_steps=case.investigation_steps,
            actions_count=len(case.actions),
            auto_executed_count=auto_count,
            pending_approval_count=pending_count,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Investigation error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Investigation failed")


@router.post("/{exception_id}/actions/approve-all", response_model=List[ExceptionActionResponse])
async def approve_all_actions(
    exception_id: UUID,
    request: ActionApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Module E Action Center: Single-click approval for all pending actions on an exception case."""
    try:
        approved = await InvestigationService.approve_all_actions_for_case(
            db=db,
            exception_id=exception_id,
            user_id=current_user.id,
            comment=request.comment,
        )
        return approved
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Approve all error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Action approval failed")


@router.post("/{exception_id}/actions/{action_id}/approve", response_model=ExceptionActionResponse)
async def approve_action(
    exception_id: UUID,
    action_id: UUID,
    request: ActionApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Approves a recommended action and executes simulated resolution."""
    try:
        action = await InvestigationService.approve_action(
            db=db,
            exception_id=exception_id,
            action_id=action_id,
            user_id=current_user.id,
            comment=request.comment,
        )
        return action
    except ValueError as e:
        status_code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Approval error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Action approval failed")


@router.post("/{exception_id}/actions/{action_id}/reject", response_model=ExceptionActionResponse)
async def reject_action(
    exception_id: UUID,
    action_id: UUID,
    request: ActionRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Rejects a recommended action with justification."""
    try:
        action = await InvestigationService.reject_action(
            db=db,
            exception_id=exception_id,
            action_id=action_id,
            user_id=current_user.id,
            reason=request.reason,
        )
        return action
    except ValueError as e:
        status_code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Rejection error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Action rejection failed")


@router.post("/{exception_id}/resolve", response_model=ExceptionCaseResponse)
async def resolve_exception(
    exception_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Marks an operational exception case as resolved."""
    try:
        case = await InvestigationService.resolve_exception(
            db=db,
            exception_id=exception_id,
            user_id=current_user.id,
        )
        # Reload with actions
        stmt = (
            select(ExceptionCase)
            .options(selectinload(ExceptionCase.actions))
            .where(ExceptionCase.id == case.id)
        )
        case = (await db.execute(stmt)).scalars().first()
        return case
    except ValueError as e:
        status_code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Resolution error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Case resolution failed")

