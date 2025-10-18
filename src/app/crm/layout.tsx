import { ReactNode } from 'react'
import RequireAuth from '@/components/auth/RequireAuth'

interface CRMLayoutProps {
  children: ReactNode
}

export default function CRMLayout({ children }: CRMLayoutProps) {
  return (
    <RequireAuth>
      {children}
    </RequireAuth>
  )
}

export const metadata = {
  title: 'CRM - Psi Vision Hub',
  description: 'Sistema de gestión de relaciones con clientes',
}

