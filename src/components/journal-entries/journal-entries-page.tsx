import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, BookOpenText, Eye, Copy, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useJournalEntries } from '@/hooks/use-journal-entries'
import { useBusiness } from '@/hooks/use-businesses'
import { JournalEntryFormDialog } from './journal-entry-form-dialog'
import { JournalEntryViewDialog } from './journal-entry-view-dialog'
import { DeleteJournalEntryDialog } from './delete-journal-entry-dialog'

export interface JournalEntryRow {
  id: string
reference: string | null
  entryDate: string
  description: string | null
  lines: {
    accountId: string
    accountCode: string
    accountName: string
    projectId: string | null
    projectName: string | null
    debit: number
    credit: number
    description: string | null
  }[]
  totalDebit: number
  totalCredit: number
}

const PAGE_SIZE = 10

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function JournalEntriesPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  // Pencarian dikirim ke backend, jadi ditunda sebentar supaya tidak
  // memanggil API di setiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useJournalEntries(businessId, page, PAGE_SIZE, debouncedSearch)
  const entries = data?.data ?? []
  const pagination = data?.pagination

  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const [formOpen, setFormOpen] = useState(false)
  const [cloneSource, setCloneSource] = useState<JournalEntryRow | null>(null)
  const [viewingEntry, setViewingEntry] = useState<JournalEntryRow | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<{ id: string; reference: string } | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'

  function openNew() {
    setCloneSource(null)
    setFormOpen(true)
  }

  function openClone(entry: JournalEntryRow) {
    setCloneSource(entry)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Journal Entries</h1>
        {canWrite && (
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Journal Entry
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari reference, deskripsi, atau akun..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <BookOpenText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada jurnal.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-lg border bg-background">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{entry.reference ?? '(tanpa reference)'}</span>
                {entry.description && (
                  <p className="truncate text-xs text-muted-foreground">{entry.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {entry.entryDate} · Total:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(entry.totalDebit)}</span>
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewingEntry(entry)}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canWrite && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openClone(entry)}
                      title="Clone"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                        setDeletingEntry({ id: entry.id, reference: entry.reference ?? '(tanpa reference)' })
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

          {pagination && pagination.totalPages > 1 && (
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

      <JournalEntryFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        cloneFrom={cloneSource}
      />
      <JournalEntryViewDialog
        open={!!viewingEntry}
        onOpenChange={(open) => !open && setViewingEntry(null)}
        entry={viewingEntry}
      />
      <DeleteJournalEntryDialog
        businessId={businessId}
        open={!!deletingEntry}
        onOpenChange={(open) => !open && setDeletingEntry(null)}
        entry={deletingEntry}
      />
    </div>
  )
}