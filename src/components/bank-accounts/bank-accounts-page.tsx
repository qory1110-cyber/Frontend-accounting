import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Landmark, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { useBankAccounts, useSetBankAccountActive } from '@/hooks/use-bank-accounts'
import { useBusiness } from '@/hooks/use-businesses'
import { BankAccountFormDialog } from './bank-account-form-dialog'
import { DeleteBankAccountDialog } from './delete-bank-account-dialog'
import { BankAccountViewDialog } from './bank-account-view-dialog'

interface BankAccount {
  id: string
  name: string
  code: string | null
  controlAccountId: string
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

const PAGE_SIZE = 10
const SEARCH_PAGE_SIZE = 100

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
}

export function BankAccountsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: bankAccountsData, isLoading } = useBankAccounts(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const bankAccounts = bankAccountsData?.data ?? []
  const pagination = bankAccountsData?.pagination
    // Kalau halaman yang sedang dibuka jadi kosong (misalnya data terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const setActive = useSetBankAccountActive(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<{ id: string; name: string } | null>(null)

  const isAdmin = business?.role === 'admin'
    // Diambil dari data terbaru supaya tampilan ikut berubah setelah kunci diubah.
  const viewingAccount = bankAccounts.find((a) => a.id === viewingAccountId) ?? null

  const filtered = bankAccounts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.code ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function openCreate() {
    setEditingAccount(null)
    setFormOpen(true)
  }

  function openEdit(account: BankAccount) {
    setEditingAccount(account)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bank and Cash Accounts</h1>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Account
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari nama atau kode..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <Landmark className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada akun bank/kas.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${!account.isActive ? 'text-muted-foreground line-through' : ''}`}>
                    {account.name}
                  </span>
                  {account.code && (
                    <Badge variant="outline" className="font-mono font-normal">
                      {account.code}
                    </Badge>
                  )}
                  {!account.accountNumber && (
                    <Badge variant="secondary" className="font-normal">
                      Cash
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {account.controlAccountName} · Actual Balance:{' '}
                  <span className="font-medium text-foreground">
                    {formatCurrency(account.actualBalance, account.currencyCode)}
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingAccountId(account.id)} title="View">
                  <Eye className="h-4 w-4" />
                </Button>

                {isAdmin && (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={account.isActive}
                        onCheckedChange={(checked) => setActive.mutate({ bankAccountId: account.id, isActive: checked })}
                      />
                      <span className="text-xs text-muted-foreground">{account.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingAccount({ id: account.id, name: account.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {!isSearching && pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
              <span>
                Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.total} akun
              </span>
              <div className="flex items-center gap-1">
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
            </div>
          )}
        </div>
      )}

      <BankAccountFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editingBankAccount={editingAccount}
      />
      <DeleteBankAccountDialog
        businessId={businessId}
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        bankAccount={deletingAccount}
      />
        <BankAccountViewDialog
        businessId={businessId}
        isAdmin={isAdmin}
        open={!!viewingAccount}
        onOpenChange={(open) => !open && setViewingAccountId(null)}
        bankAccount={viewingAccount}
      />
    </div>
  )
}