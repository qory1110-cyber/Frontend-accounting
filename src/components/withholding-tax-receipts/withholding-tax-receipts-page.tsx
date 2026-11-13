import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, FileCheck, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useWithholdingTaxReceipts, useDeleteWithholdingTaxReceipt } from '@/hooks/use-withholding-tax-receipts'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import {
  WithholdingTaxReceiptFormDialog,
  type WithholdingTaxReceiptFormMode,
} from './withholding-tax-receipt-form-dialog'

interface WithholdingTaxReceipt {
  id: string
  customerId: string
  customerName: string | null
  receiptDate: string
  amount: number
  description: string | null
}

const PAGE_SIZE = 10

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function WithholdingTaxReceiptsPage({ businessId }: { businessId: string }) {
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

  const { data: listData, isLoading } = useWithholdingTaxReceipts(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    dateFrom,
    dateTo,
  })
  const items = listData?.data ?? []
  const pagination = listData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteItem = useDeleteWithholdingTaxReceipt(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<WithholdingTaxReceiptFormMode>('create')
  const [formItem, setFormItem] = useState<WithholdingTaxReceipt | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || !!dateFrom || !!dateTo

  // Total dihitung dari baris yang tampil di halaman ini.
  const pageTotal = items.reduce((sum, i) => sum + i.amount, 0)

  function openForm(mode: WithholdingTaxReceiptFormMode, item: WithholdingTaxReceipt | null) {
    setFormMode(mode)
    setFormItem(item)
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Withholding Tax Receipts</h1>
        {canWrite && (
          <Button size="sm" onClick={() => openForm('create', null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Withholding Tax Receipt
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari pelanggan atau deskripsi..."
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

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <FileCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada Withholding Tax Receipt yang cocok.' : 'Belum ada Withholding Tax Receipt.'}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-lg border bg-background">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{item.customerName ?? '-'}</span>
                <p className="text-xs text-muted-foreground">
                  {item.receiptDate}
                  {item.description && <> · {item.description}</>}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <span className="mr-2 text-sm font-medium">{formatCurrency(item.amount)}</span>
                {canWrite && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openForm('edit', item)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openForm('clone', item)}
                      title="Clone"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => runAction(() => deleteItem.mutateAsync(item.id))}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between bg-muted/30 px-4 py-2 text-sm">
            <span className="text-muted-foreground">
              Total{pagination && pagination.totalPages > 1 ? ' (halaman ini)' : ''}
            </span>
            <span className="mr-2 font-medium">{formatCurrency(pageTotal)}</span>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-1 border-t px-4 py-2 text-xs text-muted-foreground">
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

      <WithholdingTaxReceiptFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        item={formItem}
        mode={formMode}
      />
    </div>
  )
}