import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, ArrowLeftRight, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useInterAccountTransfers, useSetTransferCleared } from '@/hooks/use-inter-account-transfers'
import { useBusiness } from '@/hooks/use-businesses'
import { TransferFormDialog } from './transfer-form-dialog'
import { TransferViewDialog } from './transfer-view-dialog'
import { DeleteTransferDialog } from './delete-transfer-dialog'

interface TransferRow {
  id: string
  reference: string
  transferDate: string
  description: string | null
  paidFromBankAccountName: string
  receivedInBankAccountName: string
  amount: number
  paidFromCleared: boolean
  receivedInCleared: boolean
}

const PAGE_SIZE = 10
const SEARCH_PAGE_SIZE = 100

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function TransfersPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: transfersData, isLoading } = useInterAccountTransfers(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const transfers = transfersData?.data ?? []
  const pagination = transfersData?.pagination
    // Kalau halaman yang sedang dibuka jadi kosong (misalnya data terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const setCleared = useSetTransferCleared(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [viewingTransfer, setViewingTransfer] = useState<TransferRow | null>(null)
  const [deletingTransfer, setDeletingTransfer] = useState<{ id: string; reference: string } | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'

  const q = search.toLowerCase()
  const filtered = transfers.filter(
    (t) =>
      t.reference.toLowerCase().includes(q) ||
      t.paidFromBankAccountName.toLowerCase().includes(q) ||
      t.receivedInBankAccountName.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inter Account Transfers</h1>
        {canWrite && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Transfer
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari reference, akun, atau keterangan..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada transfer.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((transfer) => (
            <div
              key={transfer.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{transfer.reference}</span>
                  <Badge variant="outline" className="font-normal">
                    {transfer.paidFromBankAccountName} → {transfer.receivedInBankAccountName}
                  </Badge>
                  <Badge variant={transfer.paidFromCleared ? 'default' : 'secondary'} className="font-normal">
                    Asal {transfer.paidFromCleared ? 'Cleared' : 'Uncleared'}
                  </Badge>
                  <Badge variant={transfer.receivedInCleared ? 'default' : 'secondary'} className="font-normal">
                    Tujuan {transfer.receivedInCleared ? 'Cleared' : 'Uncleared'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {transfer.transferDate} · Amount:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(transfer.amount)}</span>
                  {transfer.description && ` · ${transfer.description}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewingTransfer(transfer)}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canWrite && (
                  <>
                    <div className="flex items-center gap-1.5" title="Tandai sisi asal Cleared">
                      <Switch
                        checked={transfer.paidFromCleared}
                        onCheckedChange={(checked) =>
                          setCleared.mutate({ transferId: transfer.id, paidFromCleared: checked })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Asal</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Tandai sisi tujuan Cleared">
                      <Switch
                        checked={transfer.receivedInCleared}
                        onCheckedChange={(checked) =>
                          setCleared.mutate({ transferId: transfer.id, receivedInCleared: checked })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Tujuan</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingTransfer({ id: transfer.id, reference: transfer.reference })}
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
            <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <span>
                Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.total} transfer
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

      <TransferFormDialog businessId={businessId} open={formOpen} onOpenChange={setFormOpen} />
      <TransferViewDialog
        open={!!viewingTransfer}
        onOpenChange={(open) => !open && setViewingTransfer(null)}
        transfer={viewingTransfer}
      />
      <DeleteTransferDialog
        businessId={businessId}
        open={!!deletingTransfer}
        onOpenChange={(open) => !open && setDeletingTransfer(null)}
        transfer={deletingTransfer}
      />
    </div>
  )
}