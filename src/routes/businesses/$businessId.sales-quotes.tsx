import { createFileRoute } from '@tanstack/react-router'
import { SalesQuotesPage } from '@/components/sales-quotes/sales-quotes-page'

export const Route = createFileRoute('/businesses/$businessId/sales-quotes')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <SalesQuotesPage businessId={businessId} />
}