import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Building2 } from 'lucide-react'
import { AddBusinessDialog } from './add-business-dialog'


const API_BASE = 'http://localhost:8014/api/v1'

interface Business {
  id: string
  name: string
  baseCurrencyCode: string
  role: 'admin' | 'accountant' | 'viewer'
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken')
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  })
}

export function BusinessesPage() {
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  function loadBusinesses() {
    setIsLoading(true)
    authFetch('/businesses')
      .then((res) => res.json())
      .then((json) => setBusinesses(json.data ?? []))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadBusinesses()
  }, [])

  const filtered = businesses.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  )

  // Kelompokkan per huruf awal, sesuai pola daftar Businesses di Manager.io
  const grouped = filtered
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce<Record<string, Business[]>>((acc, b) => {
      const letter = b.name[0]?.toUpperCase() ?? '#'
      acc[letter] = acc[letter] ?? []
      acc[letter].push(b)
      return acc
    }, {})

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Businesses</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Business
        </Button>
      </div>

      <Input
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <div className="rounded-lg border bg-background">
        {isLoading && (
          <p className="p-6 text-center text-sm text-muted-foreground">Memuat...</p>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Belum ada bisnis. Buat satu untuk mulai mencatat pembukuan.
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([letter, items]) => (
          <div key={letter}>
            <div className="border-b bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              {letter}
            </div>
            {items.map((b) => (
              <button
                key={b.id}
                onClick={() =>
                  navigate({ to: '/businesses/$businessId', params: { businessId: b.id } })
                }
                className="flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent"
              >
                <span className="text-sm font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground">
                  {b.baseCurrencyCode} · {b.role}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <AddBusinessDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={loadBusinesses}
      />
    </div>
  )
}