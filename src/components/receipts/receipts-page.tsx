import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Receipt as ReceiptIcon, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useReceipts, useReceiptTotals, useSetReceiptCleared } from '@/hooks/use-receipts'
import { useBusiness } from '@/hooks/use-businesses'
import { ReceiptFormDialog } from './receipt-form-dialog'
import { ReceiptViewDialog } from './receipt-view-dialog'
import { DeleteReceiptDialog } from './delete-receipt-dialog'

interface ReceiptRow {
  id: string
  reference: string
  receiptDate: string
  receivedInBankAccountName: string
  paidByContactId: string | null
  paidByContactName: string | null
  description: string | null
  cleared: boolean
  lines: {
    accountId: string
    accountName: string
    salesInvoiceId: string | null
    salesInvoiceReference: string | null
    amount: string
  }[]
  totalAmount: number
}

const PAGE_SIZE = 10
const SEARCH_PAGE_SIZE = 100

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function ReceiptsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: receiptsData, isLoading } = useReceipts(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const receipts = receiptsData?.data ?? []
  const pagination = receiptsData?.pagination

  // Kalau halaman yang sedang dibuka jadi kosong (misalnya data terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const { data: totals } = useReceiptTotals(businessId)
  const setCleared = useSetReceiptCleared(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptRow | null>(null)
  const [deletingReceipt, setDeletingReceipt] = useState<{ id: string; reference: string } | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'

  const filtered = receipts.filter(
    (r) =>
      r.reference.toLowerCase().includes(search.toLowerCase()) ||
      (r.paidByContactName ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Receipts</h1>
        {canWrite && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Receipt
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari reference atau kontak..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <ReceiptIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada penerimaan.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((receipt) => (
            <div
              key={receipt.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{receipt.reference}</span>
                  {receipt.paidByContactName && (
                    <Badge variant="outline" className="font-normal">
                      {receipt.paidByContactName}
                    </Badge>
                  )}
                  <Badge variant={receipt.cleared ? 'default' : 'secondary'} className="font-normal">
                    {receipt.cleared ? 'Cleared' : 'Uncleared'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {receipt.receiptDate} · {receipt.receivedInBankAccountName} · Total:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(receipt.totalAmount)}</span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewingReceipt(receipt)}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canWrite && (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={receipt.cleared}
                        onCheckedChange={(checked) => setCleared.mutate({ receiptId: receipt.id, cleared: checked })}
                      />
                      <span className="text-xs text-muted-foreground">Cleared</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingReceipt({ id: receipt.id, reference: receipt.reference })}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 text-xs">
            <span>
              Total: <span className="font-medium">{formatCurrency(totals?.totalAmount ?? 0)}</span>
            </span>

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

      <ReceiptFormDialog businessId={businessId} open={formOpen} onOpenChange={setFormOpen} />
      <ReceiptViewDialog
        open={!!viewingReceipt}
        onOpenChange={(open) => !open && setViewingReceipt(null)}
        receipt={viewingReceipt}
      />
      <DeleteReceiptDialog
        businessId={businessId}
        open={!!deletingReceipt}
        onOpenChange={(open) => !open && setDeletingReceipt(null)}
        receipt={deletingReceipt}
      />
    </div>
  )
}