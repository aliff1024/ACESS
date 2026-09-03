# -*- coding: utf-8 -*-
"""Ranks the overfull boxes in the build log by severity and printed page."""
import io, re, sys

LOG = "Report/Template Report PSM.log"
log = io.open(LOG, encoding="utf-8", errors="replace").read()

PAGE = re.compile(r"\[(\d+)\]")
OVER = re.compile(r"Overfull \\([hv])box \(([0-9.]+)pt too (wide|high)\)(.*)")

page, rows = 0, []
for line in log.split("\n"):
    for m in PAGE.finditer(line):
        page = int(m.group(1))
    m = OVER.search(line)
    if m:
        rows.append((float(m.group(2)), m.group(1), page, m.group(4).strip()[:60]))

rows.sort(reverse=True)
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 15
for amount, kind, pg, where in rows[:limit]:
    print("%8.1fpt  %sbox  page~%-4d %s" % (amount, kind, pg, where))
print("total overfull boxes: %d  (worst %.1fpt)" % (len(rows), rows[0][0] if rows else 0))
