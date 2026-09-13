"""Opt-in live schema diagnostic; sends only the synthetic resume below.

Run from Backend: myenv/bin/python scripts/probe_resume_gemini.py
Use --structure or --bounds for larger diagnostic matrices (quota permitting).
Uses the application's configured key, never prints credentials or response text.
"""
import asyncio
from copy import deepcopy
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from google import genai
from google.genai import errors, types

from app.core.config import settings
from app.schemas.resume import ResumeExtraction
from app.utils.resume_ai import AIResumeExtraction, INSTRUCTIONS

SYNTHETIC = "Alex Example. Skills: Python. Project: Demo, https://example.com."


def without(schema, *keys):
    schema = deepcopy(schema)
    def walk(node):
        if isinstance(node, dict):
            for key in keys:
                node.pop(key, None)
            for key, child in node.items():
                if key in ("properties", "$defs"):
                    for subschema in child.values():
                        walk(subschema)
                else:
                    walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)
    walk(schema)
    return schema


async def main():
    print(f"SDK={genai.__version__} model=gemini-3.1-flash-lite", flush=True)
    raw = ResumeExtraction.model_json_schema()
    fixed = AIResumeExtraction.model_json_schema()
    # Preserve the pre-fix wire schema so this remains a regression reproducer.
    wire = without(raw, "default")
    wire["$defs"]["Project"]["properties"]["url"]["anyOf"][0].pop("format")
    base = {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}
    cases = [("minimal", None), ("simple_schema", base), ("raw_pydantic", raw), ("original_wire", wire)]
    for keyword in ("minLength", "maxLength", "pattern", "format", "default"):
        cases.append((f"wire_without_{keyword}", without(wire, keyword)))
    cases.append(("wire_without_string_constraints", without(wire, "minLength", "maxLength", "pattern")))
    for key, value in (("format", "uri"), ("minLength", 1), ("maxLength", 200), ("pattern", r"^\d{4}(?:-(?:0[1-9]|1[0-2]))?$")):
        schema = deepcopy(base)
        schema["properties"]["name"][key] = value
        cases.append((f"isolated_{key}", schema))
    if "--structure" in sys.argv:
        cases = []
        for keyword in ("maxItems", "additionalProperties", "title", "required"):
            cases.append((f"wire_without_{keyword}", without(wire, keyword)))
        for section, prop in wire["properties"].items():
            cases.append((f"section_{section}", {"type": "object", "$defs": wire["$defs"], "properties": {section: prop}}))
        def inline(node):
            if isinstance(node, dict):
                if "$ref" in node:
                    return inline(wire["$defs"][node["$ref"].split("/")[-1]])
                return {k: inline(v) for k, v in node.items() if k != "$defs"}
            if isinstance(node, list):
                return [inline(v) for v in node]
            return node
        cases.append(("wire_inlined_refs", inline(wire)))
    if "--bounds" in sys.argv:
        cases = []
        paths = [("properties", name, "maxItems") for name in wire["properties"]]
        paths.append(("$defs", "Project", "properties", "technologies", "maxItems"))
        def parent(schema, path):
            for part in path[:-1]:
                schema = schema[part]
            return schema
        for path in paths:
            label = ".".join(path)
            schema = deepcopy(wire)
            del parent(schema, path)[path[-1]]
            cases.append((f"remove_{label}", schema))
            schema = without(wire, "maxItems")
            parent(schema, path)[path[-1]] = parent(wire, path)[path[-1]]
            cases.append((f"only_{label}", schema))
        for bound in (1, 5, 10, 20):
            schema = deepcopy(wire)
            for path in paths:
                parent(schema, path)[path[-1]] = bound
            cases.append((f"all_bounds_{bound}", schema))
    if not any(flag in sys.argv for flag in ("--structure", "--bounds", "--constraints")):
        cases = [("minimal", None), ("simple_schema", base), ("simple_with_instructions", base),
                 ("simple_full_config", base), ("original_wire", wire), ("fixed_wire", fixed)]
        for section in ("skills", "work_experience", "projects"):
            schema = deepcopy(fixed)
            schema["properties"][section]["maxItems"] = wire["properties"][section]["maxItems"]
            cases.append((f"restore_{section}_maxItems", schema))
    async with genai.Client(
        api_key=settings.GEMINI_API_KEY.strip(), vertexai=False,
        http_options=types.HttpOptions(timeout=40000, retry_options=types.HttpRetryOptions(attempts=1)),
    ).aio as client:
        for label, schema in cases:
            config = {} if schema is None else {"response_mime_type": "application/json", "response_json_schema": schema}
            # All schema cases use exactly the same prompt and generation settings.
            if label not in ("minimal", "simple_schema"):
                config.update(system_instruction=INSTRUCTIONS)
            if label not in ("minimal", "simple_schema", "simple_with_instructions"):
                config.update(max_output_tokens=6000)
            try:
                response = await client.models.generate_content(model="gemini-3.1-flash-lite", contents=SYNTHETIC, config=types.GenerateContentConfig(**config))
                print(json.dumps({"case": label, "status": "OK", "finish_reason": str(response.candidates[0].finish_reason)}), flush=True)
                if label == "fixed_wire":
                    ResumeExtraction.model_validate_json(response.text)
                    print("fixed_wire: application validation passed", flush=True)
            except errors.APIError as exc:
                print(json.dumps({"case": label, "status": exc.code, "message": exc.message}), flush=True)
                if exc.code == 429:
                    raise SystemExit("Quota reached; retry this diagnostic later.") from None
            except Exception as exc:
                print(json.dumps({"case": label, "transport_error": type(exc).__name__}), flush=True)
                raise SystemExit(1) from None


if __name__ == "__main__":
    asyncio.run(main())
