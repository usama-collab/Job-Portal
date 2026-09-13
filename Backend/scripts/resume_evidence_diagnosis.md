# Resume evidence rejection

Live reproduction used a synthetic DOCX through `extract_resume_text` followed
by the unchanged `extract_structured_resume` entry point, with
`gemini-3.1-flash-lite`. No personal resume was accessed; the screenshot alone
does not contain the original document or Gemini response.

The synthetic resume listed Python, FastAPI, Django, React, Next.js, PostgreSQL,
Redis, Celery, Docker, SQL, JavaScript, TypeScript, HTML, CSS, Tailwind CSS,
Shadcn UI, MySQL, SQL Server, SQLite, and Microsoft Visual Studio. It also
included an Example Labs job, Example University education, and Job Portal project.

Before the fix, Gemini returned all 20 skills and the three other entries with
`source_excerpt: null` after Pydantic parsing. Every entry was removed. The prompt
required excerpts, but the shared profile schema made `source_excerpt` optional
and nullable. The evidence condition failed before text comparison. Twenty
repeated warnings exhausted the warning limit, hiding the other three removals.

The provider schema now requires a non-null string excerpt for each nested item.
Shared application/profile schemas remain unchanged because evidence is cleared
after import. Missing or empty evidence is still rejected locally.

Repeating the same live synthetic extraction after the fix returned evidence for
all 23 entries; all 20 skills and the work, education, and project entry survived,
with no removal warnings. This also verified that required evidence does not
reintroduce Gemini's prior schema rejection.

Text matching previously handled only casing and whitespace. It now uses NFKC
Unicode normalization, removes selected invisible PDF artifacts and discretionary
line-wrap hyphens, and compares contiguous tokens across layout punctuation.
Meaningful punctuation in C++, C#, .NET, and Next.js is retained. There is no
fuzzy matching, token reordering, substring matching within words, or fallback
that accepts missing evidence. The excerpt must also contain the item's name,
institution, or both company and job title, preventing unrelated quotes from
justifying a fabricated identity. This remains a textual evidence check, not a
general semantic verifier of every possible claim.

Omissions produce one count-based warning; logs contain only reason counts
(missing, unmatched, unrelated). The UI deduplicates warnings, collapses legacy
cached removal messages, and puts additional notes behind a disclosure.

Regression coverage includes actual PDF/DOCX parser output, the mocked SDK
analysis path, Unicode and PDF layout artifacts, missing and unrelated evidence,
technical-name distinctions, provider-required excerpts, retained strict Pydantic
validation, and warning rendering. Cached analyses must be analyzed again to
recover previously discarded items.
