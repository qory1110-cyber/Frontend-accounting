import { createFileRoute } from '@tanstack/react-router'
import { SalesOrdersPage } from '@/components/sales-orders/sales-orders-page'

export const Route = createFileRoute('/businesses/$businessId/sales-orders')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <SalesOrdersPage businessId={businessId} />
}