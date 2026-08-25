'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Accessibility,
  AlertCircle,
  BookOpen,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  Users,
} from 'lucide-react';
import type { AdminReport, ReportId } from '@/lib/admin-reports';
import type { RangeKey } from '@/lib/admin-api';
import { BarList, DataNote, Panel, RangePicker } from './analytics/AdminAnalyticsUI';

const REPORTS: {
  id: ReportId;
  title: string;
  description: string;
  answers: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  {
    id: 'users',
    title: 'User Report',
    description: 'Accounts, roles, registration trend and activity recency.',
    answers: 'Who is on the platform, and are they still here?',
    icon: Users,
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'courses',
    title: 'Course Report',
    description: 'Catalogue composition, enrollment reach and course performance.',
    answers: 'Which courses work, and which sit unused?',
    icon: BookOpen,
    tone: 'bg-green-50 text-green-700',
  },
  {
    id: 'learning',
    title: 'Learning Report',
    description: 'Enrollment and completion trends, progress and assessment results.',
    answers: 'How far do learners actually get?',
    icon: GraduationCap,
    tone: 'bg-purple-50 text-purple-700',
  },
  {
    id: 'accessibility',
    title: 'Accessibility Report',
    description: 'Adaptation usage, saved preferences and catalogue coverage.',
    answers: 'Are the accessibility features reaching learners?',
    icon: Accessibility,
    tone: 'bg-teal-50 text-teal-700',
  },
];

function tableToCsv(columns: string[], rows: (string | number)[][]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

export default function Reports() {
  const [range, setRange] = useState<RangeKey>('all');
  const [selected, setSelected] = useState<ReportId | null>(null);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [building, setBuilding] = useState<ReportId | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const build = useCallback(
    async (reportId: ReportId, rangeKey: RangeKey) => {
      setBuilding(reportId);
      setError(null);
      try {
        const res = await fetch('/api/admin/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, range: rangeKey }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to build report');
        setReport(body as AdminReport);
        setSelected(reportId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to build report');
        setReport(null);
      } finally {
        setBuilding(null);
      }
    },
    []
  );

  // Rebuild the open report when the range changes, so the preview and any
  // export always describe the same period.
  useEffect(() => {
    if (selected) void build(selected, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const exportPdf = async () => {
    if (!report) return;
    setExporting(true);
    setError(null);
    try {
      const { generateReportPdf } = await import('@/lib/admin-report-pdf');
      await generateReportPdf(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const tables = report.sections.filter((s) => s.table);
    if (tables.length === 0) return;

    const blocks = tables.map((s) => {
      const t = s.table!;
      return `${s.title} — ${t.title}\n${tableToCsv(t.columns, t.rows)}`;
    });

    const header = `${report.title}\n${report.range.label}\nGenerated ${new Date(
      report.generatedAt
    ).toLocaleString()}\n`;

    const blob = new Blob([`${header}\n${blocks.join('\n\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acess-${report.id}-report-${report.range.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h2 className="mb-1 text-3xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-600">
            Four reports built from the same data as the dashboard, exportable as PDF or CSV.
          </p>
        </header>

        <div className="mb-8">
          <RangePicker value={range} onChange={setRange} disabled={building !== null} />
        </div>

        {/* ─── Report picker ────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            const isActive = selected === r.id;
            return (
              <button
                key={r.id}
                onClick={() => build(r.id, range)}
                disabled={building !== null}
                aria-pressed={isActive}
                className={`rounded-xl border p-5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${r.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-gray-900">{r.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{r.description}</p>
                <p className="mt-3 text-xs italic text-gray-500">{r.answers}</p>
                <span className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600">
                  {building === r.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Building…
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" /> {isActive ? 'Rebuild' : 'Generate'}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Report failed</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* ─── Preview ──────────────────────────────────────────────── */}
        {report && (
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{report.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {report.range.label} · generated{' '}
                    {new Date(report.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={exportCsv}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                  <button
                    onClick={exportPdf}
                    disabled={exporting}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {exporting ? 'Building PDF…' : 'Export PDF'}
                  </button>
                </div>
              </div>

              {/* Executive summary */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {report.summary.map((item) => (
                  <div key={item.label} className="rounded-lg bg-gray-50 p-4">
                    <p className="text-2xl font-bold tabular-nums text-gray-900">{item.value}</p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {item.label}
                    </p>
                    {item.hint && <p className="mt-0.5 text-xs text-gray-500">{item.hint}</p>}
                  </div>
                ))}
              </div>
            </section>

            {/* Key findings */}
            <Panel
              title="Key findings"
              question="What the data says, generated from the figures above"
              isEmpty={report.findings.length === 0}
              emptyMessage="The dataset in this range is too small to support findings."
            >
              <ul className="space-y-3">
                {report.findings.map((f, i) => (
                  <li key={i} className="flex gap-3 border-l-2 border-blue-600 pl-4">
                    <p className="text-sm text-gray-800">{f}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* Sections */}
            {report.sections.map((section) => (
              <Panel
                key={section.title}
                title={section.title}
                question={section.description}
                isEmpty={
                  !section.chart?.series.length && !section.table?.rows.length && !section.note
                }
                emptyMessage="No records in this range."
              >
                {section.chart && section.chart.series.length > 0 && (
                  <BarList
                    items={section.chart.series.map((s) => ({ label: s.label, value: s.value }))}
                    valueLabel={section.chart.unit}
                  />
                )}

                {section.table && section.table.rows.length > 0 && (
                  <div className={`overflow-x-auto ${section.chart ? 'mt-6' : ''}`}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {section.table.title}
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          {section.table.columns.map((c, i) => (
                            <th
                              key={c}
                              className={`whitespace-nowrap pb-2 pr-4 font-semibold text-gray-700 ${
                                section.table!.numericColumns.includes(i) ? 'text-right' : ''
                              }`}
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {section.table.rows.slice(0, 25).map((row, ri) => (
                          <tr key={ri} className="hover:bg-gray-50">
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className={`py-2 pr-4 text-gray-700 ${
                                  section.table!.numericColumns.includes(ci)
                                    ? 'text-right tabular-nums'
                                    : ''
                                }`}
                              >
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {section.table.rows.length > 25 && (
                      <p className="mt-3 text-xs text-gray-500">
                        Showing 25 of {section.table.rows.length} rows. The PDF and CSV exports
                        contain every row.
                      </p>
                    )}
                  </div>
                )}

                {section.note && <DataNote>{section.note}</DataNote>}
              </Panel>
            ))}

            {/* Caveats */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <h3 className="text-base font-bold text-gray-900">How to read this report</h3>
              <ul className="mt-4 space-y-2.5">
                {report.caveats.map((c, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-gray-400" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {!report && !building && !error && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="font-medium text-gray-700">Choose a report to generate</p>
            <p className="mt-1 text-sm text-gray-500">
              Every figure comes from the live database. Nothing is estimated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
