import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  ClipboardList,
  Pencil,
  Trash2,
  Copy,
  FileInput,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { usePurchaseOrders, useDeletePurchaseOrder } from '@/hooks/use-purchase-orders'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { PurchaseOrderFormDialog, type PurchaseOrderFormMode } from './purchase-order-form-dialog'
import { PurchaseInvoiceFormDialog } from '@/components/purchase-invoices/purchase-invoice-form-dialog'

interface PurchaseOrder {
  id: string
  supplierId: string
  supplierName: string
  orderDate: string
  reference: string | null
  billingAddress: string | null
  description: string | null
  lines: {
    id: string
    accountId: string
    accountName: string
    description: string | null
    qty: string
    unitPrice: string
    subtotal: number
    qtyInvoiced: number
  }[]
  totalAmount: number
  status: 'Unbilled' | 'Partially Invoiced' | 'Invoiced'
  hasInvoices: boolean
}

const PAGE_SIZE = 10

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function StatusBadge({ status }: { status: PurchaseOrder['status'] }) {
  if (status === 'Invoiced') {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Invoiced</Badge>
  }
  if (status === 'Partially Invoiced') {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">Partially Invoiced</Badge>
  }
  return <Badge variant="secondary">Unbilled</Badge>
}

export function PurchaseOrdersPage({ businessId }: { businessId: string }) {
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

  const { data: ordersData, isLoading } = usePurchaseOrders(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    dateFrom,
    dateTo,
  })
  const orders = ordersData?.data ?? []
  const pagination = ordersData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteOrder = useDeletePurchaseOrder(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<PurchaseOrderFormMode>('create')
  const [formOrder, setFormOrder] = useState<PurchaseOrder | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [invoiceSourceOrder, setInvoiceSourceOrder] = useState<PurchaseOrder | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || !!dateFrom || !!dateTo

  function openForm(mode: PurchaseOrderFormMode, order: PurchaseOrder | null) {
    setFormMode(mode)
    setFormOrder(order)
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
        <h1 className="text-lg font-semibold">Purchase Orders</h1>
        {canWrite && (
          <Button size="sm" onClick={() => openForm('create', null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Purchase Order
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari pemasok, reference, atau deskripsi..."
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

      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada Purchase Order yang cocok.' : 'Belum ada Purchase Order.'}
          </p>
        </div>
      )}

      {orders.length > 0 && (
        <div className="rounded-lg border bg-background">
          {orders.map((order) => {
            const expanded = expandedId === order.id
            return (
              <div key={order.id} className="border-b last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{order.supplierName}</span>
                      {order.reference && (
                        <Badge variant="outline" className="font-mono font-normal">
                          {order.reference}
                        </Badge>
                      )}
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.orderDate} · Total:{' '}
                      <span className="font-medium text-foreground">{formatCurrency(order.totalAmount)}</span>
                      {order.description && <> · {order.description}</>}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedId(expanded ? null : order.id)}
                      title={expanded ? 'Tutup rincian' : 'Lihat rincian'}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {canWrite && (
                                            <>
                        {order.status !== 'Invoiced' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setInvoiceSourceOrder(order)}
                            title="Copy to Purchase Invoice"
                          >
                            <FileInput className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openForm('edit', order)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openForm('clone', order)}
                          title="Clone"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!order.hasInvoices && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => runAction(() => deleteOrder.mutateAsync(order.id))}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    {order.billingAddress && (
                      <p className="mb-2 text-xs text-muted-foreground">Billing Address: {order.billingAddress}</p>
                    )}
                    <div className="rounded-md border bg-background">
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                        <span>Rincian</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Invoiced</span>
                        <span className="text-right">Subtotal</span>
                      </div>
                      {order.lines.map((line) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b px-3 py-2 text-sm last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate">{line.description || line.accountName}</p>
                            <p className="text-xs text-muted-foreground">
                              {line.accountName} · {formatCurrency(Number(line.unitPrice))}
                            </p>
                          </div>
                          <span className="text-right">{Number(line.qty)}</span>
                          <span className="text-right">{line.qtyInvoiced}</span>
                          <span className="text-right">{formatCurrency(line.subtotal)}</span>
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

      <PurchaseOrderFormDialog
        businessId={businessId}
        open={formOpen} 
        onOpenChange={setFormOpen}
        order={formOrder}
                mode={formMode}
      />
      <PurchaseInvoiceFormDialog
        businessId={businessId}
        open={!!invoiceSourceOrder}
        onOpenChange={(open) => !open && setInvoiceSourceOrder(null)}
        sourceOrder={invoiceSourceOrder}
      />
    </div>
  )
}