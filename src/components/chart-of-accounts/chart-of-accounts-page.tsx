import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useChartOfAccountsPage, useSetChartOfAccountActive, type AccountCategory } from '@/hooks/use-chart-of-accounts'
import { useBusiness } from '@/hooks/use-businesses'
import { AccountFormDialog } from './account-form-dialog'
import { Plus, Pencil, Trash2, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { DeleteAccountDialog } from './delete-account-dialog'

const CATEGORY_ORDER: AccountCategory[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']
const PAGE_SIZE = 20

export function ChartOfAccountsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)
  const [page, setPage] = useState(1)
  const { data: accountsData, isLoading } = useChartOfAccountsPage(businessId, page, PAGE_SIZE)
  const accounts = accountsData?.data ?? []
  const pagination = accountsData?.pagination
  const setActive = useSetChartOfAccountActive(businessId)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<{ id: string; code: string; name: string; category: AccountCategory } | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<{ id: string; name: string } | null>(null)

  const isAdmin = business?.role === 'admin'

  // Kalau halaman yang sedang dibuka jadi kosong (misalnya akun terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  function openCreate() {
    setEditingAccount(null)
    setFormOpen(true)
  }

  function openEdit(account: { id: string; code: string; name: string; category: AccountCategory }) {
    setEditingAccount(account)
    setFormOpen(true)
  }

  // Server sudah mengurutkan per kategori lalu kode, jadi pengelompokan di halaman
  // ini mengikuti urutan yang sama. Satu kategori bisa terbelah di batas halaman,
  // dan judul kategorinya muncul lagi di halaman berikutnya.
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: accounts.filter((a) => a.category === category).sort((a, b) => a.code.localeCompare(b.code)),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Struktur akun dasar pembukuan — dikonfigurasi sekali, jarang berubah.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Account
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && accounts.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada akun.</p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {grouped.map((group) => (
          <div key={group.category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{group.category}</h2>
            <div className="rounded-lg border bg-background">
              {group.items.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono font-normal">
                      {account.code}
                    </Badge>
                    <span className={`text-sm font-medium ${!account.isActive ? 'text-muted-foreground line-through' : ''}`}>
                      {account.name}
                    </span>
                    {account.isControlAccount && (
                      <Badge variant="secondary" className="font-normal">
                        Control Account
                      </Badge>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={account.isActive}
                          onCheckedChange={(checked) =>
                            setActive.mutate({ accountId: account.id, isActive: checked })
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(account)}
                        aria-label="Edit akun"
                      >
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
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

      <AccountFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editingAccount={editingAccount}
      />
      <DeleteAccountDialog
        businessId={businessId}
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        account={deletingAccount}
      />
    </div>
  )
}