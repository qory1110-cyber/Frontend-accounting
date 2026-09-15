import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { getRouter } from './router'
import { setupApiClient } from '@/integrations/setup'
import { createQueryClient } from './lib/query-client'

// Pasang interceptor Bearer token + refresh SEBELUM aplikasi mulai render,
// supaya request pertama pun sudah lewat interceptor ini (§5 panduan).
setupApiClient()

const queryClient = createQueryClient()

const router = getRouter()

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}