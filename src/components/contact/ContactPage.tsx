'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Mail, MessageSquare, Send, Loader2, CheckCircle, HelpCircle, Bug, School, Accessibility, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { submitContactMessage } from '@/lib/educator-api'

const categories = [
  { value: 'general', label: 'General Inquiry', icon: HelpCircle },
  { value: 'technical', label: 'Technical Support', icon: Bug },
  { value: 'instructor_application', label: 'Instructor Application', icon: School },
  { value: 'accessibility', label: 'Accessibility Support', icon: Accessibility },
  { value: 'feedback', label: 'Feedback / Suggestions', icon: Lightbulb },
]

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'general',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitContactMessage(form)
      setSubmitted(true)
      toast.success('Message sent successfully!')
    } catch (err) {
      toast.error('Failed to send message')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="p-8 max-w-lg w-full text-center border-2 border-green-200 bg-green-50">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Message Sent!</h2>
          <p className="text-green-700 mb-4">
            Thank you for reaching out. We will get back to you as soon as possible.
          </p>
          <Button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', category: 'general', subject: '', message: '' }) }}>
            Send Another Message
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact Us</h1>
          <p className="text-gray-600 text-lg">
            Have a question, need help, or want to become an instructor? We are here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {categories.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, category: value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.category === value
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                form.category === value ? 'bg-blue-600' : 'bg-gray-100'
              }`}>
                <Icon className={`w-5 h-5 ${form.category === value ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <p className={`text-sm font-semibold ${form.category === value ? 'text-blue-700' : 'text-gray-900'}`}>
                {label}
              </p>
            </button>
          ))}
        </div>

        <Card className="p-8 border-2 border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Subject *</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="What is this about?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Message *</label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us more about your inquiry..."
                rows={6}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !form.name || !form.email || !form.subject || !form.message}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" /> Send Message</>
              )}
            </Button>
          </form>
        </Card>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <Mail className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Email</p>
            <p className="text-xs text-gray-500">support@acess.edu</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <HelpCircle className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Response Time</p>
            <p className="text-xs text-gray-500">Within 24-48 hours</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <Accessibility className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Accessibility</p>
            <p className="text-xs text-gray-500">We support all users</p>
          </div>
        </div>
      </div>
    </div>
  )
}
