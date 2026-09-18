import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, BookOpen } from 'lucide-react'
import { useChartOfAccounts, useSetChartOfAccountActive, type AccountCategory } from '@/hooks/use-chart-of-accounts'
import { useBusiness } from '@/hooks/use-businesses'
import { AccountFormDialog } from './account-form-dialog'

const CATEGORY_ORDER: AccountCategory[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']

export function ChartOfAccountsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)
  const { data: accounts, isLoading } = useChartOfAccounts(businessId)
  const setActive = useSetChartOfAccountActive(businessId)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<{ id: string; code: string; name: string; category: AccountCategory } | null>(null)

  const isAdmin = business?.role === 'admin'

  function openCreate() {
    setEditingAccount(null)
    setFormOpen(true)
  }

  function openEdit(account: { id: string; code: string; name: string; category: AccountCategory }) {
    setEditingAccount(account)
    setFormOpen(true)
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: (accounts ?? []).filter((a) => a.category === category).sort((a, b) => a.code.localeCompare(b.code)),
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

      {!isLoading && (accounts ?? []).length === 0 && (
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AccountFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editingAccount={editingAccount}
      />
    </div>
  )
}