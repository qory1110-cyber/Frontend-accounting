import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, FileText, Check, Ban, Pencil, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  usePurchaseInvoices,
  usePurchaseInvoiceTotals,
  useApprovePurchaseInvoice,
  useVoidPurchaseInvoice,
  useDeletePurchaseInvoice,
} from '@/hooks/use-purchase-invoices'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { PurchaseInvoiceFormDialog } from './purchase-invoice-form-dialog'
import { PurchaseInvoiceViewDialog } from './purchase-invoice-view-dialog'

interface PurchaseInvoice {
  id: string
  supplierId: string
  supplierName: string
  issueDate: string
  dueDate: string | null
  reference: string | null
  description: string | null
  status: 'draft' | 'approved' | 'void'
  lines: { accountId: string; accountName: string; qty: string; unitPrice: string; subtotal: number }[]
  invoiceAmount: number
  balanceDue: number
  paymentStatus: 'Coming due' | 'Overdue' | 'Paid in full' | null
}

const PAGE_SIZE = 10
const SEARCH_PAGE_SIZE = 100

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function StatusBadge({
  status,
  paymentStatus,
}: {
  status: PurchaseInvoice['status']
  paymentStatus: PurchaseInvoice['paymentStatus']
}) {
  if (status === 'draft') return <Badge variant="secondary">Draft</Badge>
  if (status === 'void') return <Badge variant="outline">Void</Badge>
  if (paymentStatus === 'Paid in full') {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Paid in full</Badge>
  }
  const variant = paymentStatus === 'Overdue' ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{paymentStatus}</Badge>
}

export function PurchaseInvoicesPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: invoicesData, isLoading } = usePurchaseInvoices(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const invoices = invoicesData?.data ?? []
  const pagination = invoicesData?.pagination
    // Kalau halaman yang sedang dibuka jadi kosong (misalnya data terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const { data: totals } = usePurchaseInvoiceTotals(businessId)

  const approveInvoice = useApprovePurchaseInvoice(businessId)
  const voidInvoice = useVoidPurchaseInvoice(businessId)
  const deleteInvoice = useDeletePurchaseInvoice(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'

  const filtered = invoices.filter(
    (inv) =>
      inv.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.reference ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function openCreate() {
    setEditingInvoice(null)
    setFormOpen(true)
  }

  function openEdit(invoice: PurchaseInvoice) {
    setEditingInvoice(invoice)
    setFormOpen(true)
  }

  function runAction(action: () => Promise<unknown>) {
    setActionError(null)
    action().catch((err) => setActionError(getApiErrorMessage(err, 'Aksi gagal dijalankan')))
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Purchase Invoices</h1>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Purchase Invoice
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari pemasok atau reference..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4"
      />

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada faktur pembelian.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((invoice) => (
            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{invoice.supplierName}</span>
                  {invoice.reference && (
                    <Badge variant="outline" className="font-mono font-normal">
                      {invoice.reference}
                    </Badge>
                  )}
                  <StatusBadge status={invoice.status} paymentStatus={invoice.paymentStatus} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {invoice.issueDate} {invoice.dueDate && `· Jatuh tempo ${invoice.dueDate}`} · Invoice Amount:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(invoice.invoiceAmount)}</span>
                  {invoice.status === 'approved' && (
                    <>
                      {' '}
                      · Balance Due:{' '}
                      <span className="font-medium text-foreground">{formatCurrency(invoice.balanceDue)}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewingInvoice(invoice)}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {canWrite && invoice.status === 'draft' && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(invoice)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => runAction(() => approveInvoice.mutateAsync(invoice.id))}
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => runAction(() => deleteInvoice.mutateAsync(invoice.id))}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {canWrite && invoice.status === 'approved' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => runAction(() => voidInvoice.mutateAsync(invoice.id))}
                    title="Void"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 text-xs">
            <div className="flex gap-6">
              <span>
                Total Invoice Amount: <span className="font-medium">{formatCurrency(totals?.totalInvoiceAmount ?? 0)}</span>
              </span>
              <span>
                Total Balance Due: <span className="font-medium">{formatCurrency(totals?.totalBalanceDue ?? 0)}</span>
              </span>
            </div>

            {!isSearching && pagination && pagination.totalPages > 1 && (
              <div className="flex items-center gap-1 text-muted-foreground">
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
        </div>
      )}

      <PurchaseInvoiceFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editingInvoice={editingInvoice}
      />
      <PurchaseInvoiceViewDialog
        open={!!viewingInvoice}
        onOpenChange={(open) => !open && setViewingInvoice(null)}
        invoice={viewingInvoice}
      />
    </div>
  )
}