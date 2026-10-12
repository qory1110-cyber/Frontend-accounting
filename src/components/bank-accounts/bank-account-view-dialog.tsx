import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSetBankAccountLockDate } from '@/hooks/use-bank-accounts'
import { getApiErrorMessage } from '@/lib/errors'

interface ViewingBankAccount {
  id: string
  name: string
  code: string | null
  controlAccountName: string
  currencyCode: string
  accountNumber: string | null
  openingBalance: string
  openingBalanceDate: string | null
  canHavePendingTransactions: boolean
  creditLimit: string
  isActive: boolean
  lockDate: string | null
  actualBalance: number
  pendingWithdrawals: number
  pendingDeposits: number
  lastReconciliationDate: string | null
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function BankAccountViewDialog({
  businessId,
  isAdmin,
  open,
  onOpenChange,
  bankAccount,
}: {
  businessId: string
  isAdmin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  bankAccount: ViewingBankAccount | null
}) {
  const setLockDate = useSetBankAccountLockDate(businessId)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Sinkronkan kotak tanggal dengan data terbaru (mis. setelah rekonsiliasi memajukan kunci).
  useEffect(() => {
    setDraft(bankAccount?.lockDate ?? '')
    setError(null)
  }, [bankAccount?.id, bankAccount?.lockDate])

  if (!bankAccount) return null

  async function saveLockDate(value: string | null) {
    if (!bankAccount) return
    setError(null)
    try {
      await setLockDate.mutateAsync({ bankAccountId: bankAccount.id, lockDate: value })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal mengubah tanggal kunci'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 wrap-break-word">{bankAccount.name}</span>
            {!bankAccount.accountNumber && <Badge variant="secondary">Cash</Badge>}
            <Badge variant={bankAccount.isActive ? 'default' : 'outline'}>
              {bankAccount.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Code</p>
              <p className="font-medium">{bankAccount.code ?? '-'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Control Account</p>
              <p className="wrap-break-word font-medium">{bankAccount.controlAccountName}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">IBAN</p>
              <p className="font-medium">{bankAccount.accountNumber ?? '-'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Currency</p>
              <p className="font-medium">{bankAccount.currencyCode}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Opening Balance</p>
              <p className="font-medium">{formatCurrency(Number(bankAccount.openingBalance))}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Opening Balance Date</p>
              <p className="font-medium">{bankAccount.openingBalanceDate ?? '-'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Can Have Pending Transactions</p>
              <p className="font-medium">{bankAccount.canHavePendingTransactions ? 'Ya' : 'Tidak'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Last Reconciliation</p>
              <p className="font-medium">{bankAccount.lastReconciliationDate ?? 'Belum pernah'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Terkunci Sampai</p>
              <p className="font-medium">{bankAccount.lockDate ?? 'Tidak terkunci'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-md bg-muted/30 p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credit Limit</span>
              <span className="font-medium">{formatCurrency(Number(bankAccount.creditLimit))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Balance</span>
              <span className="font-medium">{formatCurrency(bankAccount.actualBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Withdrawals</span>
              <span className="font-medium">{formatCurrency(bankAccount.pendingWithdrawals)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Deposits</span>
              <span className="font-medium">{formatCurrency(bankAccount.pendingDeposits)}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-xs font-medium">Kunci periode (Admin)</p>
              <p className="text-xs text-muted-foreground">
                Transaksi bertanggal sampai tanggal ini tidak bisa dihapus dan tidak bisa dibuat baru. Kunci maju
                otomatis saat rekonsiliasi yang cocok disimpan. Menurunkan atau mengosongkannya membuka kembali
                periode tersebut.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-44"
                />
                <Button
                  size="sm"
                  disabled={setLockDate.isPending || !draft || draft === bankAccount.lockDate}
                  onClick={() => saveLockDate(draft)}
                >
                  Simpan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setLockDate.isPending || !bankAccount.lockDate}
                  onClick={() => saveLockDate(null)}
                >
                  Buka Kunci
                </Button>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}