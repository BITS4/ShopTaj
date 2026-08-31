'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatDateTime } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

interface AdminOrder {
  id: string
  totalAmount: number | string
  createdAt: string
  status: string
  paymentStatus: string
  items?: unknown[]
  user?: { fullName: string; email: string } | null
}

interface OrdersResponse {
  data: AdminOrder[]
  meta: { total: number; page: number; limit: number }
}

interface ApiError {
  response?: { data?: { message?: string | string[] } }
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as ApiError).response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || fallback
}

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-orders', filter],
    queryFn: async () => {
      const params = filter ? `?status=${filter}` : ''
      const { data } = await api.get<OrdersResponse>(`/admin/orders${params}`)
      return data
    },
    retry: 1,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })

  const confirmPayment = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/orders/${id}/payment`, { paymentStatus: 'PAID' }),
    onSuccess: () => {
      toast.success('Payment confirmed!')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Failed')),
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Button size="sm" variant={!filter ? 'default' : 'outline'} onClick={() => setFilter('')}>
          All
        </Button>
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <p className="font-medium text-destructive">Failed to load orders</p>
          <p className="text-sm mt-1">Make sure you are logged in as admin@shoptaj.com</p>
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          No orders found
        </div>
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
              {data?.data.map((order) => (
                <tr key={order.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">
                    {order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {order.user?.fullName}
                    <br />
                    <span className="text-muted-foreground text-xs">{order.user?.email}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(order.totalAmount)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      className="text-xs border rounded px-2 py-1 bg-background"
                      onChange={(e) =>
                        updateStatus.mutate({ id: order.id, status: e.target.value })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>{order.items?.length} items</div>
                    {order.paymentStatus === 'UNPAID' && (
                      <button
                        className="mt-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700"
                        onClick={() => confirmPayment.mutate(order.id)}
                      >
                        ✓ Mark Paid
                      </button>
                    )}
                    {order.paymentStatus === 'PAID' && (
                      <span className="text-green-600 font-medium">✓ Paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
