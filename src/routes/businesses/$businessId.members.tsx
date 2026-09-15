import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/businesses/$businessId/members')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId} = Route.useParams()
  return <div><MembersPage businessId={businessId}></MembersPage></div>
}
