'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SellerPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/seller/dashboard')
  }, [router])
  return null
}
