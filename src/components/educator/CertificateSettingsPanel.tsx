'use client';

import { useState, useEffect, useCallback } from 'react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Award, Loader2, Eye, Download, Shield, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  fetchCourseCertSettings,
  updateCertificateSettings,
  lockCertification,
  fetchCourseStudentsProgress,
  uploadCustomCertificate,
  type CourseStudentProgress
} from '@/lib/educator-api';
import { generatePDFCertificate, MOCK_PREVIEW_DATA, formatDate, type CertificateRenderData } from '@/lib/certificate-utils';

interface Props {
  courseId: string
  courseTitle: string
  isPublished: boolean
  hasEnrollments: boolean
  onCertChange: () => void
}

export default function CertificateSettingsPanel({
  courseId,
  courseTitle,
  isPublished,
  hasEnrollments,
  onCertChange,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [locked, setLocked] = useState(false)
  const [educatorName, setEducatorName] = useState('')
  const [institutionName, setInstitutionName] = useState('ACESS Platform')
  const [courseDurationHours, setCourseDurationHours] = useState(0)
  const [skillsText, setSkillsText] = useState('')
  const [passThreshold, setPassThreshold] = useState(80)
  const [allowCustom, setAllowCustom] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [eligibleStudents, setEligibleStudents] = useState<CourseStudentProgress[]>([])
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchCourseCertSettings(courseId)
      setEnabled(data.certificate_enabled)
      setLocked(data.certification_locked)
      const settings = data.certificate_settings as Record<string, unknown> || {}
      setEducatorName((settings.educator_name as string) || '')
      setInstitutionName((settings.institution_name as string) || 'ACESS Platform')
      setCourseDurationHours((settings.course_duration_hours as number) || 0)
      setSkillsText(((settings.skills as string[]) || []).join(', '))
      setPassThreshold(((settings.completion_rules as Record<string, unknown>)?.quiz_threshold_pct as number) || 80)
      setAllowCustom((settings.allow_custom_certificates as boolean) || false)

      if (data.certificate_enabled || (settings.allow_custom_certificates as boolean)) {
        const students = await fetchCourseStudentsProgress(courseId)
        setEligibleStudents(students.filter(s => s.progressPercent >= (((settings.completion_rules as Record<string, unknown>)?.quiz_threshold_pct as number) || 80)))
      }
    } catch {
      toast.error('Failed to load certificate settings')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadSettings()
  }, [courseId, loadSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean)
      await updateCertificateSettings(courseId, {
        enabled,
        educator_name: educatorName,
        institution_name: institutionName,
        course_duration_hours: courseDurationHours,
        skills,
        pass_threshold_pct: passThreshold,
        required_lessons: [],
        completion_rules: {
          all_lessons_required: true,
          quiz_threshold_pct: passThreshold,
          minimum_progress_pct: 100,
          mandatory_activities: true,
        },
        allow_custom_certificates: allowCustom,
      })

      // Lock certification if publishing or has enrollments
      if (enabled && (isPublished || hasEnrollments) && !locked) {
        await lockCertification(courseId)
        setLocked(true)
      }

      toast.success('Certificate settings saved')
      onCertChange()
    } catch {
      toast.error('Failed to save certificate settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewDownload = async () => {
    setDownloading(true)
    try {
      const previewData: CertificateRenderData = {
        learnerName: MOCK_PREVIEW_DATA.learnerName,
        courseTitle: courseTitle || MOCK_PREVIEW_DATA.courseTitle,
        educatorName: educatorName || MOCK_PREVIEW_DATA.educatorName,
        institutionName: institutionName || MOCK_PREVIEW_DATA.institutionName,
        completionDate: new Date().toISOString(),
        certificateCode: MOCK_PREVIEW_DATA.certificateCode,
        verificationUrl: `${window.location.origin}/verify/${MOCK_PREVIEW_DATA.certificateCode}`,
        skills: skillsText.split(',').map(s => s.trim()).filter(Boolean),
        courseDurationHours: courseDurationHours,
      }
      await generatePDFCertificate(previewData, 'download')
      toast.success('Preview certificate downloaded')
    } catch (err) {
      toast.error('Failed to generate preview')
      console.error(err)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-[96%] max-w-[1500px] mx-auto bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-[96%] max-w-[1500px] mx-auto bg-white rounded-lg border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Certificate Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Configure certification for this course</p>
        </div>
        {locked && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Locked
          </Badge>
        )}
      </div>

      {locked && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Certificate settings are locked</p>
            <p className="text-xs text-amber-700 mt-1">
              This course has been published with certification enabled. Major settings are locked to preserve certificate integrity.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Enable Certificate</p>
              <p className="text-xs text-gray-600">Learners earn a certificate upon completion</p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={locked}
          />
        </div>

        {/* Allow Custom toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Allow Custom Certificates</p>
              <p className="text-xs text-gray-600">Upload unique certificates for eligible students</p>
            </div>
          </div>
          <Switch
            checked={allowCustom}
            onCheckedChange={setAllowCustom}
          />
        </div>

        {enabled && !allowCustom && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Educator Name</label>
                <Input
                  value={educatorName}
                  onChange={(e) => setEducatorName(e.target.value)}
                  placeholder="e.g., Dr. Jane Smith"
                  disabled={locked}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Institution Name</label>
                <Input
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="ACESS Platform"
                  disabled={locked}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Course Duration (hours)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={courseDurationHours}
                  onChange={(e) => setCourseDurationHours(Number(e.target.value))}
                  placeholder="e.g., 40"
                  disabled={locked}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Quiz Pass Threshold ({passThreshold}%)
                </label>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={passThreshold}
                  onChange={(e) => setPassThreshold(Number(e.target.value))}
                  disabled={locked}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Skills / Tags (comma separated)
              </label>
              <Input
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="e.g., Accessibility, Inclusive Design, Web Standards"
                disabled={locked}
              />
              {skillsText && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skillsText.split(',').map((s, i) => s.trim() && (
                    <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Warning about locking */}
            {!locked && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">
                  Once this course is published or learners enroll with certification enabled, course structure will be locked.
                  Make sure all settings are correct before publishing.
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-3 pt-4 border-t">
          {enabled && !allowCustom && (
            <>
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                className="border-blue-600 text-blue-600"
              >
                <Eye className="w-4 h-4 mr-2" /> Preview Certificate
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Sample
              </Button>
            </>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || locked}
            className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Eligible Students Custom Upload Section */}
      {allowCustom && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-start gap-4 mb-4 bg-amber-50 p-4 rounded-xl border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900 mb-1">Upload Your Unique Certificate</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Note: The ACESS platform will automatically grant learners a standard system certificate upon completion if you have certification enabled. 
                Use this tool <strong>only</strong> if you wish to upload your own unique custom certificate PDF for specific learners.
              </p>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Eligible Students ({eligibleStudents.length})</h3>
          {eligibleStudents.length === 0 ? (
            <p className="text-sm text-gray-500">No students are eligible for a certificate yet.</p>
          ) : (
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-4 py-3 border-b">Student</th>
                    <th className="px-4 py-3 border-b">Progress</th>
                    <th className="px-4 py-3 border-b text-right">Upload Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {eligibleStudents.map((student) => (
                    <tr key={student.enrollmentId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{student.studentName}</div>
                        <div className="text-xs text-gray-500">{student.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        {student.progressPercent}% ({student.completedLessons}/{student.totalLessons})
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {student.hasCertificate && student.certificateUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => window.open(student.certificateUrl, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          )}
                          <input
                            type="file"
                            id={`cert-upload-${student.enrollmentId}`}
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              setUploadingFor(student.enrollmentId)
                              try {
                                await uploadCustomCertificate(student.enrollmentId, courseId, student.studentId, file)
                                toast.success(`Certificate uploaded for ${student.studentName}`)
                                loadSettings() // Reload to reflect changes
                              } catch (err) {
                                console.error('Certificate upload failed - full details:', err)
                                if (err && typeof err === 'object') {
                                  try { console.error('Stringified:', JSON.stringify(err, Object.getOwnPropertyNames(err))) } catch {}
                                }
                                toast.error('Failed to upload certificate')
                              } finally {
                                setUploadingFor(null)
                                // Reset input
                                e.target.value = ''
                              }
                            }}
                          />
                          <label htmlFor={`cert-upload-${student.enrollmentId}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="cursor-pointer"
                              asChild
                              disabled={uploadingFor === student.enrollmentId}
                            >
                              <span>
                                {uploadingFor === student.enrollmentId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                {student.hasCertificate ? 'Re-upload' : 'Upload'}
                              </span>
                            </Button>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
            <DialogDescription>
              Preview how the certificate will appear using sample learner data
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="bg-white rounded-xl border-2 border-blue-600 p-8 shadow-lg max-w-3xl mx-auto">
              <div className="text-center">
                <div className="mb-4">
                  <Award className="w-12 h-12 text-blue-600 mx-auto" />
                  <p className="text-lg font-bold text-blue-900 mt-2">Certificate of Completion</p>
                  <p className="text-xs text-gray-500">{institutionName || 'ACESS Platform'}</p>
                </div>
                <div className="border-t-2 border-b-2 border-blue-200 py-6 my-4">
                  <p className="text-gray-600 mb-3 text-sm">This certifies that</p>
                  <p className="text-3xl font-bold text-gray-900 mb-3">John Doe</p>
                  <p className="text-gray-600 mb-2 text-sm">has successfully completed</p>
                  <p className="text-xl font-bold text-blue-700">{courseTitle}</p>
                  {courseDurationHours > 0 && (
                    <p className="text-xs text-gray-500 mt-2">{courseDurationHours} hours</p>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-4">
                  <div>
                    <p className="font-semibold text-gray-900">Date</p>
                    <p>{formatDate(new Date().toISOString())}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Code</p>
                    <p className="font-mono">{MOCK_PREVIEW_DATA.certificateCode}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Educator</p>
                    <p>{educatorName || 'Course Educator'}</p>
                  </div>
                </div>
                {skillsText && (
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {skillsText.split(',').map((s, i) => s.trim() && (
                      <Badge key={i} variant="secondary" className="text-[10px]">{s.trim()}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between">
                  <div className="text-center">
                    <div className="w-20 h-0.5 bg-gray-900 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-gray-800">Platform Director</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-0.5 bg-gray-900 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-gray-800">Education Lead</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={handlePreviewDownload} disabled={downloading} className="bg-blue-600 text-white">
              {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download Sample
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
