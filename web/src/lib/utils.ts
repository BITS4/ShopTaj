import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

export function truncate(str: string, len = 80) {
  return str.length > len ? str.slice(0, len) + '…' : str
}
