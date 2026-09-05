import re
from html import unescape

import nh3


def sanitize_description(value: str) -> str:
    """Keep legacy plain text; allow only the editor's formatting in HTML."""
    if not re.search(r"</?[a-z][^>]*>", value, re.IGNORECASE):
        cleaned = value
        text = value
    else:
        cleaned = nh3.clean(
            value,
            tags={"p", "br", "h2", "h3", "strong", "b", "em", "i", "ul", "ol", "li"},
            attributes={},
            clean_content_tags={"script", "style", "iframe", "object", "svg", "math", "template"},
            link_rel=None,
        )
        text = unescape(nh3.clean(cleaned, tags=set(), attributes={}, link_rel=None))
    if not text.strip():
        raise ValueError("Job description must contain text")
    return cleaned
