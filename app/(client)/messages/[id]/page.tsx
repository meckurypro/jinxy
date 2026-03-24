// app/(client)/messages/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { ChatView } from '@/components/shared/ChatView'

export default function ClientChatPage() {
  const params = useParams()
  const bookingId = params.id as string

  return (
    <ChatView
      bookingId={bookingId}
      backHref="/messages"
      bookingHref={`/jinxes/${bookingId}`}
    />
  )
}
