import pytest

from app.schemas.resume import ResumeExtraction
from app.utils.resume_ai import _validated_evidence


@pytest.mark.parametrize("source,excerpt", [
    ("Python\u00a0 • FASTAPI\nReact | PostgreSQL", "python, FastAPI; React, PostgreSQL"),
    ("Ｐｙｔｈｏｎ • FastAPI", "Python, FastAPI"),
    ("Postgre-\nSQL", "PostgreSQL"),
    ("Postgre\u00ad\nSQL", "PostgreSQL"),
    ("Fast\u200bAPI", "FastAPI"),
    ("Ofﬁce • Cafe\u0301", "Office, Café"),
    ("‘Python’ — React", '"Python", React'),
    ("C++ • C# • .NET • Next.js", "C++, C#, .NET, Next.js"),
])
def test_pdf_artifacts_do_not_discard_supported_evidence(source, excerpt):
    # Use the full passage as a skill to exercise exact ordered token matching.
    result = _validated_evidence(ResumeExtraction(skills=[{"name": excerpt, "source_excerpt": excerpt}]), source)
    assert len(result.skills) == 1
    assert result.warnings == []


@pytest.mark.parametrize("name,excerpt,source", [
    ("Python", None, "Python"),
    ("Python", "", "Python"),
    ("Python", " • — ", "Python"),
    ("Go", "Go", "Django MongoDB"),
    ("Java", "Java", "JavaScript"),
    ("C", "C", "C++ C#"),
    ("C++", "C++", "C C#"),
    ("Next.js", "Next.js", "Nextjs"),
    ("SQL", "SQL", "PostgreSQL MySQL"),
    ("Python", "Python", "Py thon"),
    ("Kubernetes", "Python", "Python"),
    ("Python", "Python React", "React Python"),
    ("Python", "Python React", "Python without React"),
])
def test_missing_fabricated_unrelated_or_substring_evidence_is_rejected(name, excerpt, source):
    result = _validated_evidence(ResumeExtraction(skills=[{"name": name, "source_excerpt": excerpt}]), source)
    assert result.skills == []
    assert len(result.warnings) == 1


def test_nested_items_need_matching_evidence_and_identity():
    source = "Example Labs — Software Engineer\nExample University | BS Computer Science\nJob Portal • React"
    result = _validated_evidence(ResumeExtraction(
        work_experience=[{"company": "Example Labs", "title": "Software Engineer", "source_excerpt": "Example Labs, Software Engineer"},
                         {"company": "Invented Labs", "title": "Software Engineer", "source_excerpt": "Example Labs, Software Engineer"}],
        education=[{"institution": "Example University", "source_excerpt": "Example University: BS Computer Science"}],
        projects=[{"name": "Job Portal", "source_excerpt": "Job Portal, React"}],
    ), source)
    assert len(result.work_experience) == len(result.education) == len(result.projects) == 1
    assert len(result.warnings) == 1


def test_omissions_are_counted_without_logging_resume_content(caplog):
    with caplog.at_level("INFO", logger="app.utils.resume_ai"):
        result = _validated_evidence(ResumeExtraction(skills=[{"name": f"PrivateSkill{i}"} for i in range(30)]), "Private resume")
    assert result.warnings == ["30 items were omitted because supporting resume text could not be verified."]
    assert "missing=30" in caplog.text
    assert "Private" not in caplog.text
