from io import BytesIO

import pytest
from docx import Document
from pydantic import ValidationError

from app.schemas.resume import ExtractedSkill, ResumeExtraction, WorkExperience
from app.utils.resume_ai import _validated_evidence
from app.utils.resume_parser import ResumeParseError, extract_resume_text


def test_docx_resume_text_is_extracted_in_order():
    buffer = BytesIO()
    document = Document()
    document.add_heading("Jane Engineer")
    document.add_paragraph("Python, FastAPI, PostgreSQL")
    document.add_paragraph("Software Engineer at Acme from 2020 to 2024 building production systems.")
    document.save(buffer)

    text = extract_resume_text(buffer.getvalue(), "resume.docx")

    assert text.index("Jane Engineer") < text.index("Python") < text.index("Acme")


def test_scanned_or_empty_resume_is_rejected():
    buffer = BytesIO()
    document = Document()
    document.add_paragraph("Too short")
    document.save(buffer)

    with pytest.raises(ResumeParseError, match="No usable text"):
        extract_resume_text(buffer.getvalue(), "resume.docx")


def test_items_without_matching_evidence_are_removed():
    extraction = ResumeExtraction(skills=[
        ExtractedSkill(name="Python", source_excerpt="Python"),
        ExtractedSkill(name="Kubernetes", source_excerpt="Kubernetes"),
    ])

    validated = _validated_evidence(extraction, "Experienced with Python and FastAPI")

    assert [skill.name for skill in validated.skills] == ["Python"]
    assert validated.warnings == ["Removed unsupported extraction: Kubernetes"]


def test_structured_dates_must_be_consistent():
    with pytest.raises(ValidationError):
        WorkExperience(company="Acme", title="Engineer", start_date="2024", end_date="2023")
