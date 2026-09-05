from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.company import Company, CompanyMembership
from app.schemas.company import CompanyCreate, CompanyUpdate


def create_company(payload: CompanyCreate, user_id: int, db: Session) -> Company:
    if db.query(CompanyMembership).filter(CompanyMembership.user_id == user_id).first():
        raise HTTPException(status_code=409, detail="You already belong to a company")

    company = Company(
        name=payload.name,
        website=str(payload.website) if payload.website else None,
        description=payload.description,
    )
    membership = CompanyMembership(company=company, user_id=user_id, role="owner")
    db.add_all((company, membership))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="You already belong to a company") from exc
    db.refresh(company)
    return company


def update_company(company: Company, payload: CompanyUpdate, db: Session) -> Company:
    data = payload.model_dump(exclude_unset=True)
    if "website" in data and data["website"] is not None:
        data["website"] = str(data["website"])
    for key, value in data.items():
        setattr(company, key, value)
    db.commit()
    db.refresh(company)
    return company
