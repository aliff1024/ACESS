'use client';

import { useState } from 'react';
import { Download, FileText, Filter, Loader2 } from 'lucide-react';
import { generateReport, generateCustomReport } from '@/lib/admin-api';
import type { ReportDefinition } from '@/lib/admin-api';
import { CustomReportModal } from './CustomReportModal';

const reportTemplates = [
  { id: 'user_activity', type: 'user', title: 'User Activity Report', description: 'Detailed breakdown of user engagement and activity patterns', frequency: 'On-demand' },
  { id: 'course_performance', type: 'course', title: 'Course Performance Report', description: 'Comprehensive analysis of course completion and quiz scores', frequency: 'On-demand' },
  { id: 'certificate_issuance', type: 'system', title: 'Certificate Issuance Report', description: 'Summary of all certificates issued and revoked', frequency: 'On-demand' },
  { id: 'platform_health', type: 'system', title: 'Platform Health Report', description: 'System performance, uptime, and technical metrics', frequency: 'On-demand' },
  { id: 'accessibility_usage', type: 'user', title: 'Accessibility Usage Report', description: 'Breakdown of accessibility features used by learners', frequency: 'On-demand' },
  { id: 'educator_impact', type: 'user', title: 'Educator Impact Report', description: 'Activity and reach metrics per educator on the platform', frequency: 'On-demand' },
  { id: 'learner_demographics', type: 'user', title: 'Learner Demographics', description: 'Geographic and age breakdown of the learner base', frequency: 'On-demand' },
  { id: 'quiz_analytics', type: 'course', title: 'Quiz Analytics', description: 'Analysis of recent quiz attempts, pass rates, and scores', frequency: 'On-demand' },
  { id: 'content_inventory', type: 'system', title: 'Content Inventory', description: 'Overview of all courses, lessons, and enrollment counts', frequency: 'On-demand' },
];

export default function Reports() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportDefinition | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId);
    try {
      const report = await generateReport(reportId);
      setReportData(report);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGenerating(null);
    }
  };

  const handleCustomGenerate = async (entity: string, fields: string[]) => {
    setIsGeneratingCustom(true);
    try {
      const report = await generateCustomReport(entity, fields);
      setReportData(report);
      setIsCustomModalOpen(false);
    } catch (err) {
      console.error('Failed to generate custom report:', err);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const exportCSV = () => {
    if (!reportData || reportData.data.length === 0) return;
    const headers = Object.keys(reportData.data[0])
    const csv = [
      headers.join(','),
      ...reportData.data.map(row =>
        headers.map(h => {
          const val = (row as Record<string, unknown>)[h]
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '')
        }).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportData.title.replace(/\s+/g, '_').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    if (!reportData || reportData.data.length === 0) return;
    
    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then(([{ default: jsPDF }, { default: autoTable }]) => {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(reportData.title, 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      const splitDescription = doc.splitTextToSize(reportData.description, 180);
      doc.text(splitDescription, 14, 32);

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      const timestampY = 32 + (splitDescription.length * 5) + 2;
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, timestampY);

      const headers = Object.keys(reportData.data[0]);
      const body = reportData.data.map(row => 
        headers.map(h => String((row as Record<string, unknown>)[h] ?? ''))
      );

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: timestampY + 8,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10, cellPadding: 3 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      doc.save(`${reportData.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    }).catch(err => {
      console.error('Failed to load PDF libraries:', err);
    });
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reports</h2>
          <p className="text-gray-600">Generate and download platform reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTemplates.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  {report.frequency}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <button
                onClick={() => handleGenerate(report.id)}
                disabled={generating === report.id}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating === report.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generating === report.id ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          ))}
        </div>

        {reportData && reportData.data.length > 0 && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{reportData.title}</h3>
              <div className="flex gap-3">
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.keys(reportData.data[0]).map((header) => (
                      <th key={header} className="px-4 py-2 text-left font-medium text-gray-700">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      {Object.values(row as Record<string, unknown>).map((val, j) => (
                        <td key={j} className="px-4 py-2 text-gray-600">{String(val ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportData.data.length > 50 && (
              <p className="text-sm text-gray-500 mt-4">Showing 50 of {reportData.data.length} rows</p>
            )}
          </div>
        )}

        <div className="mt-8 bg-blue-50 rounded-xl border-2 border-blue-200 p-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Filter className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Custom Report Builder</h3>
              <p className="text-gray-700 mb-4">
                Need a specific report? Use our custom report builder to select exactly the data you need.
              </p>
              <button 
                onClick={() => setIsCustomModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Custom Report
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <CustomReportModal 
        open={isCustomModalOpen} 
        onOpenChange={setIsCustomModalOpen} 
        onGenerate={handleCustomGenerate} 
        isGenerating={isGeneratingCustom} 
      />
    </div>
  );
}
