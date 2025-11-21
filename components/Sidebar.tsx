'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Brain, 
  Settings,
  Home,
  Eye
} from 'lucide-react';
import { UserRole } from '@/lib/types';
import { hasAdminAccess } from '@/lib/utils';

interface SidebarProps {
  userRole?: UserRole;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole ? hasAdminAccess(userRole) : false;

  const navItems = [
    {
      name: 'Inicio',
      href: '/',
      icon: Home,
      show: true,
    },
    {
      name: 'PSI Vision Hub',
      href: '/dashboard',
      icon: Eye,
      show: true,
    },
    {
      name: 'CRM-COM',
      href: '/crm-com',
      icon: MessageSquare,
      show: true,
    },
    {
      name: 'IA TCC',
      href: '/ia-tcc',
      icon: Brain,
      show: true,
    },
  ];

  const adminItem = {
    name: 'Administración',
    href: '/admin',
    icon: Settings,
    show: isAdmin,
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-psi-gray-dark text-white border-r border-gray-700">
      <div className="flex flex-col h-full">
        {/* Logo PSI */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">PSI</h1>
              <p className="text-xs text-gray-400">Vision Hub</p>
            </div>
          </div>
        </div>
        
        {/* Navegación principal */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            if (!item.show) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Administración (discreto) */}
        {adminItem.show && (
          <div className="p-4 border-t border-gray-700">
            <Link
              href={adminItem.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === adminItem.href
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">{adminItem.name}</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
