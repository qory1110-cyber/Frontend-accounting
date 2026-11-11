import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Timer, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, X, FileText } from 'lucide-react'
import {
  useBillableTimes,
  useDeleteBillableTime,
  useInvoiceBillableTimes,
  type BillableTimeStatus,
} from '@/hooks/use-billable-times'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { BillableTimeFormDialog, type BillableTimeFormMode } from './billable-time-form-dialog'

interface BillableTime {
  id: string
  customerId: string | null
  customerName: string | null
  workDate: string
  description: string | null
  hourlyRate: number
  hours: number
  minutes: number
  amount: number
  status: BillableTimeStatus
  writtenOffDate: string | null
  salesInvoiceId: string | null
}

const PAGE_SIZE = 10

const STATUS_LABEL: Record<BillableTimeStatus, string> = {
  uninvoiced: 'Uninvoiced',
  invoiced: 'Invoiced',
  written_off: 'Written-off',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function BillableTimesPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<BillableTimeStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Tunda pencarian 300 ms supaya tidak memanggil API di setiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: listData, isLoading } = useBillableTimes(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    status,
    dateFrom,
    dateTo,
  })
  const items = listData?.data ?? []
  const pagination = listData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteItem = useDeleteBillableTime(businessId)
  const invoiceItems = useInvoiceBillableTimes(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<BillableTimeFormMode>('create')
  const [formItem, setFormItem] = useState<BillableTime | null>(null)
  const [selected, setSelected] = useState<BillableTime[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || !!status || !!dateFrom || !!dateTo

  // Penagihan hanya bisa untuk satu pelanggan sekaligus.
  const selectedCustomerIds = new Set(selected.map((s) => s.customerId))
  const canInvoice = selected.length > 0 && selectedCustomerIds.size === 1 && !selectedCustomerIds.has(null)

  function openForm(mode: BillableTimeFormMode, item: BillableTime | null) {
    setFormMode(mode)
    setFormItem(item)
    setFormOpen(true)
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function toggleSelect(item: BillableTime) {
    setSelected((prev) => (prev.some((s) => s.id === item.id) ? prev.filter((s) => s.id !== item.id) : [...prev, item]))
  }

  function runAction(action: () => Promise<unknown>) {
    setActionError(null)
    setSuccessMessage(null)
    action().catch((err) => setActionError(getApiErrorMessage(err, 'Aksi gagal dijalankan')))
  }

  function createInvoice() {
    if (!canInvoice) return
    const customerId = selected[0].customerId!
    runAction(async () => {
      const result = await invoiceItems.mutateAsync({ customerId, billableTimeIds: selected.map((s) => s.id) })
      setSelected([])
      setSuccessMessage(
        `Sales Invoice dibuat dari ${result.billableTimeCount} Billable Time, total ${formatCurrency(result.invoiceAmount)}.`,
      )
    })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Billable Time</h1>
        {canWrite && (
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <Button size="sm" variant="outline" disabled={!canInvoice || invoiceItems.isPending} onClick={createInvoice}>
                <FileText className="mr-1.5 h-4 w-4" />
                New Sales Invoice ({selected.length})
              </Button>
            )}
            <Button size="sm" onClick={() => openForm('create', null)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Billable Time
            </Button>
          </div>
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
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BillableTimeStatus | '')
            setPage(1)
          }}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          title="Status"
        >
          <option value="">Semua status</option>
          <option value="uninvoiced">Uninvoiced</option>
          <option value="invoiced">Invoiced</option>
          <option value="written_off">Written-off</option>
        </select>
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

      {selected.length > 0 && !canInvoice && (
        <Alert className="mb-4">
          <AlertDescription>
            Untuk membuat Sales Invoice, pilih Billable Time milik satu pelanggan yang sama (dan pelanggan harus terisi).
          </AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-4">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <Timer className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada Billable Time yang cocok.' : 'Belum ada Billable Time.'}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-lg border bg-background">
          {items.map((item) => {
            const isUninvoiced = item.status === 'uninvoiced'
            return (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {canWrite && (
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={!isUninvoiced}
                      checked={selected.some((s) => s.id === item.id)}
                      onChange={() => toggleSelect(item)}
                      title={isUninvoiced ? 'Pilih untuk ditagihkan' : 'Hanya Uninvoiced yang bisa ditagihkan'}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.customerName ?? 'Tanpa pelanggan'}</span>
                      <Badge variant={item.status === 'uninvoiced' ? 'default' : 'secondary'} className="font-normal">
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.workDate} · {item.hours}j {item.minutes}m × {formatCurrency(item.hourlyRate)}
                      {item.description && <> · {item.description}</>}
                      {item.writtenOffDate && <> · dihapuskan {item.writtenOffDate}</>}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-2 text-sm font-medium">{formatCurrency(item.amount)}</span>
                  {canWrite && (
                    <>
                      {isUninvoiced && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openForm('edit', item)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openForm('clone', item)}
                        title="Clone"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {item.status !== 'invoiced' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            runAction(async () => {
                              await deleteItem.mutateAsync(item.id)
                              setSelected((prev) => prev.filter((s) => s.id !== item.id))
                            })
                          }
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

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

      <BillableTimeFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        item={formItem}
        mode={formMode}
      />
    </div>
  )
}