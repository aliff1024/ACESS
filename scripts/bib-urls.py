# -*- coding: utf-8 -*-
"""
apalike ignores a bare `url` field, so every web citation in the report was
losing its address. This moves each url into a field apalike does print --
howpublished for @misc, note for everything else -- without disturbing the
url field itself, so switching bibliography style later still works.

    python scripts/bib-urls.py
"""
import io, re

PATH = "Report/references.bib"
s = io.open(PATH, encoding="utf-8", newline="").read().replace("\r\n", "\n")

entries = re.split(r"(?=@\w+\{)", s)
out, changed = [], 0

for e in entries:
    if not e.strip().startswith("@"):
        out.append(e)
        continue
    kind = re.match(r"@(\w+)\{", e).group(1).lower()
    m = re.search(r"\n\s*url\s*=\s*\{([^}]*)\}", e)
    if not m or "howpublished" in e or "Available at" in e:
        out.append(e)
        continue
    url = m.group(1).strip()
    field = "howpublished" if kind == "misc" else "note"
    value = r"\url{%s}" % url if field == "howpublished" else r"Available at: \url{%s}" % url
    # insert immediately before the url line so field order stays readable
    e = e[:m.start()] + "\n  %s={%s}," % (field, value) + e[m.start():]
    out.append(e)
    changed += 1

io.open(PATH, "w", encoding="utf-8", newline="").write("".join(out).replace("\n", "\r\n"))
print("added a printable address to %d entries" % changed)
