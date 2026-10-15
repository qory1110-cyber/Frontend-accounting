import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrdersPage } from '@/components/purchase-orders/purchase-orders-page'

export const Route = createFileRoute('/businesses/$businessId/purchase-orders')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <PurchaseOrdersPage businessId={businessId} />
}   