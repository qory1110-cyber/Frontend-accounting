import { createFileRoute } from '@tanstack/react-router'
import { ReceiptsPage } from '@/components/receipts/receipts-page'

export const Route = createFileRoute('/businesses/$businessId/receipts')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <ReceiptsPage businessId={businessId} />
}