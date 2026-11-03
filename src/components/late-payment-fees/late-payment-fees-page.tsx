import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, ClipboardList, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useLatePaymentFees, useDeleteLatePaymentFee } from '@/hooks/use-late-payment-fees'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { LatePaymentFeeFormDialog, type LatePaymentFeeFormMode } from './late-payment-fee-form-dialog'

interface LatePaymentFee {
  id: string
  customerId: string
  customerName: string
  salesInvoiceId: string
  salesInvoiceReference: string | null
  salesInvoiceDate: string
  feeDate: string
  amount: number
}

const PAGE_SIZE = 10

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function LatePaymentFeesPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Tunda pencarian 300 ms supaya tidak memanggil API di setiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: feesData, isLoading } = useLatePaymentFees(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    dateFrom,
    dateTo,
  })
  const fees = feesData?.data ?? []
  const pagination = feesData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteFee = useDeleteLatePaymentFee(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<LatePaymentFeeFormMode>('create')
  const [formFee, setFormFee] = useState<LatePaymentFee | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || !!dateFrom || !!dateTo

  function openForm(mode: LatePaymentFeeFormMode, fee: LatePaymentFee | null) {
    setFormMode(mode)
    setFormFee(fee)
    setFormOpen(true)
  }

  function clearFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function runAction(action: () => Promise<unknown>) {
    setActionError(null)
    action().catch((err) => setActionError(getApiErrorMessage(err, 'Aksi gagal dijalankan')))
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Late Payment Fees</h1>
        {canWrite && (
          <Button size="sm" onClick={() => openForm('create', null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Late Payment Fee
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari pelanggan atau reference faktur..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="min-w-60 flex-1"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="w-40"
          title="Dari tanggal"
        />
        <span className="text-xs text-muted-foreground">s/d</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          className="w-40"
          title="Sampai tanggal"
        />
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && fees.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada Late Payment Fee yang cocok.' : 'Belum ada Late Payment Fee.'}
          </p>
        </div>
      )}

      {fees.length > 0 && (
        <div className="rounded-lg border bg-background">
          {fees.map((fee) => (
            <div key={fee.id} className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{fee.customerName}</span>
                  <Badge variant="outline" className="font-mono font-normal">
                    {fee.salesInvoiceReference || `Faktur ${fee.salesInvoiceDate}`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fee.feeDate} · Faktur terbit {fee.salesInvoiceDate} · Denda:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(fee.amount)}</span>
                </p>
              </div>

              {canWrite && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openForm('edit', fee)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => runAction(() => deleteFee.mutateAsync(fee.id))}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-1 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <span>
                Halaman {pagination.currentPage} dari {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <LatePaymentFeeFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        fee={formFee}
        mode={formMode}
      />
    </div>
  )
}