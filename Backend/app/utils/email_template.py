"""Shared Jobify layout for transactional emails. Content arguments are plain text."""

from html import escape


def render_email(*, title: str, message: str, action_label: str,
                 action_url: str, notes: tuple[str, ...] = ()) -> tuple[str, str]:
    """Return email-friendly HTML and an equivalent plain-text alternative."""
    note_html = "".join(
        f'<p style="margin:16px 0 0;color:#64748b;font-size:14px;line-height:1.6;">{escape(note)}</p>'
        for note in notes
    )
    html = f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fb;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:664px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:18px;">
        <tr><td style="padding:32px;">
          <div style="font-size:24px;font-weight:800;color:#2563eb;">Jobify.</div>
          <h1 style="margin:28px 0 12px;font-size:20px;line-height:1.4;color:#0f172a;">{escape(title)}</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">{escape(message)}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
            <tr><td bgcolor="#2563eb" style="background-color:#2563eb;border-radius:10px;text-align:center;">
              <a href="{escape(action_url, quote=True)}" style="display:inline-block;padding:14px 20px;border:1px solid #2563eb;border-radius:10px;font-size:14px;font-weight:700;line-height:1.4;color:#ffffff;text-decoration:none;">{escape(action_label)}</a>
            </td></tr>
          </table>
          {note_html}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    text = "\n\n".join(("Jobify", title, message, f"{action_label}: {action_url}", *notes))
    return html, text
