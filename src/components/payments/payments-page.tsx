import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Banknote, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePayments, usePaymentTotals, useSetPaymentCleared } from '@/hooks/use-payments'
import { useBusiness } from '@/hooks/use-businesses'
import { PaymentFormDialog } from './payment-form-dialog'
import { PaymentViewDialog } from './payment-view-dialog'
import { DeletePaymentDialog } from './delete-payment-dialog'

interface PaymentRow {
  id: string
  reference: string
  paymentDate: string
  paidFromBankAccountName: string
  payeeContactId: string
  payeeContactName: string
  description: string | null
  cleared: boolean
  lines: {
    accountId: string
    accountName: string
    purchaseInvoiceId: string | null
    purchaseInvoiceReference: string | null
    expenseClaimId: string | null
    expenseClaimReference: string | null
    amount: string
  }[]
  totalAmount: number
}

const PAGE_SIZE = 10
const SEARCH_PAGE_SIZE = 100

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function PaymentsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: paymentsData, isLoading } = usePayments(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const payments = paymentsData?.data ?? []
  const pagination = paymentsData?.pagination
    // Kalau halaman yang sedang dibuka jadi kosong (misalnya data terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const { data: totals } = usePaymentTotals(businessId)

  const setCleared = useSetPaymentCleared(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [viewingPayment, setViewingPayment] = useState<PaymentRow | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<{ id: string; reference: string } | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'

  const filtered = payments.filter(
    (p) =>
      p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.payeeContactName.toLowerCase().includes(search.toLowerCase()),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Payments</h1>
        {canWrite && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Payment
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari reference atau payee..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <Banknote className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((payment) => (
            <div key={payment.id} className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{payment.reference}</span>
                  <Badge variant="outline" className="font-normal">
                    {payment.payeeContactName}
                  </Badge>
                  <Badge variant={payment.cleared ? 'default' : 'secondary'}>
                    {payment.cleared ? 'Cleared' : 'Uncleared'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {payment.paymentDate} · {payment.paidFromBankAccountName} · Total:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(payment.totalAmount)}</span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewingPayment(payment)}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canWrite && (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={payment.cleared}
                        onCheckedChange={(checked) => setCleared.mutate({ paymentId: payment.id, cleared: checked })}
                      />
                      <span className="text-xs text-muted-foreground">Cleared</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingPayment({ id: payment.id, reference: payment.reference })}
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

      <PaymentFormDialog businessId={businessId} open={formOpen} onOpenChange={setFormOpen} />
      <PaymentViewDialog
        open={!!viewingPayment}
        onOpenChange={(open) => !open && setViewingPayment(null)}
        payment={viewingPayment}
      />
      <DeletePaymentDialog
        businessId={businessId}
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
        payment={deletingPayment}
      />
    </div>
  )
}