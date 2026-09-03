# -*- coding: utf-8 -*-
"""Structural checks on the report source: label/ref integrity and missing figures."""
import io, os, re, sys

TEX = "Report/Template Report PSM.tex"
s = io.open(TEX, encoding="utf-8", newline="").read()

labels = re.findall(r"\\label\{([^}]+)\}", s)
refs = set(re.findall(r"\\ref\{([^}]+)\}", s))
lset = set(labels)

dupes = sorted({l for l in labels if labels.count(l) > 1})
undefined = sorted(refs - lset)
unused = sorted(lset - refs)

print("labels: %d  refs: %d" % (len(lset), len(refs)))
if dupes:
    print("DUPLICATE labels:", dupes)
if undefined:
    print("UNDEFINED refs:", undefined)
if unused:
    print("labels never referenced:", unused)

graphics = re.findall(r"\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}", s)
missing = []
for g in graphics:
    found = any(os.path.exists(os.path.join("Report", g + ext))
                for ext in ("", ".png", ".pdf", ".jpg"))
    if not found:
        missing.append(g)
print("figures included: %d" % len(graphics))
if missing:
    print("MISSING image files:")
    for m in missing:
        print("   ", m)

cites = set(re.findall(r"\\cite\{([^}]+)\}", s))
keys = set()
for c in cites:
    for k in c.split(","):
        keys.add(k.strip())
bib = io.open("Report/references.bib", encoding="utf-8").read()
bibkeys = set(re.findall(r"@\w+\{([^,]+),", bib))
badcites = sorted(keys - bibkeys)
print("cite keys used: %d  bib entries: %d" % (len(keys), len(bibkeys)))
if badcites:
    print("CITES WITH NO BIB ENTRY:", badcites)

if dupes or undefined or missing or badcites:
    sys.exit(1)
print("OK")
