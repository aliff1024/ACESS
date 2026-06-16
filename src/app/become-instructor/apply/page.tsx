'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { InstructorApplicationForm } from '@/components/educator/InstructorApplicationForm'
import { Navbar } from '@/components/figma/Navbar'
import { Footer } from '@/components/figma/Footer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchMyApplication } from '@/lib/educator-api'

export default function BecomeInstructorApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const existing = await fetchMyApplication()
          if (existing) {
            setExistingStatus(existing.status)
          }
        }
      } catch (err) {
        console.error('Failed to check application:', err)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-6 py-20">
          <Card className="p-8 max-w-lg w-full border-2 border-red-200 bg-red-50 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 mb-2">Error</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={() => router.push('/become-instructor')} variant="outline">
              Back to Instructor Info
            </Button>
          </Card>
        </div>
      )
    }

    if (existingStatus === 'pending') {
      return (
        <div className="flex items-center justify-center p-6 py-20">
          <Card className="p-8 max-w-lg w-full border-2 border-amber-200 bg-amber-50 text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-amber-800 mb-2">Application Pending</h2>
            <p className="text-amber-700 mb-4">
              You have already submitted an instructor application. It is currently being reviewed by the admin team.
              You will be notified once a decision is made.
            </p>
            <Button onClick={() => router.push('/become-instructor')} variant="outline">
              Back to Instructor Info
            </Button>
          </Card>
        </div>
      )
    }

    if (existingStatus === 'approved') {
      return (
        <div className="flex items-center justify-center p-6 py-20">
          <Card className="p-8 max-w-lg w-full border-2 border-green-200 bg-green-50 text-center">
            <AlertCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Already Approved</h2>
            <p className="text-green-700 mb-4">
              Your instructor application has been approved! You can now access the educator dashboard.
            </p>
            <Button onClick={() => router.push('/educator')} className="bg-green-600 hover:bg-green-700 text-white">
              Go to Educator Dashboard
            </Button>
          </Card>
        </div>
      )
    }

    return (
      <div className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Become an Instructor</h1>
            <p className="text-gray-600">
              Share your knowledge and create accessible learning experiences for everyone.
            </p>
          </div>
          <InstructorApplicationForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar onTryDemo={() => router.push('/login')} />
      {renderContent()}
      <Footer />
    </div>
  )
}
