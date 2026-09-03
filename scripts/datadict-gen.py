# -*- coding: utf-8 -*-
"""
Regenerates Chapter 4's data dictionary directly from the live database.

Descriptions are the one part a catalogue query cannot supply, so they are
carried over from the existing report where the column still exists, and are
otherwise taken from an explicit table in this file. Any column that has
neither is reported, so a missing description is a visible failure rather than
a silently blank cell.

    python scripts/datadict-gen.py --audit     # report differences only
    python scripts/datadict-gen.py --write     # rewrite the section
"""
import io, re, sys, subprocess, json

TEX = "Report/Template Report PSM.tex"
PSQL = ["docker", "exec", "supabase_db_ACESS-main", "psql", "-U", "postgres",
        "-d", "postgres", "-At", "-F", "\t", "-c"]


def q(sql):
    out = subprocess.run(PSQL + [sql], capture_output=True, text=True, check=True).stdout
    return [line.split("\t") for line in out.strip().split("\n") if line]


def schema():
    cols = q("""
      select c.table_name, c.column_name, c.udt_name, coalesce(c.column_default,''),
             c.is_nullable, c.ordinal_position
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema=c.table_schema and t.table_name=c.table_name
      where c.table_schema='public' and t.table_type='BASE TABLE'
      order by c.table_name, c.ordinal_position""")
    pk = {(r[0], r[1]) for r in q("""
      select tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema
      where tc.table_schema='public' and tc.constraint_type='PRIMARY KEY'""")}
    uq = {(r[0], r[1]) for r in q("""
      select tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema
      where tc.table_schema='public' and tc.constraint_type='UNIQUE'""")}
    fk = {}
    for r in q("""
      select con.conrelid::regclass::text, att.attname, con.confrelid::regclass::text
      from pg_constraint con
      join pg_namespace n on n.oid=connamespace
      join unnest(con.conkey) with ordinality as k(attnum, ord) on true
      join pg_attribute att on att.attrelid=con.conrelid and att.attnum=k.attnum
      where n.nspname='public' and con.contype='f'"""):
        fk[(r[0].split(".")[-1], r[1])] = r[2].split(".")[-1]
    tables = {}
    for t, c, udt, dflt, nullable, _ in cols:
        tables.setdefault(t, []).append(
            dict(name=c, udt=udt, default=dflt, nullable=nullable == "YES",
                 pk=(t, c) in pk, uq=(t, c) in uq, fk=fk.get((t, c))))
    return tables


