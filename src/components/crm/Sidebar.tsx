'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCRMStore } from '@/stores/crm-store';
import { INBOXES, type InboxType } from '@/types/crm';
import { cn, getInitials } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Sun, Moon, Settings, Home, DollarSign, GraduationCap, ClipboardList, Users, ChevronLeft, ChevronRight, Contact, Tag, MessageSquare, BarChart3, LogOut } from 'lucide-react';

const INBOX_ICONS: Record<InboxType, React.ReactNode> = {
  wsp4: <Home size={16} />,
  ventas: <DollarSign size={16} />,
  alumnos: <GraduationCap size={16} />,
  admin: <ClipboardList size={16} />,
  comunidad: <Users size={16} />,
};

const PAGINAS_EXTRA = [
  { id: 'contactos', nombre: 'Contactos', href: '/crm/contactos', icono: Contact },
  { id: 'etiquetas', nombre: 'Etiquetas', href: '/crm/etiquetas', icono: Tag },
  { id: 'respuestas', nombre: 'Respuestas', href: '/crm/respuestas', icono: MessageSquare },
  { id: 'estadisticas', nombre: 'Estadísticas', href: '/crm/estadisticas', icono: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { darkMode, toggleDarkMode, inboxActual, setInboxActual, contadores, usuario, sidebarExpandido, toggleSidebar } = useCRMStore();
  const isMainChat = pathname === '/crm';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className={cn(
      'h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
      sidebarExpandido ? 'w-48' : 'w-14'
    )}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            PSI
          </div>
          {sidebarExpandido && (
            <span className="font-semibold text-slate-800 dark:text-white text-sm whitespace-nowrap">Vision Hub</span>
          )}
        </div>
        <button onClick={toggleSidebar} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          {sidebarExpandido ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Inboxes */}
      <nav className="flex-1 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {sidebarExpandido && (
          <p className="px-3 text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Inboxes</p>
        )}
        {INBOXES.map((inbox) => {
          const isActive = isMainChat && inboxActual === inbox.id;
          const count = contadores[inbox.id];
          return (
            <Link
              key={inbox.id}
              href="/crm"
              onClick={() => setInboxActual(inbox.id)}
              className={cn(
                'relative mx-1 px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all group',
                isActive
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                !sidebarExpandido && 'justify-center'
              )}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />}
              <span className="flex-shrink-0 relative">
                {INBOX_ICONS[inbox.id]}
                {count > 0 && !sidebarExpandido && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[8px] font-medium rounded-full flex items-center justify-center">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              {sidebarExpandido && (
                <>
                  <span className="flex-1 text-xs font-medium truncate">{inbox.nombre}</span>
                  {count > 0 && (
                    <span className="min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </>
              )}
              {!sidebarExpandido && (
                <div className="absolute left-full ml-1 px-1.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {inbox.nombre}
                </div>
              )}
            </Link>
          );
        })}

        <div className="my-2 mx-3 border-t border-slate-200 dark:border-slate-800" />

        {sidebarExpandido && (
          <p className="px-3 text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Gestión</p>
        )}
        {PAGINAS_EXTRA.map((pagina) => {
          const isActive = pathname === pagina.href;
          return (
            <Link
              key={pagina.id}
              href={pagina.href}
              className={cn(
                'relative mx-1 px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all group',
                isActive
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                !sidebarExpandido && 'justify-center'
              )}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />}
              <pagina.icono size={16} />
              {sidebarExpandido && <span className="flex-1 text-xs font-medium truncate">{pagina.nombre}</span>}
              {!sidebarExpandido && (
                <div className="absolute left-full ml-1 px-1.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {pagina.nombre}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Acciones inferiores */}
      <div className="py-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-0.5">
        <button
          onClick={toggleDarkMode}
          className={cn(
            'mx-1 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2',
            !sidebarExpandido && 'justify-center'
          )}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {sidebarExpandido && <span className="text-xs">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>
        <Link
          href="/crm/ajustes"
          className={cn(
            'mx-1 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2',
            pathname === '/crm/ajustes'
              ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
            !sidebarExpandido && 'justify-center'
          )}
        >
          <Settings size={16} />
          {sidebarExpandido && <span className="text-xs">Ajustes</span>}
        </Link>
      </div>

      {/* Avatar */}
      <div className={cn('p-2 border-t border-slate-200 dark:border-slate-800', sidebarExpandido && 'flex items-center gap-2')}>
        <button onClick={handleLogout} title="Cerrar sesión" className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-medium text-xs flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0">
          {getInitials(usuario?.nombre)}
        </button>
        {sidebarExpandido && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{usuario?.nombre || 'Usuario'}</p>
            <p className="text-[10px] text-slate-500 truncate">{usuario?.email || 'Sin email'}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
