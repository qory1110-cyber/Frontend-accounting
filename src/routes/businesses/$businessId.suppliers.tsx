import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/components/suppliers/suppliers-page'

export const Route = createFileRoute('/businesses/$businessId/suppliers')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <SuppliersPage businessId={businessId} />
}