def parse_existing_descriptions():
    """Pull {table: {column: description}} out of the current report text."""
    s = io.open(TEX, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    out = {}
    for m in re.finditer(r"\\textbf\{\d+\. Table: ([a-z0-9\\_]+)\}(.*?)\\end\{table\}", s, re.S):
        table = m.group(1).replace("\\_", "_")
        body = m.group(2)
        cols = {}
        for line in body.split("\n"):
            if "&" not in line or "\\hline" not in line:
                continue
            parts = line.split("&")
            if len(parts) < 4 or "textbf" in parts[0]:
                continue
            name = parts[0].strip().replace("\\_", "_")
            desc = "&".join(parts[3:]).split("\\\\")[0].strip()
            if name and desc and not name.startswith("\\"):
                cols[name] = desc
        out[table] = cols
    return out


TYPE_LABEL = {
    "uuid": "uuid", "text": "text", "varchar": "character varying", "int4": "integer",
    "int8": "bigint", "bool": "boolean", "jsonb": "jsonb", "date": "date",
    "numeric": "numeric", "timestamp": "timestamp", "timestamptz": "timestamptz",
    "_text": "text[]",
}


def type_label(c):
    base = TYPE_LABEL.get(c["udt"], c["udt"])
    if base == "timestamp":
        base = "timestamp"
    if base == "timestamptz":
        base = "timestamptz"
    d = c["default"]
    if d:
        d = re.sub(r"::[a-z_ ]+(\[\])?", "", d).strip()
        if len(d) < 34:
            base += " DEFAULT " + d
    return base


ACRONYMS = {"Ai": "AI"}  # str.title() lowercases these; restore known acronyms


def title_case(table_name):
    words = table_name.replace("_", " ").title().split(" ")
    return " ".join(ACRONYMS.get(w, w) for w in words)


def constraint_label(c):
    bits = []
    if c["pk"]:
        bits.append(tcode("PRIMARY KEY"))
    if c["fk"]:
        bits.append("FK $\\rightarrow$ " + tcode(c["fk"]))
    if c["uq"] and not c["pk"]:
        bits.append(tcode("UNIQUE"))
    if not c["nullable"] and not c["pk"]:
        bits.append(tcode("NOT NULL"))
    return ", ".join(bits) if bits else "-"


def tcode(s):
    # \tcode is \path{} (url.sty, [obeyspaces]) — it typesets its argument
    # verbatim, so schema identifiers go in raw, with no manual escaping.
    return r"\tcode{%s}" % s


def tex(s):
    # [obeyspaces] means \tcode/\path never treats an internal space as a
    # break point, so a multi-word "character varying DEFAULT 'x'"-style
    # type string wrapped in \tcode overflows the narrow Type column
    # (confirmed empirically). Single-token identifiers (attribute names)
    # don't have this problem and stay in \tcode; type/default strings use
    # plain, escaped text instead so they wrap normally.
    return s.replace("_", r"\_")


DOMAIN_ORDER = [
    ("Core Identity and Configuration",
     ["users", "user_profiles", "referral_codes", "instructor_applications",
      "contact_messages", "notifications", "accessibility_templates",
      "adaptive_interactions"]),
    ("Curriculum Structure",
     ["courses", "course_chapters", "lessons", "course_accessibility_categories",
      "course_milestones", "course_achievements", "lesson_templates",
      "lesson_versions", "media_assets"]),
    ("Lesson Content and Interaction",
     ["lesson_interactive_content", "video_questions", "h5p_contents",
      "lesson_checkpoints", "lesson_ai_summaries", "lesson_comments"]),
    ("Assessment",
     ["quizzes", "quiz_questions", "quiz_options", "quiz_attempts", "quiz_answers"]),
    ("Learner Progress, Recognition and Recommendation",
     ["enrollments", "lesson_progress", "learner_checkpoints", "h5p_responses",
      "recommendations", "course_favorites", "user_achievements", "certificates"]),
]

CAPTIONS = {}


def main():
    tables = schema()
    old = parse_existing_descriptions()

    extra = io.open("scripts/datadict-descriptions.json", encoding="utf-8")
    manual = json.load(extra)
    extra.close()

    listed = [t for _, ts in DOMAIN_ORDER for t in ts]
    missing_from_plan = sorted(set(tables) - set(listed))
    unknown = sorted(set(listed) - set(tables))
    if missing_from_plan or unknown:
        print("PLAN MISMATCH  not-listed:", missing_from_plan, " not-in-db:", unknown)

    gaps = []
    out = []
    n = 0
    for domain, tabs in DOMAIN_ORDER:
        out.append("\\subsubsection{%s}\n\n" % domain)
        out.append("Tables~\\ref{tab:dd_%s} to~\\ref{tab:dd_%s} define the %d entities of the "
                   "%s domain.\n\n" % (tabs[0], tabs[-1], len(tabs), domain.lower()))
        for t in tabs:
            n += 1
            cols = tables[t]
            out.append("\\textbf{%d. Table: %s}\n" % (n, tcode(t)))
            out.append(r"""
\begin{table}[H]
\caption{%s Data Dictionary}
\label{tab:dd_%s}
\vspace{-4mm}
\begin{center}
\renewcommand{\arraystretch}{1.15}
\scriptsize
%% Widths chosen so that the four columns plus tabcolsep and rules total under
%% the 15cm text block; verified by scripts/table-width.py, which fails the
%% build otherwise. Do not widen these without re-running that check.
\begin{tabular}{|>{\raggedright\arraybackslash\tabbreak}p{2.67cm}|>{\raggedright\arraybackslash\tabbreak}p{2.93cm}|>{\raggedright\arraybackslash\tabbreak}p{2.67cm}|>{\raggedright\arraybackslash\tabbreak}p{4.51cm}|}
\hline
\textbf{Attribute} & \textbf{Type} & \textbf{Constraint} & \textbf{Description} \\ \hline
""" % (title_case(t), t))
            for c in cols:
                desc = (manual.get(t, {}).get(c["name"])
                        or old.get(t, {}).get(c["name"]))
                if not desc:
                    gaps.append("%s.%s" % (t, c["name"]))
                    desc = "TODO"
                out.append("%s & %s & %s & %s \\\\ \\hline\n"
                           % (tcode(c["name"]), tex(type_label(c)),
                              constraint_label(c), desc))
            out.append("\\end{tabular}\n\\end{center}\n\\end{table}\n\n")

    if "--audit" in sys.argv:
        print("tables:", len(listed), "columns:", sum(len(tables[t]) for t in listed))
        print("missing descriptions (%d):" % len(gaps))
        for g in gaps:
            print("  ", g)
        return

    io.open("scripts/datadict-generated.tex", "w", encoding="utf-8").write("".join(out))
    print("written scripts/datadict-generated.tex ; missing descriptions:", len(gaps))
    for g in gaps:
        print("  ", g)


main()
