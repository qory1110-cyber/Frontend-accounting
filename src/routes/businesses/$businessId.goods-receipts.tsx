import { createFileRoute } from '@tanstack/react-router'
import { GoodsReceiptsPage } from '@/components/goods-receipts/goods-receipts-page'

export const Route = createFileRoute('/businesses/$businessId/goods-receipts')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <GoodsReceiptsPage businessId={businessId} />
}
