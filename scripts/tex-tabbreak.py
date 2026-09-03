# -*- coding: utf-8 -*-
r"""
Re-enables hyphenation inside table cells.

The document preamble sets \hyphenpenalty=10000, disabling hyphenation
everywhere. That is the right call for justified body text, but in a narrow
fixed-width table column a long identifier then has no legal break point and
runs into the margin. \tabbreak restores hyphenation for the duration of a
cell only, and the \hspace{0pt} lets the first word of a \raggedright cell
hyphenate as well (without it, TeX will not hyphenate a paragraph's first
word).

    python scripts/tex-tabbreak.py
"""
import io, sys

TEX = "Report/Template Report PSM.tex"
MARKER = "\\usepackage{longtable}"

DEFN = (
    "% Hyphenation is switched off document-wide below (\\hyphenpenalty=10000),\n"
    "% which suits justified body text but makes a long identifier in a narrow\n"
    "% table column overflow into the margin, since it has no legal break point.\n"
    "% \\tabbreak restores hyphenation inside a table cell only; the \\hspace{0pt}\n"
    "% additionally lets the first word of a \\raggedright cell hyphenate.\n"
    "\\newcommand{\\tabbreak}{\\hyphenpenalty=200\\exhyphenpenalty=200"
    "\\tolerance=4000\\hbadness=10000\\hspace{0pt}}\n"
)

s = io.open(TEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")

if "\\tabbreak" in s:
    print("already applied")
    sys.exit(0)

n = s.count("{\\raggedright\\arraybackslash}") + s.count("{\\centering\\arraybackslash}")
s = s.replace("{\\raggedright\\arraybackslash}", "{\\raggedright\\arraybackslash\\tabbreak}")
s = s.replace("{\\centering\\arraybackslash}", "{\\centering\\arraybackslash\\tabbreak}")

assert MARKER in s, "longtable package line not found"
s = s.replace(MARKER, DEFN + MARKER, 1)

io.open(TEX, "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n"))
print("added \\tabbreak to %d column specifications" % n)
