'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { School, Send, Loader2, CheckCircle, Link as LinkIcon, Gift } from 'lucide-react'
import { toast } from 'sonner'

export function InstructorApplicationForm() {
  const [step, setStep] = useState<'form' | 'submitted'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    experience: '',
    reason: '',
    portfolioLinks: '',
    referralCode: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/instructor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          experience: formData.experience,
          reason: formData.reason,
          portfolio_links: formData.portfolioLinks || undefined,
          referral_code: formData.referralCode || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit')
      }
      setStep('submitted')
      toast.success('Application submitted successfully!')
    } catch (err) {
      toast.error('Failed to submit application')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'submitted') {
    return (
      <Card className="p-8 border-2 border-green-200 bg-green-50 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Application Submitted!</h2>
          <p className="text-green-700 mb-4">
            Thank you for your interest in becoming an instructor. Your application has been sent to the admin team for review.
          </p>
          <div className="bg-white rounded-xl p-4 border border-green-200 text-sm text-gray-600 space-y-2">
            <p className="flex items-center gap-2"><ClockIcon className="w-4 h-4 text-green-500" /> You will be notified once your application is reviewed.</p>
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-green-500" /> Check your email for updates.</p>
            <p className="flex items-center gap-2"><School className="w-4 h-4 text-green-500" /> Once approved, you can start creating courses.</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 border-2 border-purple-200 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <School className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Become an Instructor</h2>
          <p className="text-sm text-gray-600">Fill out this form to request instructor access</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Full Name *</label>
            <Input
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Experience & Background</label>
          <Textarea
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            placeholder="Tell us about your teaching experience, subject matter expertise, and any relevant background..."
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Why do you want to teach?</label>
          <Textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="What motivates you to create courses and teach others?"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Portfolio / Social Links</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={formData.portfolioLinks}
              onChange={(e) => setFormData({ ...formData, portfolioLinks: e.target.value })}
              placeholder="https://linkedin.com/in/yourprofile, https://yourportfolio.com"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Referral Code (Optional)</label>
          <div className="relative">
            <Gift className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={formData.referralCode}
              onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
              placeholder="e.g. REF-ABC123"
              className="pl-9"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">What happens next?</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Submit your application</li>
            <li>Admin reviews your request</li>
            <li>You receive an email notification</li>
            <li>Once approved, you can log in and start creating courses</li>
          </ol>
        </div>

        <Button
          type="submit"
          disabled={submitting || !formData.fullName || !formData.email}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
          ) : (
            <><Send className="w-5 h-5 mr-2" /> Submit Application</>
          )}
        </Button>
      </form>
    </Card>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function Mail({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
