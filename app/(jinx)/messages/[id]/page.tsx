// app/(jinx)/messages/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ChatView } from '@/components/shared/ChatView'

export default function JinxChatPage() {
  const params = useParams()
  const bookingId = params.id as string

  return (
    <ChatView
      bookingId={bookingId}
      backHref="/jinx/inbox"
      bookingHref={`/jinx/bookings/${bookingId}`}
    />
  )
}
