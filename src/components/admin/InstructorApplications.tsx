'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { School, CheckCircle, XCircle, Loader2, Search, MessageSquare, ExternalLink, Clock, User, Mail, Briefcase, Gift } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchInstructorApplications, updateInstructorApplication, getInstructorApplicationStats,
  type InstructorApplication,
} from '@/lib/admin-api'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  request_info: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function InstructorApplications() {
  const [applications, setApplications] = useState<InstructorApplication[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<InstructorApplication | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

  const refetch = useCallback(async () => {
    setLoadError(false)
    try {
      const [apps, appStats] = await Promise.all([
        fetchInstructorApplications(statusFilter),
        getInstructorApplicationStats(),
      ])
      setApplications(apps)
      setStats(appStats)
    } catch {
      setLoadError(true)
      toast.error('Failed to load applications')
    }
  }, [statusFilter])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        await refetch()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refetch])

  const handleAction = async (appId: string, status: 'approved' | 'rejected' | 'request_info') => {
    setActionLoading(true)
    try {
      if (status === 'approved') {
        const res = await fetch('/api/admin/approve-instructor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: appId, admin_notes: adminNotes }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Approval failed')
        toast.success('Application approved! Email sent to applicant.')
      } else {
        await updateInstructorApplication(appId, { status, admin_notes: adminNotes })
        toast.success(`Application ${status} successfully`)
      }
      setApproveDialogOpen(false)
      setRejectDialogOpen(false)
      setSelectedApp(null)
      setAdminNotes('')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${status} application`)
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = applications.filter(a =>
    !search || a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <School className="w-6 h-6 text-purple-600" /> Educator Applications
        </h2>
        <p className="text-sm text-gray-600">Manage educator requests and approvals</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className={`p-4 ${s.bg} border-0`}>
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadError ? (
        <Card className="p-12 text-center">
          <School className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1">Failed to load applications</p>
          <p className="text-gray-500 text-sm mb-4">The database tables may not be set up yet. Ensure the migration has been applied.</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">Retry</Button>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <School className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No educator applications found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <Card key={app.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setSelectedApp(app); setAdminNotes(app.admin_notes || '') }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{app.full_name}</h3>
                    <p className="text-sm text-gray-500">{app.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(app.created_at).toLocaleDateString()}</span>
                      {app.referral_code && (
                        <span className="flex items-center gap-1"><Gift className="w-3 h-3" /> Ref: {app.referral_code}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className={`${statusColors[app.status] || ''} text-xs`}>
                  {app.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!selectedApp && !approveDialogOpen && !rejectDialogOpen} onOpenChange={(o) => { if (!o) setSelectedApp(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Review educator application</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Full Name</label>
                  <p className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> {selectedApp.full_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <p className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {selectedApp.email}</p>
                </div>
              </div>

              {selectedApp.experience && (
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Experience</label>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedApp.experience}</p>
                </div>
              )}

              {selectedApp.reason && (
                <div>
                  <label className="text-xs text-gray-500">Why they want to teach</label>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedApp.reason}</p>
                </div>
              )}

              {selectedApp.portfolio_links && (
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Portfolio</label>
                  <p className="text-sm text-blue-600">{selectedApp.portfolio_links}</p>
                </div>
              )}

              {selectedApp.referral_code && (
                <div>
                  <label className="text-xs text-gray-500 flex items-center gap-1"><Gift className="w-3 h-3" /> Referral Code</label>
                  <Badge variant="outline" className="text-purple-700 border-purple-300">{selectedApp.referral_code}</Badge>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500">Status</label>
                <Badge className={`${statusColors[selectedApp.status] || ''} mt-1`}>{selectedApp.status}</Badge>
              </div>

              <div>
                <label className="text-xs text-gray-500">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {selectedApp.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => { setApproveDialogOpen(true) }}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button
                    onClick={() => { setRejectDialogOpen(true) }}
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>This will activate the educator account and send an email.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to approve <strong>{selectedApp?.full_name}</strong> as an educator?
            An approval email with login instructions will be sent to <strong>{selectedApp?.email}</strong>.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedApp && handleAction(selectedApp.id, 'approved')}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirm Approval
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Rejection</DialogTitle>
            <DialogDescription>This will deny the educator request.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to reject <strong>{selectedApp?.full_name}</strong>&apos;s application?
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedApp && handleAction(selectedApp.id, 'rejected')}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
