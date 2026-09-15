import { createFileRoute } from '@tanstack/react-router'
import { useBusiness } from '@/hooks/use-businesses'

export const Route = createFileRoute('/businesses/$businessId/')({
  component: OverviewPage,
})

function OverviewPage() {
  const { businessId } = Route.useParams()
  const { data: business, isLoading } = useBusiness(businessId)

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat...</p>

  return (
    <div>
      <h1 className="text-lg font-semibold">{business?.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Halaman Overview lengkap (grid modul, dsb) menyusul di subtugas berikutnya.
      </p>
    </div>
  )
}