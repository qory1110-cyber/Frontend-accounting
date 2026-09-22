import { createFileRoute } from '@tanstack/react-router'
import { CustomersPage } from '@/components/customers/customers-page'

export const Route = createFileRoute('/businesses/$businessId/customers')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <CustomersPage businessId={businessId} />
}