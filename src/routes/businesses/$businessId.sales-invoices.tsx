import { createFileRoute } from '@tanstack/react-router'
import { SalesInvoicesPage } from '@/components/sales-invoices/sales-invoices-page'

export const Route = createFileRoute('/businesses/$businessId/sales-invoices')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <SalesInvoicesPage businessId={businessId} />
}