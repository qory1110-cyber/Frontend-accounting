import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  PackageCheck,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useGoodsReceipts, useDeleteGoodsReceipt } from '@/hooks/use-goods-receipts'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { GoodsReceiptFormDialog, type GoodsReceiptFormMode } from './goods-receipt-form-dialog'

interface GoodsReceipt {
  id: string
  supplierId: string
  supplierName: string
  purchaseOrderId: string | null
  purchaseOrderReference: string | null
  purchaseInvoiceId: string | null
  purchaseInvoiceReference: string | null
  receiptDate: string
  reference: string | null
  description: string | null
  totalQty: number
  lines: {
    id: string
    description: string
    qty: string
  }[]
}

const PAGE_SIZE = 10

export function GoodsReceiptsPage({ businessId }: { businessId: string }) {
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

  const { data: receiptsData, isLoading } = useGoodsReceipts(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    dateFrom,
    dateTo,
  })
  const receipts = receiptsData?.data ?? []
  const pagination = receiptsData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteReceipt = useDeleteGoodsReceipt(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<GoodsReceiptFormMode>('create')
  const [formReceipt, setFormReceipt] = useState<GoodsReceipt | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || !!dateFrom || !!dateTo

  function openForm(mode: GoodsReceiptFormMode, receipt: GoodsReceipt | null) {
    setFormMode(mode)
    setFormReceipt(receipt)
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
        <h1 className="text-lg font-semibold">Goods Receipts</h1>
        {canWrite && (
          <Button size="sm" onClick={() => openForm('create', null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Goods Receipt
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari supplier atau reference..."
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

      {!isLoading && receipts.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <PackageCheck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada Goods Receipt yang cocok.' : 'Belum ada Goods Receipt.'}
          </p>
        </div>
      )}

      {receipts.length > 0 && (
        <div className="rounded-lg border bg-background">
          {receipts.map((receipt) => {
            const expanded = expandedId === receipt.id
            return (
              <div key={receipt.id} className="border-b last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{receipt.supplierName}</span>
                      {receipt.reference && (
                        <Badge variant="outline" className="font-mono font-normal">
                          {receipt.reference}
                        </Badge>
                      )}
                      {receipt.purchaseOrderId && (
                        <Badge variant="secondary" className="font-normal">
                          Order: {receipt.purchaseOrderReference || 'tanpa referensi'}
                        </Badge>
                      )}
                      {receipt.purchaseInvoiceId && (
                        <Badge variant="secondary" className="font-normal">
                          Invoice: {receipt.purchaseInvoiceReference || 'tanpa referensi'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {receipt.receiptDate} · {receipt.lines.length} item · Total Qty {receipt.totalQty}
                      {receipt.description && <> · {receipt.description}</>}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedId(expanded ? null : receipt.id)}
                      title={expanded ? 'Tutup rincian' : 'Lihat rincian'}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openForm('edit', receipt)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openForm('clone', receipt)}
                          title="Clone"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => runAction(() => deleteReceipt.mutateAsync(receipt.id))}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <div className="rounded-md border bg-background">
                      <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                        <span>Rincian</span>
                        <span className="text-right">Qty</span>
                      </div>
                      {receipt.lines.map((line) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b px-3 py-2 text-sm last:border-b-0"
                        >
                          <p className="min-w-0 truncate">{line.description}</p>
                          <span className="text-right">{Number(line.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      <GoodsReceiptFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        receipt={formReceipt}
        mode={formMode}
      />
    </div>
  )
}