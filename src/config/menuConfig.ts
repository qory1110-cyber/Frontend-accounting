export type BusinessRole = 'admin' | 'accountant' | 'viewer'

export interface MenuItem {
  label: string
  to: string
  allowedRoles?: BusinessRole[] // kosong/tidak diisi = semua role boleh lihat
}

// Menu bertambah seiring modul baru dibangun (Chart of Accounts, dst - Fase 2).
// "Members" sengaja dibatasi admin+accountant, disembunyikan dari viewer (§7 panduan).
export const businessSidebarMenu: MenuItem[] = [
  { label: 'Overview', to: '/businesses/$businessId' },
  { label: 'Members', to: '/businesses/$businessId/members', allowedRoles: ['admin', 'accountant'] },
]

export function getVisibleMenu(role: BusinessRole | undefined): MenuItem[] {
  if (!role) return []
  return businessSidebarMenu.filter((item) => !item.allowedRoles || item.allowedRoles.includes(role))
}