'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Store, Upload, FileText, CheckCircle2 } from 'lucide-react'

export default function SellerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'info' | 'documents' | 'done'>('info')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{
    shopName: string
    description: string
  }>()

  const submitInfo = async (data: { shopName: string; description: string }) => {
    try {
      await api.post('/seller/apply', data)
      setStep('documents')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit')
    }
  }

  const submitDocuments = async () => {
    if (files.length === 0) { toast.error('Upload at least one document'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      await api.post('/seller/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStep('done')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    }
    setUploading(false)
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Application Submitted!</h2>
            <p className="text-muted-foreground text-sm">
              Your seller application is under review. We'll notify you by email once approved. This usually takes 1-2 business days.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">Back to Shop</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Set Up Your Shop</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 'info' ? 'Tell us about your business' : 'Upload verification documents'}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-1.5 rounded-full ${step === 'info' ? 'bg-primary' : 'bg-primary'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step === 'documents' ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 'info' && (
          <Card>
            <CardHeader><CardTitle>Shop Information</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(submitInfo)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Shop Name *</label>
                  <Input
                    placeholder="e.g. Dushanbe Crafts"
                    {...register('shopName', { required: 'Shop name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
                  />
                  {errors.shopName && <p className="text-xs text-destructive">{errors.shopName.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    rows={3}
                    placeholder="What do you sell? Tell customers about your shop..."
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    {...register('description')}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Continue →'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload documents proving you're a legitimate seller. Accepted: business registration, product photos, invoices, ID. (JPEG, PNG, or PDF — max 10MB each)
              </p>
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload documents</span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      {f.name} <span className="text-xs">({(f.size / 1024).toFixed(0)} KB)</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button className="w-full" onClick={submitDocuments} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Submit Application'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
