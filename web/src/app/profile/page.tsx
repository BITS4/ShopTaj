'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Phone } from 'lucide-react'
import { useT } from '@/store/language.store'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function ProfilePage() {
  const qc = useQueryClient()
  const t = useT()
  const [addingAddress, setAddingAddress] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')

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
    onSuccess: () => { toast.success(t.profile.save); qc.invalidateQueries({ queryKey: ['profile'] }) },
  })

  const createAddress = useMutation({
    mutationFn: (data: any) => api.post('/users/me/addresses', data),
    onSuccess: () => { toast.success('Address added'); qc.invalidateQueries({ queryKey: ['addresses'] }); setAddingAddress(false); resetAddr() },
  })

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => { toast.success('Address removed'); qc.invalidateQueries({ queryKey: ['addresses'] }) },
  })

  const sendOtp = useMutation({
    mutationFn: (phone: string) => api.post('/auth/send-phone-otp', { phone }),
    onSuccess: () => { toast.success(t.profile.otp_sent); setOtpSent(true) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send OTP'),
  })

  const verifyOtp = useMutation({
    mutationFn: (otp: string) => api.post('/auth/verify-phone-otp', { otp }),
    onSuccess: () => {
      toast.success(t.profile.phone_verified_toast)
      setOtpSent(false)
      setOtpCode('')
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Invalid code'),
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

      {/* Phone Verification */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t.profile.phone_verification}
            </CardTitle>
            {profile?.isPhoneVerified ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />{t.profile.phone_verified}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3.5 w-3.5" />{t.profile.phone_not_verified}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {profile?.isPhoneVerified ? (
            <p className="text-sm text-muted-foreground">
              {profile.phone} — {t.profile.phone_verified.toLowerCase()}
            </p>
          ) : (
            <div className="space-y-3">
              {!otpSent ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="+992 XXX XXX XXX"
                    defaultValue={profile?.phone ?? ''}
                    id="phone-input"
                    className="max-w-xs"
                  />
                  <Button
                    onClick={() => {
                      const val = (document.getElementById('phone-input') as HTMLInputElement)?.value
                      if (val) sendOtp.mutate(val)
                    }}
                    disabled={sendOtp.isPending}
                  >
                    {sendOtp.isPending ? t.profile.sending_otp : t.profile.send_otp}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t.profile.enter_otp}</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="max-w-[140px] tracking-widest text-center font-mono text-lg"
                    />
                    <Button
                      onClick={() => verifyOtp.mutate(otpCode)}
                      disabled={verifyOtp.isPending || otpCode.length !== 6}
                    >
                      {verifyOtp.isPending ? t.profile.verifying_otp : t.profile.verify_otp}
                    </Button>
                    <Button variant="ghost" onClick={() => { setOtpSent(false); setOtpCode('') }}>
                      {t.profile.resend_otp}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
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
          {addresses?.map((addr: any) => (
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
