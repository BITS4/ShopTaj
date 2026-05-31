'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/api'
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink } from 'lucide-react'

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

export default function AdminSellersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<typeof STATUS_TABS[number]>('PENDING')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: sellers, isLoading } = useQuery({
    queryKey: ['admin-sellers', tab],
    queryFn: async () => {
      const { data } = await api.get('/admin/sellers', { params: tab !== 'ALL' ? { status: tab } : {} })
      return data
    },
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/sellers/${id}/approve`),
    onSuccess: () => { toast.success('Seller approved'); qc.invalidateQueries({ queryKey: ['admin-sellers'] }) },
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/admin/sellers/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Seller rejected')
      setRejectId(null)
      setRejectReason('')
      qc.invalidateQueries({ queryKey: ['admin-sellers'] })
    },
  })

  const statusIcon = (status: string) => {
    if (status === 'APPROVED') return <CheckCircle2 className="h-4 w-4 text-green-600" />
    if (status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-500" />
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Seller Applications</h1>
        <p className="text-muted-foreground text-sm">Review and approve seller registrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!isLoading && sellers?.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No applications found</p>
      )}

      <div className="space-y-4">
        {sellers?.map((seller: any) => (
          <Card key={seller.id}>
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {statusIcon(seller.status)}
                    <h3 className="font-semibold">{seller.shopName}</h3>
                    <span className="text-xs text-muted-foreground">({seller.status})</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{seller.description}</p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <p>Owner: {seller.user.fullName} · {seller.user.email} · {seller.user.phone}</p>
                    <p>Applied: {new Date(seller.createdAt).toLocaleDateString()}</p>
                    {seller.rejectionReason && (
                      <p className="text-red-500">Rejection reason: {seller.rejectionReason}</p>
                    )}
                  </div>
                </div>

                {seller.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => approve.mutate(seller.id)} disabled={approve.isPending}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setRejectId(seller.id)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Documents */}
              {seller.documents?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {seller.documents.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary border rounded-md px-2 py-1 hover:bg-accent transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      Doc {i + 1}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}

              {/* Reject modal inline */}
              {rejectId === seller.id && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                  <p className="text-sm font-medium">Rejection reason (required)</p>
                  <textarea
                    rows={2}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                    placeholder="Explain why this application is rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!rejectReason.trim() || reject.isPending}
                      onClick={() => reject.mutate({ id: seller.id, reason: rejectReason })}
                    >
                      Confirm Reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
