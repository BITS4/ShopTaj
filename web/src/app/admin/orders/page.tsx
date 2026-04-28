'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatDate } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filter],
    queryFn: async () => {
      const params = filter ? `?status=${filter}` : ''
      const { data } = await api.get(`/admin/orders${params}`)
      return data
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['admin-orders'] }) },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Button size="sm" variant={!filter ? 'default' : 'outline'} onClick={() => setFilter('')}>All</Button>
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Order ID</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.data.map((order: any) => (
                <tr key={order.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{order.user?.fullName}<br /><span className="text-muted-foreground text-xs">{order.user?.email}</span></td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(order.totalAmount)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      className="text-xs border rounded px-2 py-1 bg-background"
                      onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{order.items?.length} items</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
