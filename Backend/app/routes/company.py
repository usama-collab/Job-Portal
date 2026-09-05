import mimetypes

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.crud import company as crud_company
from app.models.company import Company, CompanyMembership
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate
from app.utils.files import (
    StorageError,
    StorageNotConfigured,
    StorageObjectNotFound,
    delete_object,
    download_object,
    is_storage_key,
    save_logo_file,
)
from app.utils.functions import can_manage_company, get_current_user


router = APIRouter(prefix="/companies", tags=["Companies"])


def _company_response(company: Company, membership_role: str | None = None) -> Company:
    company.logo_url = f"/companies/{company.id}/logo" if is_storage_key(company.logo_path, "logos") else None
    company.membership_role = membership_role
    return company


@router.post("", response_model=CompanyOut, status_code=201)
def create_company(
    payload: CompanyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = crud_company.create_company(payload, current_user.id, db)
    return _company_response(company, "owner")


@router.get("/me", response_model=CompanyOut)
def get_my_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(CompanyMembership).filter(CompanyMembership.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="No company profile found")
    return _company_response(membership.company, membership.role)


@router.patch("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if not can_manage_company(current_user, company_id, db):
        raise HTTPException(status_code=403, detail="You are not authorized to update this company")
    updated = crud_company.update_company(company, payload, db)
    membership = db.query(CompanyMembership).filter(
        CompanyMembership.company_id == company_id,
        CompanyMembership.user_id == current_user.id,
    ).first()
    return _company_response(updated, membership.role if membership else None)


@router.post("/{company_id}/logo", response_model=CompanyOut)
async def upload_company_logo(
    company_id: int,
    logo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if not can_manage_company(current_user, company_id, db):
        raise HTTPException(status_code=403, detail="You are not authorized to update this company")

    old_path = company.logo_path
    saved_path = None
    try:
        saved_path, original_name = await save_logo_file(logo)
        company.logo_path = saved_path
        company.logo_filename = original_name
        db.commit()
        db.refresh(company)
    except Exception:
        db.rollback()
        if saved_path:
            try:
                await delete_object(saved_path)
            except StorageError:
                pass
        raise

    if is_storage_key(old_path, "logos") and old_path != saved_path:
        try:
            await delete_object(old_path)
        except StorageError:
            pass
    membership = db.query(CompanyMembership).filter(
        CompanyMembership.company_id == company_id,
        CompanyMembership.user_id == current_user.id,
    ).first()
    return _company_response(company, membership.role if membership else None)


@router.get("/{company_id}/logo", response_class=Response)
async def get_company_logo(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not is_storage_key(company.logo_path, "logos"):
        raise HTTPException(status_code=404, detail="Asset not found")
    try:
        content, stored_content_type = await download_object(company.logo_path)
    except StorageObjectNotFound as exc:
        raise HTTPException(status_code=404, detail="Asset not found") from exc
    except StorageNotConfigured as exc:
        raise HTTPException(status_code=503, detail="File storage is not configured") from exc
    except StorageError as exc:
        raise HTTPException(status_code=502, detail="File storage is unavailable") from exc
    media_type = stored_content_type or mimetypes.guess_type(company.logo_filename or "")[0]
    return Response(content=content, media_type=media_type or "application/octet-stream")
