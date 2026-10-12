import { createFileRoute } from '@tanstack/react-router'
import { PurchaseInvoicesPage } from '@/components/purchase-invoices/purchase-invoices-page'

export const Route = createFileRoute('/businesses/$businessId/purchase-invoices')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <PurchaseInvoicesPage businessId={businessId} />
}