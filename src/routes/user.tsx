import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/hooks/use-auth'

export const Route = createFileRoute('/user')({
  component: UserPage,
})

function UserPage() {
  const { data: user, isLoading, isError } = useMe()

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-lg font-semibold">Profil Saya</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Diri</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

          {isError && (
            <p className="text-sm text-destructive">
              Gagal memuat data profil. Coba muat ulang halaman.
            </p>
          )}

          {user && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Nama</p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}