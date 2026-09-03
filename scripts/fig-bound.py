# -*- coding: utf-8 -*-
r"""
Bounds every diagram figure by page height as well as width.

\includegraphics[width=...] alone cannot overflow horizontally but says nothing
about height. The Student Activity Diagram is 2409x8192 px; at 0.55\textwidth
it computed to roughly 28cm tall against a 24.7cm text block, so it ran off the
bottom of the page -- reported only as "Overfull \vbox ... while \output is
active". Adding a height bound with keepaspectratio makes that impossible for
any diagram, whatever its aspect ratio.

    python scripts/fig-bound.py
"""
import io, re

TEX = "Report/Template Report PSM.tex"
s = io.open(TEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")

PAT = re.compile(r"\\includegraphics\[width=([0-9.]*)\\textwidth\]\{(Diagram/[^}]+)\}")


def repl(m):
    width, path = m.group(1) or "1", m.group(2)
    return (r"\includegraphics[width=%s\textwidth,height=0.88\textheight,"
            r"keepaspectratio]{%s}" % (width, path))


s2, n = PAT.subn(repl, s)
io.open(TEX, "w", encoding="utf-8", newline="").write(s2.replace("\n", "\r\n"))
print("height-bounded %d diagram figures" % n)
