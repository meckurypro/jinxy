import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)}m away`
  return `${(meters / 1000).toFixed(1)}km away`
}

export function formatDuration(hours: number) {
  if (hours < 1) return `${hours * 60} mins`
  if (hours === 1) return '1 hr'
  if (hours < 24) return `${hours} hrs`
  if (hours === 24) return '1 day'
  if (hours === 48) return '2 days'
  return `${hours / 24} days`
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateAge(dob: string | Date) {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

export function getTierColor(tier: string) {
  const colors: Record<string, string> = {
    ruby: '#E53935',
    emerald: '#43A047',
    gold: '#FFB300',
    platinum: '#7E57C2',
    topaz: '#FF7043',
    diamond: '#29B6F6',
  }
  return colors[tier] ?? '#999'
}

export function getTierHours(tier: string) {
  const hours: Record<string, number> = {
    ruby: 1,
    emerald: 3,
    gold: 6,
    platinum: 12,
    topaz: 24,
    diamond: 48,
  }
  return hours[tier] ?? 1
}

export function getTierDiscount(tier: string) {
  const discounts: Record<string, number> = {
    ruby: 0,
    emerald: 0,
    gold: 5,
    platinum: 7,
    topaz: 10,
    diamond: 10,
  }
  return discounts[tier] ?? 0
}

export function calculateTierPrice(hourlyRate: number, tier: string) {
  const hours = getTierHours(tier)
  const discount = getTierDiscount(tier)
  const base = hourlyRate * hours
  return base * (1 - discount / 100)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
