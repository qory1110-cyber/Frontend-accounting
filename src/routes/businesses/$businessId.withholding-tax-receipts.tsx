import { createFileRoute } from '@tanstack/react-router'
import { WithholdingTaxReceiptsPage } from '@/components/withholding-tax-receipts/withholding-tax-receipts-page'

export const Route = createFileRoute('/businesses/$businessId/withholding-tax-receipts')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <WithholdingTaxReceiptsPage businessId={businessId} />
}
