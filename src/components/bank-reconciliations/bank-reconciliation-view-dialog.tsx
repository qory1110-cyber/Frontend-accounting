import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useBankReconciliation } from '@/hooks/use-bank-reconciliations'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

const typeLabels = {
  payment: 'Payment',
  receipt: 'Receipt',
  transfer_out: 'Transfer keluar',
  transfer_in: 'Transfer masuk',
} as const

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={strong ? 'font-semibold' : 'font-medium'}>{value}</span>
    </div>
  )
}

export function BankReconciliationViewDialog({
  businessId,
  open,
  onOpenChange,
  reconciliationId,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  reconciliationId: string | null
}) {
  const { data, isLoading } = useBankReconciliation(businessId, open ? reconciliationId : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bank Reconciliation</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

        {data && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{data.bankAccountName}</span>
              <span className="text-xs text-muted-foreground">per {data.reconciliationDate}</span>
              <Badge
                className={
                  data.status === 'reconciled'
                    ? 'border-transparent bg-green-600 font-normal text-white'
                    : 'border-transparent bg-red-600 font-normal text-white'
                }
              >
                {data.status === 'reconciled' ? 'Reconciled' : 'Not Reconciled'}
              </Badge>
            </div>

            <div className="divide-y rounded-lg border px-4">
              <Row label="Statement Balance" value={formatCurrency(data.statementBalance)} />
              <Row label="Book Balance" value={formatCurrency(data.bookBalance)} />
              <Row label="+ Uncleared Withdrawals" value={formatCurrency(data.unclearedWithdrawals)} />
              <Row label="− Uncleared Deposits" value={formatCurrency(data.unclearedDeposits)} />
              <Row
                label="Saldo buku disesuaikan"
                value={formatCurrency(data.bookBalance + data.unclearedWithdrawals - data.unclearedDeposits)}
              />
              <Row label="Discrepancy" value={formatCurrency(data.discrepancy)} strong />
            </div>
            <p className="text-xs text-muted-foreground">
              Discrepancy = Statement Balance − (Book Balance + Uncleared Withdrawals − Uncleared Deposits).
              Hanya transaksi bertanggal sampai tanggal cutoff yang dihitung.
            </p>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Transaksi Uncleared</h3>
              {data.unclearedTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada transaksi uncleared sampai tanggal ini.</p>
              ) : (
                <div className="rounded-lg border">
                  {data.unclearedTransactions.map((t) => (
                    <div
                      key={`${t.type}-${t.id}`}
                      className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.date} · {typeLabels[t.type]}
                        </p>
                      </div>
                      <span className={t.kind === 'withdrawal' ? 'text-red-600' : 'text-green-600'}>
                        {t.kind === 'withdrawal' ? '−' : '+'}
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}