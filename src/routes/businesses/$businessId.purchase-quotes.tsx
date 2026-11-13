import { createFileRoute } from '@tanstack/react-router'
import { PurchaseQuotesPage } from '@/components/purchase-quotes/purchase-quotes-page'

export const Route = createFileRoute('/businesses/$businessId/purchase-quotes')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <PurchaseQuotesPage businessId={businessId} />
}
