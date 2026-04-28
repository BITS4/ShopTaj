'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function ProfilePage() {
  const qc = useQueryClient()
  const [addingAddress, setAddingAddress] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => { const { data } = await api.get('/users/me'); return data },
  })

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => { const { data } = await api.get('/users/me/addresses'); return data },
  })

  const { register: regProfile, handleSubmit: handleProfile } = useForm({ values: profile })
  const { register: regAddr, handleSubmit: handleAddr, reset: resetAddr } = useForm()

  const updateProfile = useMutation({
    mutationFn: (data: any) => api.patch('/users/me', data),
    onSuccess: () => { toast.success('Profile updated'); qc.invalidateQueries({ queryKey: ['profile'] }) },
  })

  const createAddress = useMutation({
    mutationFn: (data: any) => api.post('/users/me/addresses', data),
    onSuccess: () => { toast.success('Address added'); qc.invalidateQueries({ queryKey: ['addresses'] }); setAddingAddress(false); resetAddr() },
  })

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => { toast.success('Address removed'); qc.invalidateQueries({ queryKey: ['addresses'] }) },
  })

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">My Profile</h1>

      {/* Profile Info */}
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleProfile((d) => updateProfile.mutate(d))} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name</label>
                <Input {...regProfile('fullName')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input {...regProfile('phone')} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={profile?.email ?? ''} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Saved Addresses</CardTitle>
            <Button size="sm" onClick={() => setAddingAddress(!addingAddress)}>
              {addingAddress ? 'Cancel' : '+ Add'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingAddress && (
            <form onSubmit={handleAddr((d) => createAddress.mutate(d))} className="border rounded-lg p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium">Label</label><Input {...regAddr('label', { required: true })} placeholder="Home / Work" /></div>
                <div><label className="text-xs font-medium">Street</label><Input {...regAddr('street', { required: true })} /></div>
                <div><label className="text-xs font-medium">City</label><Input {...regAddr('city', { required: true })} /></div>
                <div><label className="text-xs font-medium">State</label><Input {...regAddr('state')} /></div>
                <div><label className="text-xs font-medium">Country</label><Input {...regAddr('country', { required: true })} /></div>
                <div><label className="text-xs font-medium">ZIP</label><Input {...regAddr('zip', { required: true })} /></div>
              </div>
              <Button type="submit" size="sm" disabled={createAddress.isPending}>Add Address</Button>
            </form>
          )}
          {addresses?.map((addr: any) => (
            <div key={addr.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="text-sm">
                <p className="font-semibold">{addr.label} {addr.isDefault && <span className="text-xs text-primary">(Default)</span>}</p>
                <p className="text-muted-foreground">{addr.street}, {addr.city}, {addr.country} {addr.zip}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteAddress.mutate(addr.id)}>Remove</Button>
            </div>
          ))}
          {!addresses?.length && !addingAddress && (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
