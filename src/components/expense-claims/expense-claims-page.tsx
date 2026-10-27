import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  Wallet,
  Copy,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useExpenseClaims, useDeleteExpenseClaim } from '@/hooks/use-expense-claims'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { ExpenseClaimFormDialog } from './expense-claim-form-dialog'
import { PayersManagerDialog } from './payers-manager-dialog'

interface ExpenseClaim {
  id: string
  payerId: string
  payerName: string
  claimDate: string
  reference: string | null
  payee: string | null
  description: string | null
  totalAmount: number
  paidAmount: number
  balanceDue: number
  status: 'Unpaid' | 'Paid'
  lines: {
    id: string
    accountId: string
    accountName: string
    description: string | null
    amount: number
    projectId: string | null
    projectName: string | null
  }[]
}

const PAGE_SIZE = 10

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function StatusBadge({ status }: { status: ExpenseClaim['status'] }) {
  if (status === 'Paid') {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Paid</Badge>
  }
  return <Badge variant="secondary">Unpaid</Badge>
}

export function ExpenseClaimsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Tunda pencarian 300 ms supaya tidak memanggil API di setiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: claimsData, isLoading } = useExpenseClaims(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    dateFrom,
    dateTo,
  })
  const claims = claimsData?.data ?? []
  const pagination = claimsData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteClaim = useDeleteExpenseClaim(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [cloneSource, setCloneSource] = useState<ExpenseClaim | null>(null)
  const [payersOpen, setPayersOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || !!dateFrom || !!dateTo

  function openForm(source: ExpenseClaim | null) {
    setCloneSource(source)
    setFormOpen(true)
  }

  function clearFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function runAction(action: () => Promise<unknown>) {
    setActionError(null)
    action().catch((err) => setActionError(getApiErrorMessage(err, 'Aksi gagal dijalankan')))
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Expense Claims</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPayersOpen(true)}>
            <Users className="mr-1.5 h-4 w-4" />
            Kelola Payers
          </Button>
          {canWrite && (
            <Button size="sm" onClick={() => openForm(null)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Expense Claim
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari Payer, reference, payee, atau deskripsi..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="min-w-60 flex-1"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="w-40"
          title="Dari tanggal"
        />
        <span className="text-xs text-muted-foreground">s/d</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          className="w-40"
          title="Sampai tanggal"
        />
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && claims.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada klaim biaya yang cocok.' : 'Belum ada klaim biaya.'}
          </p>
        </div>
      )}

      {claims.length > 0 && (
        <div className="rounded-lg border bg-background">
          {claims.map((claim) => {
            const expanded = expandedId === claim.id
            return (
              <div key={claim.id} className="border-b last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{claim.payerName}</span>
                      {claim.reference && (
                        <Badge variant="outline" className="font-mono font-normal">
                          {claim.reference}
                        </Badge>
                      )}
                      <StatusBadge status={claim.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {claim.claimDate} · Total:{' '}
                      <span className="font-medium text-foreground">{formatCurrency(claim.totalAmount)}</span>
                      {claim.paidAmount > 0 && claim.status !== 'Paid' && (
                        <> · Dibayar {formatCurrency(claim.paidAmount)}, sisa {formatCurrency(claim.balanceDue)}</>
                      )}
                      {claim.payee && <> · {claim.payee}</>}
                      {claim.description && <> · {claim.description}</>}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedId(expanded ? null : claim.id)}
                      title={expanded ? 'Tutup rincian' : 'Lihat rincian'}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openForm(claim)}
                          title="Clone"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {claim.paidAmount === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => runAction(() => deleteClaim.mutateAsync(claim.id))}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <div className="rounded-md border bg-background">
                      <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                        <span>Rincian</span>
                        <span className="text-right">Amount</span>
                      </div>
                      {claim.lines.map((line) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b px-3 py-2 text-sm last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate">{line.description || line.accountName}</p>
                              <p className="text-xs text-muted-foreground">
                              {line.accountName}
                              {line.projectName && <> · Proyek: {line.projectName}</>}
                            </p>
                          </div>
                          <span className="text-right">{formatCurrency(line.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

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

      <ExpenseClaimFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        claim={cloneSource}
        mode={cloneSource ? 'clone' : 'create'}
      />
      <PayersManagerDialog
        businessId={businessId}
        open={payersOpen}
        onOpenChange={setPayersOpen}
        canWrite={canWrite}
      />
    </div>
  )
}