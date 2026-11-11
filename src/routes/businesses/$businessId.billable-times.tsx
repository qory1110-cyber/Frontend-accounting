import { createFileRoute } from '@tanstack/react-router'
import { BillableTimesPage } from '@/components/billable-times/billable-times-page'

export const Route = createFileRoute('/businesses/$businessId/billable-times')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <BillableTimesPage businessId={businessId} />
}