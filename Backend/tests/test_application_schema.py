import pytest
from pydantic import ValidationError

from app.schemas.application import ApplicationCreate


def application_data(**overrides):
    data = {
        "full_name": "Test Candidate",
        "email": "candidate@example.com",
        "phone": "+1 555 123 4567",
        "city": "Lahore",
        "salary_currency": "USD",
        "notice_period": "immediate",
        "university_name": "Test University",
        "degree": "Bachelor of Science",
        "graduation_year": 2024,
        "cover_letter": "A sufficiently detailed cover letter.",
    }
    data.update(overrides)
    return data


def test_professional_links_are_optional():
    application = ApplicationCreate(**application_data())

    assert application.github_url is None
    assert application.website_url is None


def test_professional_links_are_trimmed_and_validated():
    application = ApplicationCreate(
        **application_data(
            github_url="  https://github.com/test-candidate  ",
            website_url="https://portfolio.example.com/work",
        )
    )

    assert application.github_url == "https://github.com/test-candidate"
    assert application.website_url == "https://portfolio.example.com/work"


@pytest.mark.parametrize("field", ["github_url", "website_url"])
def test_professional_links_reject_non_http_urls(field):
    with pytest.raises(ValidationError):
        ApplicationCreate(**application_data(**{field: "javascript:alert(1)"}))
