# -*- coding: utf-8 -*-
"""
Audits and repairs table widths in the report.

A tabular whose fixed column widths plus inter-column padding exceed the text
block silently runs into the margin -- LaTeX reports it as an Overfull \\hbox
in an alignment, which is easy to miss in a long log. This computes the true
width of every tabular preamble (p/m/b column widths + 2*tabcolsep per column
+ vertical rules) and, with --fix, scales the p-column widths down
proportionally until the row fits.

    python scripts/table-width.py            # audit
    python scripts/table-width.py --fix      # rescale offenders
"""
import io, re, sys

TEX = "Report/Template Report PSM.tex"
TEXTWIDTH_CM = 15.0          # 21cm paper - 3.5cm left - 2.5cm right
TARGET_CM = 14.55            # leave a little slack for rules and rounding
TABCOLSEP_CM = 0.2114        # 6pt
RULE_CM = 0.0141             # 0.4pt

COL_RE = re.compile(r"[pmb]\{([0-9.]+)cm\}")


def preamble_width(preamble):
    widths = [float(w) for w in COL_RE.findall(preamble)]
    if not widths:
        return None, []
    ncols = len(widths) + len(re.findall(r"(?<!\|)\b[lcr]\b", preamble))
    ncols = max(ncols, len(widths))
    nrules = preamble.count("|")
    total = sum(widths) + 2 * TABCOLSEP_CM * ncols + RULE_CM * nrules
    return total, widths


def main():
    s = io.open(TEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    fix = "--fix" in sys.argv
    out = s
    offenders = 0

    for m in re.finditer(r"\\begin\{(tabular|longtable)\}(\{.*?\})\n", s):
        preamble = m.group(2)
        total, widths = preamble_width(preamble)
        if total is None:
            continue
        line = s[:m.start()].count("\n") + 1
        if total <= TEXTWIDTH_CM:
            continue
        offenders += 1
        over = total - TEXTWIDTH_CM
        print("line %5d  width %.2fcm  over by %.2fcm (%.1fpt)  cols=%d"
              % (line, total, over, over * 28.45, len(widths)))
        if not fix:
            continue
        fixed = sum(2 * TABCOLSEP_CM * len(widths) + RULE_CM * preamble.count("|") for _ in [0])
        budget = TARGET_CM - (2 * TABCOLSEP_CM * len(widths) + RULE_CM * preamble.count("|"))
        scale = budget / sum(widths)
        new_pre = preamble
        for w in sorted(set(widths), reverse=True):
            new_pre = new_pre.replace("{%scm}" % _fmt(w), "{%scm}" % _fmt(round(w * scale, 2)))
        out = out.replace(preamble, new_pre, 1)

    if fix and offenders:
        io.open(TEX, "w", encoding="utf-8", newline="").write(out.replace("\n", "\r\n"))
        print("rescaled %d tables" % offenders)
    elif not offenders:
        print("all tables fit within %.1fcm" % TEXTWIDTH_CM)


def _fmt(x):
    t = ("%.2f" % x).rstrip("0").rstrip(".")
    return t


main()
