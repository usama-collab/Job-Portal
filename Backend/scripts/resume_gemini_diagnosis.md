# Gemini resume schema diagnosis

Reproduced locally on 2026-09-13 with installed `google-genai==1.55.0`,
`gemini-3.1-flash-lite`, the Gemini Developer API, and only this synthetic input:

> Alex Example. Skills: Python. Project: Demo, https://example.com.

## Root cause

The failing argument is `generationConfig.responseJsonSchema`: the large
`maxItems` bounds in the resume schema cause HTTP 400 `INVALID_ARGUMENT`.
Starting with the successful full schema without array bounds, restoring **any
one** of these constraints independently reproduces the same error:

- `properties.skills.maxItems = 100`
- `properties.work_experience.maxItems = 30`
- `properties.projects.maxItems = 30`

Removing just one bound from the original schema is insufficient because other
independently failing bounds remain. Removing all `maxItems` makes it succeed.
This is consistent with Gemini's documented schema complexity limitation;
the server returns no detailed explanation of its internal threshold.
`maxItems` is a supported keyword, not universally invalid.

## Live isolation results

| Request / change | Result |
| --- | --- |
| Minimal request, no generation settings | OK |
| Simple object schema + JSON MIME type | OK |
| Add application system instruction | OK |
| Add `max_output_tokens=6000` | OK |
| Raw Pydantic resume schema | 400 |
| Original provider schema (already omits defaults and URI format) | 400 |
| Remove only `minLength`, only `maxLength`, or only `pattern` | 400 each |
| Remove all three string constraints | 400 |
| Inline `$ref` definitions | 400 |
| Remove `additionalProperties` or `required` | 400 each |
| Remove all `maxItems`, retaining refs, nesting, nulls, and string constraints | OK |
| Restore only skills / work experience / projects bound | 400 each |
| Restore only education bound of 20 | OK |
| Isolated simple string with `format: uri`, `minLength: 1`, `maxLength: 200`, or date `pattern` | OK each |

The final fixed-schema response also passed `ResumeExtraction.model_validate_json`.
A larger exploratory matrix reached the per-minute free-tier quota (429);
those cases were not counted as schema failures. The final verification above
completed without quota errors.

## Documentation and serialized schema comparison

The [official SDK](https://github.com/googleapis/python-genai/blob/main/google/genai/types.py)
documents `response_json_schema` with `response_mime_type`, omitting
`response_schema`. The [SDK examples](https://github.com/googleapis/python-genai/blob/main/README.md)
use this exact `models.generate_content` configuration. The installed SDK sends
the dictionary as `generationConfig.responseJsonSchema` without filtering it.
The transport regression test inspects the real SDK's serialized request and
asserts that no mutually exclusive schema field or other generation setting is sent.

| Schema feature | Documented subset / observation |
| --- | --- |
| `format` | Supported keyword, but formats are not unrestricted. `uri` succeeds in the isolated live probe; the existing adapter already omitted it. It is not the cause here. |
| `minLength`, `maxLength`, `pattern` | Absent from the SDK's supported-keyword list. Accepted in these live requests; acceptance does not prove enforcement. They remain unchanged by this fix. |
| `$defs`, `$ref` | Supported; references have no non-reference siblings in this schema. Removing bounds succeeds with refs intact. |
| Nullable fields | `anyOf` with a `null` branch succeeds in the fixed schema. |
| Nested models | All four nested model definitions remain intact and succeed. |
| `additionalProperties: false`, `required` | Supported and retained, including nested objects. |
| `maxItems` | Supported in principle, but the bounds above independently trigger rejection in this schema. Omitted only from the provider schema. |
| `default` | Not in the supported-keyword list; already omitted before this fix. |

The [structured-output guide](https://ai.google.dev/gemini-api/docs/structured-output)
documents complexity limits and recommends application-side validation.

## Fix and regression coverage

The provider adapter recursively omits `maxItems`, retaining the existing default
and URI-format handling. Traversal distinguishes schema nodes from property-name
maps so names such as `title` are preserved. The model, SDK version, prompt,
token budget, and application schemas are unchanged.

Every response still goes through the original Pydantic model. Tests reject
over-limit lists in all five top-level sections and nested technologies, invalid
URLs, overlong URLs/text/evidence, empty required text, invalid date patterns,
inconsistent dates, and unexpected nested fields.

Run offline tests from `Backend`:

```sh
myenv/bin/python -m pytest tests/test_resume_ai.py tests/test_resume_parsing.py -q
```

Run the opt-in live reproducer (uses configured credentials and API quota):

```sh
myenv/bin/python scripts/probe_resume_gemini.py
```

Additional matrices: `--constraints`, `--structure`, or `--bounds`. The script
prints status and synthetic-probe errors, never credentials or generated text,
and stops if quota is exhausted.
