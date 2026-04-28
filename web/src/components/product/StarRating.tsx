import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { rating: number; max?: number; size?: number; className?: string }

export default function StarRating({ rating, max = 5, size = 16, className }: Props) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}
        />
      ))}
    </div>
  )
}
