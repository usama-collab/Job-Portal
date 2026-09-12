from __future__ import annotations

import io
import logging
import multiprocessing
import queue as queue_module
import resource
import zipfile
from pathlib import Path


MAX_PDF_PAGES = 10
MAX_TEXT_CHARS = 32_000
MAX_DOCX_ENTRIES = 1_000
MAX_DOCX_EXPANDED_BYTES = 32 * 1024 * 1024

logger = logging.getLogger(__name__)


class ResumeParseError(ValueError):
    pass


def _validate_docx_archive(content: bytes) -> None:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_DOCX_ENTRIES:
                raise ResumeParseError("The DOCX contains too many embedded files")
            if sum(entry.file_size for entry in entries) > MAX_DOCX_EXPANDED_BYTES:
                raise ResumeParseError("The DOCX expands beyond the supported limit")
            names = {entry.filename for entry in entries}
            if "word/document.xml" not in names:
                raise ResumeParseError("The file is not a valid DOCX document")
            if any(name.lower().endswith("vbaproject.bin") for name in names):
                raise ResumeParseError("Macro-enabled documents are not supported")
    except zipfile.BadZipFile as exc:
        raise ResumeParseError("The file is not a valid DOCX document") from exc


def _character_count(text: str) -> int:
    """Count meaningful characters without letting layout whitespace skew the result."""

    return sum(not character.isspace() for character in text)


def _extract_pdf(content: bytes) -> tuple[str, list[dict[str, int | str | bool]]]:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(content), strict=True)
        if reader.is_encrypted:
            raise ResumeParseError("Encrypted PDFs are not supported")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ResumeParseError(f"PDF resumes are limited to {MAX_PDF_PAGES} pages")
        pages = []
        page_stats: list[dict[str, int | str | bool]] = []
        for number, page in enumerate(reader.pages, 1):
            try:
                layout_text = page.extract_text(extraction_mode="layout") or ""
                layout_failed = False
            except Exception:
                layout_text = ""
                layout_failed = True
            try:
                plain_text = page.extract_text(extraction_mode="plain") or ""
                plain_failed = False
            except Exception:
                plain_text = ""
                plain_failed = True
            if layout_failed and plain_failed:
                raise ResumeParseError(f"Page {number} of the PDF could not be read")

            layout_characters = _character_count(layout_text)
            plain_characters = _character_count(plain_text)

            # Layout mode is experimental and omits rotated text by default. Some
            # PDF generators rotate the page's entire text layer, so prefer the
            # mode that recovered more actual characters for each page.
            if plain_characters > layout_characters:
                text = plain_text
                extraction_mode = "plain"
            else:
                text = layout_text
                extraction_mode = "layout"
            pages.append(f"[Page {number}]\n{text.strip()}")
            page_stats.append({
                "page": number,
                "layout_characters": layout_characters,
                "plain_characters": plain_characters,
                "layout_failed": layout_failed,
                "plain_failed": plain_failed,
                "selected_characters": _character_count(text),
                "selected_mode": extraction_mode,
            })
        return "\n\n".join(pages), page_stats
    except ResumeParseError:
        raise
    except Exception as exc:
        raise ResumeParseError("The PDF could not be read") from exc


def _extract_docx(content: bytes) -> str:
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    _validate_docx_archive(content)
    try:
        document = Document(io.BytesIO(content))
        blocks = []
        for item in document.iter_inner_content():
            if isinstance(item, Paragraph) and item.text.strip():
                blocks.append(item.text.strip())
            elif isinstance(item, Table):
                for row in item.rows:
                    value = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if value:
                        blocks.append(value)
        return "\n".join(blocks)
    except ResumeParseError:
        raise
    except Exception as exc:
        raise ResumeParseError("The DOCX could not be read") from exc


def _worker(content: bytes, extension: str, queue) -> None:
    try:
        # Leave room for the already-loaded application and parser libraries while
        # still containing decompression bombs inside the worker process.
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CPU, (9, 10))
        if extension == ".pdf":
            text, metadata = _extract_pdf(content)
        else:
            text, metadata = _extract_docx(content), None
        queue.put((True, text, metadata))
    except Exception as exc:
        queue.put((False, str(exc), None))


def extract_resume_text(content: bytes, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in {".pdf", ".docx"}:
        raise ResumeParseError("Only PDF and DOCX resumes can be analyzed")
    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise ResumeParseError("The file is not a valid PDF")

    # Spawn avoids forking FastAPI's event-loop process from a worker thread.
    context = multiprocessing.get_context("spawn")
    queue = context.Queue(maxsize=1)
    process = context.Process(target=_worker, args=(content, extension, queue), daemon=True)
    process.start()
    process.join(10)
    if process.is_alive():
        process.kill()
        process.join()
        raise ResumeParseError("Resume text extraction timed out")
    try:
        succeeded, result, metadata = queue.get(timeout=0.5)
    except queue_module.Empty as exc:
        raise ResumeParseError("Resume text extraction failed") from exc
    if not succeeded:
        raise ResumeParseError(result)

    normalized = "\n".join(line.rstrip() for line in result.splitlines()).strip()
    if extension == ".pdf" and metadata is not None:
        extracted_characters = sum(int(page["selected_characters"]) for page in metadata)
        logger.info(
            "PDF resume text extraction completed: pages=%d extracted_characters=%d page_stats=%s",
            len(metadata),
            extracted_characters,
            metadata,
        )
    else:
        extracted_characters = _character_count(normalized)
        logger.info(
            "DOCX resume text extraction completed: extracted_characters=%d",
            extracted_characters,
        )
    if extracted_characters < 80:
        if extension == ".pdf":
            raise ResumeParseError("No usable text was found. Scanned PDFs are not supported yet")
        raise ResumeParseError("No usable text was found in the DOCX")
    if len(normalized) > MAX_TEXT_CHARS:
        raise ResumeParseError("The resume contains too much text to analyze")
    return normalized
