import { createFileRoute } from '@tanstack/react-router'
import { MembersPage } from '@/components/business/members-page'

export const Route = createFileRoute('/businesses/$businessId/members')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <MembersPage businessId={businessId} />
}