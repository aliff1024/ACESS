# -*- coding: utf-8 -*-
"""Exact-match editor for the CRLF LaTeX source. Each edit must match once."""
import io, sys

PATH = "Report/Template Report PSM.tex"


def load():
    return io.open(PATH, encoding="utf-8", newline="").read().replace("\r\n", "\n")


def save(text):
    io.open(PATH, "w", encoding="utf-8", newline="").write(text.replace("\n", "\r\n"))


def apply(edits):
    s = load()
    for i, (old, new) in enumerate(edits):
        c = s.count(old)
        if c != 1:
            sys.stderr.write("FAIL edit %d count=%d :: %s\n"
                             % (i, c, old[:110].replace("\n", " | ")))
            sys.exit(1)
        s = s.replace(old, new)
    save(s)
    print("applied %d edits" % len(edits))


def replace_span(start_marker, end_marker, new, keep_end=True):
    """Replace everything from start_marker up to (and optionally excluding) end_marker."""
    s = load()
    if s.count(start_marker) != 1:
        sys.stderr.write("FAIL start marker count=%d\n" % s.count(start_marker))
        sys.exit(1)
    if s.count(end_marker) != 1:
        sys.stderr.write("FAIL end marker count=%d\n" % s.count(end_marker))
        sys.exit(1)
    a = s.index(start_marker)
    b = s.index(end_marker)
    if b <= a:
        sys.stderr.write("FAIL end marker precedes start marker\n")
        sys.exit(1)
    tail = end_marker if keep_end else ""
    s = s[:a] + new + tail + s[b + len(end_marker):]
    save(s)
    print("span replaced (%d chars -> %d chars)" % (b - a, len(new)))
