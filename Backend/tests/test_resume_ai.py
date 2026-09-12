import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import HTTPException
from google.genai import errors, types

from app.utils import resume_ai


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(resume_ai.settings, "RESUME_AI_ENABLED", True)
    monkeypatch.setattr(resume_ai.settings, "GEMINI_API_KEY", "AIza-test-secret")
    monkeypatch.setattr(resume_ai.settings, "RESUME_AI_MODEL", "gemini-3.1-flash-lite")
    mock = AsyncMock()
    mock.__aenter__.return_value = mock
    monkeypatch.setattr(resume_ai.genai, "Client", Mock(return_value=SimpleNamespace(aio=mock)))
    return mock


def response(payload, reason="STOP"):
    return types.GenerateContentResponse(
        response_id="response_test",
        candidates=[types.Candidate(finish_reason=reason, content=types.Content(parts=[types.Part(text=payload)]))],
    )


@pytest.mark.parametrize("upstream,expected", [(400, 502), (401, 502), (403, 502), (404, 502), (429, 429), (500, 502), (504, 504)])
def test_upstream_errors_log_diagnostics_without_secrets(client, caplog, upstream, expected):
    http_response = httpx.Response(upstream, headers={"x-request-id": "req_test"})
    body = {"error": {"code": upstream, "status": "INVALID_ARGUMENT", "message": "Invalid schema; AIza-test-secret PrivateCandidate"}}
    client.models.generate_content.side_effect = errors.APIError(upstream, body, http_response)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(resume_ai.extract_structured_resume("PrivateCandidate"))
    assert caught.value.status_code == expected
    assert f"status={upstream}" in caplog.text
    assert "request_id=req_test" in caplog.text
    assert "Invalid schema" in caplog.text
    for secret in ("AIza-test-secret", "PrivateCandidate"):
        assert secret not in caplog.text
        assert secret not in caught.value.detail
    client.__aexit__.assert_awaited_once()


@pytest.mark.parametrize("error,expected", [(httpx.ReadTimeout, 504), (httpx.ConnectError, 502)])
def test_transport_errors(client, caplog, error, expected):
    client.models.generate_content.side_effect = error("private transport body")
    with pytest.raises(HTTPException) as caught:
        asyncio.run(resume_ai.extract_structured_resume("PrivateCandidate"))
    assert caught.value.status_code == expected
    assert error.__name__ in caplog.text
    assert "private transport body" not in caplog.text


@pytest.mark.parametrize("reason", ["MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"])
def test_incomplete_or_refused_response(client, caplog, reason):
    client.models.generate_content.return_value = response("PrivateCandidate", reason)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(resume_ai.extract_structured_resume("PrivateCandidate"))
    assert caught.value.status_code == 422
    assert "response_test" in caplog.text
    assert reason in caplog.text
    assert "PrivateCandidate" not in caplog.text


def test_prompt_blocked(client, caplog):
    client.models.generate_content.return_value = types.GenerateContentResponse(
        prompt_feedback=types.GenerateContentResponsePromptFeedback(block_reason="SAFETY"),
    )
    with pytest.raises(HTTPException) as caught:
        asyncio.run(resume_ai.extract_structured_resume("PrivateCandidate"))
    assert caught.value.status_code == 422
    assert "SAFETY" in caplog.text


def test_success_request_configuration_and_evidence(client):
    client.models.generate_content.return_value = response(json.dumps({
        "skills": [{"name": "Python", "source_excerpt": "Python"}, {"name": "Go", "source_excerpt": "Go"}],
    }))
    result = asyncio.run(resume_ai.extract_structured_resume("Python candidate@example.com"))
    assert [item.name for item in result.skills] == ["Python"]
    assert result.warnings == ["Removed unsupported extraction: Go"]
    kwargs = client.models.generate_content.call_args.kwargs
    assert kwargs["model"] == "gemini-3.1-flash-lite"
    assert kwargs["config"].response_json_schema == resume_ai.AIResumeExtraction.model_json_schema()
    assert kwargs["config"].response_mime_type == "application/json"
    assert kwargs["config"].system_instruction == resume_ai.INSTRUCTIONS
    assert "candidate@example.com" not in kwargs["contents"]
    options = resume_ai.genai.Client.call_args.kwargs
    assert options["vertexai"] is False
    assert options["http_options"].timeout == 40_000
    assert options["http_options"].retry_options.attempts == 1


@pytest.mark.parametrize("payload", ["private-output", '{"projects":[{"name":"PrivateCandidate","url":"private-output"}]}', '{"work_experience":[{"company":"Acme","title":"Engineer","start_date":"2024","end_date":"2020"}]}'])
def test_invalid_model_output_never_logs_validation_inputs(client, caplog, payload):
    client.models.generate_content.return_value = response(payload)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(resume_ai.extract_structured_resume("PrivateCandidate"))
    assert caught.value.status_code == 422
    assert "ValidationError" in caplog.text
    assert "private-output" not in caplog.text
    assert "PrivateCandidate" not in caplog.text


@pytest.mark.parametrize("enabled,key", [(False, "AIza-test"), (True, None), (True, "   ")])
def test_configuration_errors(client, monkeypatch, enabled, key):
    monkeypatch.setattr(resume_ai.settings, "RESUME_AI_ENABLED", enabled)
    monkeypatch.setattr(resume_ai.settings, "GEMINI_API_KEY", key)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(resume_ai.extract_structured_resume("PrivateCandidate"))
    assert caught.value.status_code == 503
    client.models.generate_content.assert_not_awaited()


def test_real_sdk_serializes_schema_and_parses_response(monkeypatch):
    original_client = resume_ai.genai.Client
    monkeypatch.setattr(resume_ai.settings, "RESUME_AI_ENABLED", True)
    monkeypatch.setattr(resume_ai.settings, "GEMINI_API_KEY", "AIza-test-secret")
    monkeypatch.setattr(resume_ai.settings, "RESUME_AI_MODEL", "gemini-3.1-flash-lite")
    requests = []

    def handle(request):
        requests.append(request)
        body = json.loads(request.content)
        assert request.url.path.endswith("models/gemini-3.1-flash-lite:generateContent")
        assert body["generationConfig"]["responseMimeType"] == "application/json"
        schema = body["generationConfig"]["responseJsonSchema"]
        assert schema["additionalProperties"] is False
        assert "projects" in schema["properties"]
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "{}"}]}}],
        })

    def factory(**kwargs):
        kwargs["http_options"].httpx_async_client = httpx.AsyncClient(transport=httpx.MockTransport(handle))
        return original_client(**kwargs)

    monkeypatch.setattr(resume_ai.genai, "Client", factory)
    assert asyncio.run(resume_ai.extract_structured_resume("Synthetic resume")).skills == []
    assert len(requests) == 1
