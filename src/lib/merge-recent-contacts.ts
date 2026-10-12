interface RecentContact {
  id: string
  name: string
  isActive: boolean
}

// Menggabungkan Customer dan Supplier terbaru secara selang-seling, membuang
// yang tidak aktif dan duplikat (satu kontak boleh sekaligus Customer dan Supplier).
export function mergeRecentContacts(
  customers: RecentContact[] = [],
  suppliers: RecentContact[] = [],
  limit = 20,
) {
  const a = customers.filter((c) => c.isActive)
  const b = suppliers.filter((s) => s.isActive)
  const seen = new Set<string>()
  const result: { id: string; label: string }[] = []

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    for (const item of [a[i], b[i]]) {
      if (item && !seen.has(item.id)) {
        seen.add(item.id)
        result.push({ id: item.id, label: item.name })
      }
    }
  }
  return result.slice(0, limit)
}