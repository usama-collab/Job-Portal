from __future__ import annotations

import io
import multiprocessing
import resource
import queue as queue_module
import zipfile
from pathlib import Path


MAX_PDF_PAGES = 10
MAX_TEXT_CHARS = 32_000
MAX_DOCX_ENTRIES = 1_000
MAX_DOCX_EXPANDED_BYTES = 32 * 1024 * 1024


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


def _extract_pdf(content: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(content), strict=True)
        if reader.is_encrypted:
            raise ResumeParseError("Encrypted PDFs are not supported")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ResumeParseError(f"PDF resumes are limited to {MAX_PDF_PAGES} pages")
        pages = []
        for number, page in enumerate(reader.pages, 1):
            text = page.extract_text(extraction_mode="layout") or ""
            pages.append(f"[Page {number}]\n{text.strip()}")
        return "\n\n".join(pages)
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
        text = _extract_pdf(content) if extension == ".pdf" else _extract_docx(content)
        queue.put((True, text))
    except Exception as exc:
        queue.put((False, str(exc)))


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
        succeeded, result = queue.get(timeout=0.5)
    except queue_module.Empty as exc:
        raise ResumeParseError("Resume text extraction failed") from exc
    if not succeeded:
        raise ResumeParseError(result)

    normalized = "\n".join(line.rstrip() for line in result.splitlines()).strip()
    if len(normalized) < 80:
        raise ResumeParseError("No usable text was found. Scanned PDFs are not supported yet")
    if len(normalized) > MAX_TEXT_CHARS:
        raise ResumeParseError("The resume contains too much text to analyze")
    return normalized
