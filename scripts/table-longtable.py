# -*- coding: utf-8 -*-
"""
Converts over-tall tables to longtable so they break across pages.

A \\begin{table}[H] holding more rows than fit on a page does not break -- it
runs off the bottom, which LaTeX reports only as "Overfull \\vbox ... while
\\output is active". This finds those tables and rewrites them as longtable,
preserving the caption (above, per the writing guide), the label, and the
header row, and repeating the header with a "continued" marker on each new
page.

    python scripts/table-longtable.py            # report candidates
    python scripts/table-longtable.py --fix
"""
import io, re, sys

TEX = "Report/Template Report PSM.tex"
ROW_THRESHOLD = 16      # rows above which a table will not fit one page
ALWAYS = {"tab:lms_comparison"}  # tall cells make these overflow well below the row threshold

TABLE_RE = re.compile(
    r"\\begin\{table\}\[H\]\n(.*?)\\end\{table\}\n", re.S)


def convert(block):
    """Return the longtable form of one table block, or None if not convertible."""
    cap = re.search(r"\\caption\{(.*?)\}\n", block, re.S)
    lab = re.search(r"\\label\{(.*?)\}", block)
    pre = re.search(r"\\begin\{tabular\}(\{.*?\})\n", block, re.S)
    if not (cap and lab and pre):
        return None

    body_m = re.search(r"\\begin\{tabular\}\{.*?\}\n(.*?)\\end\{tabular\}", block, re.S)
    if not body_m:
        return None
    body = body_m.group(1)

    # The header is everything up to and including the first row that contains
    # \textbf column titles. Some tables close it with "\hline \hline" and the
    # generated data-dictionary tables with a single "\hline", so match either.
    hdr_m = re.search(r"^(.*?\\textbf\{.*?\\\\\s*\\hline(\s*\\hline)?\s*\n)", body, re.S)
    if not hdr_m:
        return None
    header = hdr_m.group(1).strip()
    rows = body[hdr_m.end():]

    ncols = pre.group(1).count("p{") + pre.group(1).count("m{") + \
        len(re.findall(r"(?<=\|)[lcr](?=\|)", pre.group(1)))
    ncols = max(ncols, header.count("&") + 1)

    stretch = re.search(r"\\renewcommand\{\\arraystretch\}\{([0-9.]+)\}", block)
    size = re.search(r"\\(scriptsize|footnotesize|small)\b", block)

    parts = []
    parts.append("{\n")
    if stretch:
        parts.append("\\renewcommand{\\arraystretch}{%s}\n" % stretch.group(1))
    if size:
        parts.append("\\%s\n" % size.group(1))
    parts.append("\\begin{longtable}%s\n" % pre.group(1))
    parts.append("\\caption{%s}\n\\label{%s}\\\\\n" % (cap.group(1).strip(), lab.group(1)))
    parts.append("%s\n\\endfirsthead\n" % header)
    parts.append("\\multicolumn{%d}{l}{\\footnotesize\\itshape Table~\\ref{%s} "
                 "continued from the previous page}\\\\\n" % (ncols, lab.group(1)))
    parts.append("%s\n\\endhead\n" % header)
    parts.append("\\hline\n\\multicolumn{%d}{r}{\\footnotesize\\itshape continued on the "
                 "next page}\\\\\n\\endfoot\n" % ncols)
    parts.append("\\endlastfoot\n")
    parts.append(rows.rstrip() + "\n")
    parts.append("\\end{longtable}\n}\n")
    return "".join(parts)


def main():
    s = io.open(TEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    fix = "--fix" in sys.argv
    out = s
    n = 0

    for m in TABLE_RE.finditer(s):
        block = m.group(0)
        inner = m.group(1)
        rows = len(re.findall(r"\\\\\s*\\hline", inner))
        lab = re.search(r"\\label\{(.*?)\}", inner)
        named = lab is not None and lab.group(1) in ALWAYS
        if rows <= ROW_THRESHOLD and not named:
            continue
        line = s[:m.start()].count("\n") + 1
        print("line %5d  rows %3d  %s" % (line, rows, lab.group(1) if lab else "?"))
        if not fix:
            continue
        new = convert(block)
        if new is None:
            print("    -> could not convert (unexpected structure)")
            continue
        out = out.replace(block, new, 1)
        n += 1

    if fix:
        # \resizebox cannot wrap a longtable; strip the wrapper where one remains
        out = re.sub(r"\\resizebox\{\\textwidth\}\{!\}\{%?\n(\\begin\{longtable\})",
                     r"\1", out)
        io.open(TEX, "w", encoding="utf-8", newline="").write(out.replace("\n", "\r\n"))
        print("converted %d tables to longtable" % n)


main()
