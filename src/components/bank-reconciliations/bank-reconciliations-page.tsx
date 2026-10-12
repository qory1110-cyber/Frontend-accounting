import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Scale, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useBankReconciliations } from '@/hooks/use-bank-reconciliations'
import { useBusiness } from '@/hooks/use-businesses'
import { BankReconciliationFormDialog } from './bank-reconciliation-form-dialog'
import { BankReconciliationViewDialog } from './bank-reconciliation-view-dialog'
import { DeleteBankReconciliationDialog } from './delete-bank-reconciliation-dialog'

const PAGE_SIZE = 10
const SEARCH_PAGE_SIZE = 100

type ReconciliationRow = NonNullable<ReturnType<typeof useBankReconciliations>['data']>['data'][number]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function BankReconciliationsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: listData, isLoading } = useBankReconciliations(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const rows = listData?.data ?? []
  const pagination = listData?.pagination

  // Kalau halaman yang sedang dibuka jadi kosong, mundur ke halaman terakhir yang ada.
  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ReconciliationRow | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; label: string } | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'

  const filtered = rows.filter(
    (r) =>
      r.bankAccountName.toLowerCase().includes(search.toLowerCase()) ||
      r.reconciliationDate.includes(search),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: ReconciliationRow) {
    setEditing(row)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bank Reconciliations</h1>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Bank Reconciliation
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari nama bank atau tanggal (YYYY-MM-DD)..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <Scale className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada rekonsiliasi bank.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{row.bankAccountName}</span>
                  <Badge
                    className={
                      row.status === 'reconciled'
                        ? 'border-transparent bg-green-600 font-normal text-white'
                        : 'border-transparent bg-red-600 font-normal text-white'
                    }
                  >
                    {row.status === 'reconciled' ? 'Reconciled' : 'Not Reconciled'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.reconciliationDate} · Statement Balance:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(row.statementBalance)}</span> ·
                  Discrepancy:{' '}
                  <button
                    type="button"
                    className="font-medium text-blue-600 hover:underline"
                    onClick={() => setViewingId(row.id)}
                    title="Lihat rincian selisih"
                  >
                    {formatCurrency(row.discrepancy)}
                  </button>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingId(row.id)} title="View">
                  <Eye className="h-4 w-4" />
                </Button>
                {canWrite && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() =>
                        setDeleting({ id: row.id, label: `${row.bankAccountName} (${row.reconciliationDate})` })
                      }
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {!isSearching && pagination && pagination.totalPages > 1 && (
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

      <BankReconciliationFormDialog
        key={editing?.id ?? 'new'}
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        reconciliation={editing}
      />
      <BankReconciliationViewDialog
        businessId={businessId}
        open={!!viewingId}
        onOpenChange={(open) => !open && setViewingId(null)}
        reconciliationId={viewingId}
      />
      <DeleteBankReconciliationDialog
        businessId={businessId}
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        reconciliation={deleting}
      />
    </div>
  )
}