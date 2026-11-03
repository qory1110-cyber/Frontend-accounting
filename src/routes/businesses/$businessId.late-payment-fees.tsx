import { createFileRoute } from '@tanstack/react-router'
import { LatePaymentFeesPage } from '@/components/late-payment-fees/late-payment-fees-page'

export const Route = createFileRoute('/businesses/$businessId/late-payment-fees')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <LatePaymentFeesPage businessId={businessId} />
}