import { useEffect, useState } from 'react'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

function computeBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Detail perilaku tiap breakpoint dikerjakan di subtugas "Kerangka layout responsif" —
// hook ini baru fondasinya saja.
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(computeBreakpoint)

  useEffect(() => {
    function handleResize() {
      setBreakpoint(computeBreakpoint())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}