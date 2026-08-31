'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

interface CouponFormValues {
  code: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: string
  minOrderValue?: string
  maxUses?: string
  expiresAt?: string
}

interface CouponPayload extends Omit<CouponFormValues, 'discountValue' | 'minOrderValue' | 'maxUses'> {
  discountValue: number
  minOrderValue?: string | number
  maxUses?: string | number
}

interface Coupon {
  id: string
  code: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number | string
  maxUses: number | null
  usedCount: number
  isActive: boolean
  expiresAt: string | null
}

interface ApiError {
  response?: { data?: { message?: string | string[] } }
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as ApiError).response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || fallback
}

export default function AdminCouponsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset } = useForm<CouponFormValues>()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => { const { data } = await api.get<Coupon[]>('/admin/coupons'); return data },
  })

  const create = useMutation({
    mutationFn: (body: CouponPayload) => api.post('/admin/coupons', body),
    onSuccess: () => { toast.success('Coupon created'); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); setShowForm(false); reset() },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Failed to create coupon')),
  })

  const toggle = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/coupons/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  })

  const onSubmit = (data: CouponFormValues) => {
    create.mutate({
      ...data,
      discountValue: Number(data.discountValue),
      minOrderValue: data.minOrderValue ? Number(data.minOrderValue) : data.minOrderValue,
      maxUses: data.maxUses ? Number(data.maxUses) : data.maxUses,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />{showForm ? 'Cancel' : 'New Coupon'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader><CardTitle>Create Coupon</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Code *</label><Input {...register('code', { required: true })} placeholder="SUMMER20" className="uppercase" /></div>
              <div>
                <label className="text-xs font-medium">Discount Type *</label>
                <select className="w-full h-10 border rounded-md px-3 text-sm bg-background" {...register('discountType', { required: true })}>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed ($)</option>
                </select>
              </div>
              <div><label className="text-xs font-medium">Discount Value *</label><Input type="number" step="0.01" {...register('discountValue', { required: true })} /></div>
              <div><label className="text-xs font-medium">Min Order Value</label><Input type="number" step="0.01" {...register('minOrderValue')} /></div>
              <div><label className="text-xs font-medium">Max Uses</label><Input type="number" {...register('maxUses')} /></div>
              <div><label className="text-xs font-medium">Expires At</label><Input type="datetime-local" {...register('expiresAt')} /></div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" disabled={create.isPending}>Create Coupon</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); reset() }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Discount</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Used</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Expires</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => toggle.mutate(c.id)}>
                      {c.isActive ? 'Disable' : 'Enable'}
                    </Button>
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
