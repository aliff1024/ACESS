'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { MessageSquare, Search, Mail, Clock, Loader2, Reply } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchContactMessages, updateContactMessageStatus, getContactStats,
  type ContactMessage,
} from '@/lib/admin-api'

const categoryLabels: Record<string, string> = {
  general: 'General Inquiry',
  technical: 'Technical Support',
  instructor_application: 'Educator Application',
  accessibility: 'Accessibility Support',
  feedback: 'Feedback / Suggestions',
}

const categoryColors: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  technical: 'bg-red-100 text-red-800',
  instructor_application: 'bg-purple-100 text-purple-800',
  accessibility: 'bg-green-100 text-green-800',
  feedback: 'bg-amber-100 text-amber-800',
}

export function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [stats, setStats] = useState({ total: 0, unread: 0, categories: {} as Record<string, number> })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedMsg, setSelectedMsg] = useState<ContactMessage | null>(null)

  const refetch = useCallback(async () => {
    setLoadError(false)
    setLoading(true)
    try {
      const [msgs, msgStats] = await Promise.all([
        fetchContactMessages(statusFilter),
        getContactStats(),
      ])
      setMessages(msgs)
      setStats(msgStats)
    } catch {
      setLoadError(true)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { refetch() }, [refetch])

  const handleMarkRead = async (id: string) => {
    try {
      await updateContactMessageStatus(id, 'read')
      refetch()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const filtered = messages.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" /> Contact Messages
        </h2>
        <p className="text-sm text-gray-600">Manage inquiries and support requests</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-blue-50 border-0">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
        </Card>
        <Card className="p-3 bg-amber-50 border-0">
          <p className="text-xs text-gray-600">Unread</p>
          <p className="text-2xl font-bold text-amber-700">{stats.unread}</p>
        </Card>
        {Object.entries(stats.categories || {}).slice(0, 4).map(([cat, count]) => (
          <Card key={cat} className="p-3 bg-gray-50 border-0">
            <p className="text-xs text-gray-600 truncate">{categoryLabels[cat] || cat}</p>
            <p className="text-2xl font-bold text-gray-700">{count as number}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadError ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1">Failed to load messages</p>
          <p className="text-gray-500 text-sm mb-4">The database tables may not be set up yet. Ensure the migration has been applied.</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">Retry</Button>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No messages found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(msg => (
            <Card key={msg.id} className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${msg.status === 'unread' ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''}`}
              onClick={() => { setSelectedMsg(msg); if (msg.status === 'unread') handleMarkRead(msg.id) }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{msg.name}</span>
                    <Badge className={`${categoryColors[msg.category] || ''} text-[10px] px-1.5`}>
                      {categoryLabels[msg.category] || msg.category}
                    </Badge>
                    {msg.status === 'unread' && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-700 truncate">{msg.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {msg.email}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(msg.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">{msg.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedMsg} onOpenChange={(o) => { if (!o) setSelectedMsg(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMsg?.subject}</DialogTitle>
            <DialogDescription>From {selectedMsg?.name} ({selectedMsg?.email})</DialogDescription>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={categoryColors[selectedMsg.category]}>{categoryLabels[selectedMsg.category] || selectedMsg.category}</Badge>
                <Badge variant="outline">{selectedMsg.status}</Badge>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {selectedMsg.message}
              </div>
              <div className="text-xs text-gray-400">
                Sent {new Date(selectedMsg.created_at).toLocaleString()}
              </div>
              <div className="flex gap-2">
                {selectedMsg.status !== 'replied' && (
                  <Button onClick={() => { updateContactMessageStatus(selectedMsg.id, 'replied').then(() => refetch()); setSelectedMsg(null) }}
                    className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Reply className="w-4 h-4 mr-2" /> Mark as Replied
                  </Button>
                )}
                <a href={`mailto:${selectedMsg.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                  <Mail className="w-4 h-4" /> Reply via Email
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
