'use client'
import { useQuery } from '@tanstack/react-query'
import { Package, Clock, CheckCircle2, XCircle, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Link from 'next/link'

export default function SellerDashboardPage() {
  const router = useRouter()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: async () => { const { data } = await api.get('/seller/profile'); return data },
  })

  const { data: productsData } = useQuery({
    queryKey: ['seller-products'],
    queryFn: async () => { const { data } = await api.get('/seller/products'); return data },
    enabled: profile?.status === 'APPROVED',
  })

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>
  }

  if (!profile) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">You haven't set up your seller profile yet.</p>
        <Button onClick={() => router.push('/seller/onboarding')}>Start Onboarding</Button>
      </div>
    )
  }

  const statusConfig = {
    PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending Review' },
    APPROVED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
    REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
  }
  const s = statusConfig[profile.status as keyof typeof statusConfig]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{profile.shopName}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Seller Dashboard</p>
      </div>

      {/* Status card */}
      <Card className={s.bg}>
        <CardContent className="pt-6 flex items-center gap-4">
          <s.icon className={`h-8 w-8 ${s.color}`} />
          <div>
            <p className={`font-semibold ${s.color}`}>{s.label}</p>
            {profile.status === 'PENDING' && (
              <p className="text-sm text-muted-foreground">Your application is under review. We'll notify you by email.</p>
            )}
            {profile.status === 'REJECTED' && profile.rejectionReason && (
              <p className="text-sm text-muted-foreground">Reason: {profile.rejectionReason}</p>
            )}
            {profile.status === 'APPROVED' && (
              <p className="text-sm text-muted-foreground">Your shop is live. Start adding products!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {profile.status === 'APPROVED' && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Total Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{productsData?.meta?.total ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button asChild>
              <Link href="/seller/products/new">+ Add Product</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/seller/products">View All Products</Link>
            </Button>
          </div>
        </>
      )}

      {profile.status === 'REJECTED' && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Resubmit with updated documents</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => router.push('/seller/onboarding')}>
                Resubmit Application
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {profile.documents?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Submitted Documents</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {profile.documents.map((url: string, i: number) => (
                <li key={i}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Document {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
