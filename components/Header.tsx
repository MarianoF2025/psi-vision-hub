'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Eye, Users, LogIn, LogOut, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
}

export default function Header({ userName, userEmail }: HeaderProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = !!(userName || userEmail);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
      {/* Logo PSI a la izquierda */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">PSI</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">PSI Asociación</p>
            <p className="text-xs text-gray-500">Vision Hub</p>
          </div>
        </div>
      </div>

      {/* Botones de navegación y usuario a la derecha */}
      <div className="flex items-center gap-4">
        {/* Botones de módulos */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Vision Hub</span>
          </Link>
          <Link
            href="/crm-com"
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>CRM</span>
          </Link>
        </div>

        {/* Botón de Iniciar Sesión o Información de usuario */}
        {!isAuthenticated ? (
          <Link
            href="/login"
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar sesión</span>
          </Link>
        ) : (
          <div className="relative pl-4 border-l border-gray-200" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="text-right">
                {userName && (
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                )}
                {userEmail && (
                  <p className="text-xs text-gray-500">{userEmail}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Mi perfil</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
