# -*- coding: utf-8 -*-
"""
Replaces \\resizebox{\\textwidth}{!}{...} around a tabular with an explicit font
size, and converts the result to longtable.

\\resizebox scales a table to exactly the text width. For a table whose natural
width is narrower than the page that means it is *magnified*, and a 14-row
table magnified that way runs off the bottom of the page -- which is what was
producing the largest vertical overflows in this document. It also makes every
table a different effective font size, which is worse typography than simply
choosing one.

    python scripts/table-derresize.py --fix
"""
import io, re, sys

TEX = "Report/Template Report PSM.tex"

BLOCK = re.compile(
    r"\\begin\{table\}\[H\]\n"
    r"\\caption\{(?P<cap>[^}]*)\}\n"
    r"\\label\{(?P<lab>[^}]*)\}\n"
    r"\\vspace\{-4mm\}\n"
    r"\\begin\{center\}\n"
    r"\\renewcommand\{\\arraystretch\}\{(?P<str>[0-9.]+)\}\n"
    r"\\resizebox\{\\textwidth\}\{!\}\{\n?"
    r"\\begin\{tabular\}(?P<pre>\{.*?\})\n"
    r"(?P<body>.*?)"
    r"\\end\{tabular\}\n"
    r"\}\n"
    r"\\end\{center\}\n"
    r"\\end\{table\}\n", re.S)


def rebuild(m):
    pre, body = m.group("pre"), m.group("body")
    hdr = re.search(r"^(.*?\\textbf\{.*?\\\\\s*\\hline(\s*\\hline)?\s*\n)", body, re.S)
    if not hdr:
        return m.group(0)
    header, rows = hdr.group(1).strip(), body[hdr.end():]
    ncols = header.count("&") + 1
    lab = m.group("lab")
    return (
        "{\n"
        "\\renewcommand{\\arraystretch}{%s}\n"
        "\\footnotesize\n"
        "\\begin{longtable}%s\n"
        "\\caption{%s}\n\\label{%s}\\\\\n"
        "%s\n\\endfirsthead\n"
        "\\multicolumn{%d}{l}{\\footnotesize\\itshape Table~\\ref{%s} continued from the previous page}\\\\\n"
        "%s\n\\endhead\n"
        "\\hline\n\\multicolumn{%d}{r}{\\footnotesize\\itshape continued on the next page}\\\\\n\\endfoot\n"
        "\\endlastfoot\n"
        "%s\n"
        "\\end{longtable}\n}\n"
        % (m.group("str"), pre, m.group("cap").strip(), lab,
           header, ncols, lab, header, ncols, rows.rstrip()))


def main():
    s = io.open(TEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    found = list(BLOCK.finditer(s))
    for m in found:
        lab = m.group("lab")
        print("line %5d  %s" % (s[:m.start()].count("\n") + 1, lab))
    if "--fix" in sys.argv and found:
        s = BLOCK.sub(rebuild, s)
        io.open(TEX, "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n"))
        print("rebuilt %d resizebox tables as longtable" % len(found))
    elif not found:
        print("no \\resizebox tables remain")


main()
