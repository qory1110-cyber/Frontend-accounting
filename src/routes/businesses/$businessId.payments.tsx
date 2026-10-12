import { createFileRoute } from '@tanstack/react-router'
import { PaymentsPage } from '@/components/payments/payments-page'

export const Route = createFileRoute('/businesses/$businessId/payments')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <PaymentsPage businessId={businessId} />
}