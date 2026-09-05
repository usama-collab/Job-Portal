import pytest
from pydantic import ValidationError

from app.schemas.job import JobCreate, JobUpdate


@pytest.mark.parametrize("schema", [JobCreate, JobUpdate])
def test_formatting_round_trip(schema):
    html = '<h2>Role Overview</h2><p><strong>Build</strong> <em>great</em> products.</p><h3>Requirements</h3><ul><li><p>Python</p></li></ul><ol><li><p>Apply</p></li></ol>'
    assert schema(title="Engineer", description=html).description == html


@pytest.mark.parametrize("schema", [JobCreate, JobUpdate])
def test_strips_executable_content_and_attributes(schema):
    html = '<h2 onclick="alert(1)">Role</h2><script>alert(1)</script><p style="color:red">Build<img src=x onerror="alert(1)"><a href="javascript:alert(1)"> products</a></p><svg><script>alert(1)</script></svg>'
    assert schema(title="Engineer", description=html).description == '<h2>Role</h2><p>Build products</p>'


@pytest.mark.parametrize("value", ["", "  ", "<p><br></p>", "<p>&nbsp;</p>", "<script>alert(1)</script>"])
@pytest.mark.parametrize("schema", [JobCreate, JobUpdate])
def test_rejects_empty_description(schema, value):
    with pytest.raises(ValidationError):
        schema(title="Engineer", description=value)


def test_legacy_text_and_partial_update():
    value = 'Build products\nExperience: 2 < 5 years & teamwork'
    assert JobCreate(title="Engineer", description=value).description == value
    assert JobUpdate(title="Updated").model_dump(exclude_none=True) == {"title": "Updated"}
    assert JobUpdate(description=None).description is None
