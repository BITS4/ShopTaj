'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useT } from '@/store/language.store'
import { toast } from 'sonner'
import api from '@/lib/api'

interface ProfileResponse {
  id: string
  email: string
  fullName: string
  phone: string | null
}

interface ProfileFormValues {
  fullName: string
  phone: string
}

interface AddressFormValues {
  label: string
  street: string
  houseNumber?: string
  apartment?: string
  city: string
  state?: string
  country: string
  zip?: string
}

interface ProfileAddress extends AddressFormValues {
  id: string
  isDefault: boolean
}

export default function ProfilePage() {
  const qc = useQueryClient()
  const t = useT()
  const [addingAddress, setAddingAddress] = useState(false)

  const { data: profile } = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: async () => { const { data } = await api.get<ProfileResponse>('/users/me'); return data },
  })

  const { data: addresses } = useQuery<ProfileAddress[]>({
    queryKey: ['addresses'],
    queryFn: async () => { const { data } = await api.get<ProfileAddress[]>('/users/me/addresses'); return data },
  })

  const { register: regProfile, handleSubmit: handleProfile } = useForm<ProfileFormValues>({
    values: profile ? { fullName: profile.fullName, phone: profile.phone ?? '' } : undefined,
  })
  const { register: regAddr, handleSubmit: handleAddr, reset: resetAddr } = useForm<AddressFormValues>()

  const updateProfile = useMutation({
    mutationFn: (data: ProfileFormValues) => api.patch('/users/me', data),
    onSuccess: () => { toast.success(t.profile.save); qc.invalidateQueries({ queryKey: ['profile'] }) },
  })

  const createAddress = useMutation({
    mutationFn: (data: AddressFormValues) => api.post('/users/me/addresses', data),
    onSuccess: () => { toast.success('Address added'); qc.invalidateQueries({ queryKey: ['addresses'] }); setAddingAddress(false); resetAddr() },
  })

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => { toast.success('Address removed'); qc.invalidateQueries({ queryKey: ['addresses'] }) },
  })

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">{t.profile.title}</h1>

      <Card>
        <CardHeader><CardTitle>{t.profile.personal_info}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleProfile((d) => updateProfile.mutate(d))} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t.profile.full_name}</label>
                <Input {...regProfile('fullName')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t.profile.phone}</label>
                <Input {...regProfile('phone')} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.profile.email}</label>
              <Input value={profile?.email ?? ''} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">{t.profile.email_note}</p>
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? t.profile.saving : t.profile.save}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.profile.addresses}</CardTitle>
            <Button size="sm" onClick={() => setAddingAddress(!addingAddress)}>
              {addingAddress ? t.profile.cancel : t.profile.add_address}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingAddress && (
            <form onSubmit={handleAddr((d) => createAddress.mutate(d))} className="border rounded-lg p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium">{t.profile.label}</label><Input {...regAddr('label', { required: true })} placeholder="Home / Work / Office" /></div>
                <div><label className="text-xs font-medium">{t.profile.street} *</label><Input {...regAddr('street', { required: true })} placeholder="Street name" /></div>
                <div><label className="text-xs font-medium">House / Building No.</label><Input {...regAddr('houseNumber')} placeholder="e.g. 25, 12A" /></div>
                <div><label className="text-xs font-medium">Apartment / Floor</label><Input {...regAddr('apartment')} placeholder="e.g. Apt 3, Floor 2" /></div>
                <div><label className="text-xs font-medium">{t.profile.city} *</label><Input {...regAddr('city', { required: true })} /></div>
                <div><label className="text-xs font-medium">{t.profile.state}</label><Input {...regAddr('state')} placeholder="District / Region" /></div>
                <div><label className="text-xs font-medium">{t.profile.country} *</label><Input {...regAddr('country', { required: true })} defaultValue="Tajikistan" /></div>
                <div><label className="text-xs font-medium">{t.profile.zip}</label><Input {...regAddr('zip')} placeholder="e.g. 734000" /></div>
              </div>
              <Button type="submit" size="sm" disabled={createAddress.isPending}>{t.profile.add_btn}</Button>
            </form>
          )}
          {addresses?.map((addr) => (
            <div key={addr.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="text-sm">
                <p className="font-semibold">{addr.label} {addr.isDefault && <span className="text-xs text-primary">({t.profile.default})</span>}</p>
                <p className="text-muted-foreground text-xs">
                  {[addr.street, addr.houseNumber, addr.apartment].filter(Boolean).join(', ')}
                  {addr.houseNumber || addr.street ? ' — ' : ''}{addr.city}{addr.state ? `, ${addr.state}` : ''}, {addr.country} {addr.zip}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteAddress.mutate(addr.id)}>{t.profile.remove}</Button>
            </div>
          ))}
          {!addresses?.length && !addingAddress && (
            <p className="text-sm text-muted-foreground">{t.profile.no_addresses}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
