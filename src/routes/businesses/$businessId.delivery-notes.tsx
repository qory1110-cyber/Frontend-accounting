import { createFileRoute } from '@tanstack/react-router'
import { DeliveryNotesPage } from '@/components/delivery-notes/delivery-notes-page'

export const Route = createFileRoute('/businesses/$businessId/delivery-notes')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <DeliveryNotesPage businessId={businessId} />
}