import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  ClipboardList,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useSalesQuotes, useDeleteSalesQuote } from '@/hooks/use-sales-quotes'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { SalesQuoteFormDialog, type SalesQuoteFormMode } from './sales-quote-form-dialog'

interface SalesQuote {
  id: string
  customerId: string
  customerName: string
  issueDate: string
  validDays: number | null
  expiryDate: string | null
  reference: string | null
  billingAddress: string | null
  description: string | null
  lines: {
    id: string
    description: string
    qty: string
    unitPrice: string
    subtotal: number
  }[]
  totalAmount: number
}

const PAGE_SIZE = 10

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function SalesQuotesPage({ businessId }: { businessId: string }) {
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

  const { data: quotesData, isLoading } = useSalesQuotes(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    dateFrom,
    dateTo,
  })
  const quotes = quotesData?.data ?? []
  const pagination = quotesData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteQuote = useDeleteSalesQuote(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<SalesQuoteFormMode>('create')
  const [formQuote, setFormQuote] = useState<SalesQuote | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || !!dateFrom || !!dateTo
  const today = new Date().toISOString().slice(0, 10)

  function openForm(mode: SalesQuoteFormMode, quote: SalesQuote | null) {
    setFormMode(mode)
    setFormQuote(quote)
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
        <h1 className="text-lg font-semibold">Sales Quotes</h1>
        {canWrite && (
          <Button size="sm" onClick={() => openForm('create', null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Sales Quote
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari pelanggan atau reference..."
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

      {!isLoading && quotes.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada Sales Quote yang cocok.' : 'Belum ada Sales Quote.'}
          </p>
        </div>
      )}

      {quotes.length > 0 && (
        <div className="rounded-lg border bg-background">
          {quotes.map((quote) => {
            const expanded = expandedId === quote.id
            const isExpired = !!quote.expiryDate && quote.expiryDate < today
            return (
              <div key={quote.id} className="border-b last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{quote.customerName}</span>
                      {quote.reference && (
                        <Badge variant="outline" className="font-mono font-normal">
                          {quote.reference}
                        </Badge>
                      )}
                      {isExpired && <Badge variant="secondary">Kedaluwarsa</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {quote.issueDate}
                      {quote.expiryDate && <> · Berlaku s/d {quote.expiryDate}</>} · Total:{' '}
                      <span className="font-medium text-foreground">{formatCurrency(quote.totalAmount)}</span>
                      {quote.description && <> · {quote.description}</>}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedId(expanded ? null : quote.id)}
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
                          onClick={() => openForm('edit', quote)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openForm('clone', quote)}
                          title="Clone"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => runAction(() => deleteQuote.mutateAsync(quote.id))}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    {quote.billingAddress && (
                      <p className="mb-2 text-xs text-muted-foreground">Billing Address: {quote.billingAddress}</p>
                    )}
                    <div className="rounded-md border bg-background">
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                        <span>Rincian</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Unit Price</span>
                        <span className="text-right">Total</span>
                      </div>
                      {quote.lines.map((line) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b px-3 py-2 text-sm last:border-b-0"
                        >
                          <p className="min-w-0 truncate">{line.description}</p>
                          <span className="text-right">{Number(line.qty)}</span>
                          <span className="text-right">{formatCurrency(Number(line.unitPrice))}</span>
                          <span className="text-right">{formatCurrency(line.subtotal)}</span>
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

      <SalesQuoteFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        quote={formQuote}
        mode={formMode}
      />
    </div>
  )
}