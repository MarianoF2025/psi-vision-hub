'use client';
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Megaphone,
  ShoppingCart,
  GraduationCap,
  Building2,
  Users,
  Bell,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  MessageSquare,
  ChevronUp
} from 'lucide-react';

const menuItems = [
  { icon: Home, label: 'Inicio', href: '/' },
  { icon: Megaphone, label: 'Marketing', href: '/marketing' },
  { icon: ShoppingCart, label: 'Ventas', href: '/ventas' },
  { icon: GraduationCap, label: 'Alumnos', href: '/alumnos' },
  { icon: Building2, label: 'Administracion', href: '/administracion' },
  { icon: Users, label: 'Comunidad', href: '/comunidad' },
  { icon: Bell, label: 'Alertas', href: '/alertas', badge: 3 },
  { icon: Bot, label: 'Pupi', href: '/pupi' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showExitMenu, setShowExitMenu] = useState(false);
  const exitMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('sidebar-expanded');
      if (saved !== null) {
        setIsExpanded(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('sidebar-expanded', JSON.stringify(isExpanded));
      } catch (e) {}
    }
  }, [isExpanded, mounted]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exitMenuRef.current && !exitMenuRef.current.contains(event.target as Node)) {
        setShowExitMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedPath = pathname?.replace('/tableros', '') || '/';
  const isActive = (href: string) => {
    if (href === '/') {
      return normalizedPath === '/' || normalizedPath === '';
    }
    return normalizedPath.startsWith(href);
  };

  return (
    <React.Fragment>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-[#1e2a3b] z-40 flex items-center px-3">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 rounded-lg hover:bg-[#2d3a4f] text-gray-300"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="ml-3 font-semibold text-white text-sm">PSI Vision Hub</span>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-12"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`lg:hidden fixed top-12 left-0 bottom-0 w-64 bg-[#1e2a3b] z-50 transform transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 mx-2 my-0.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-[#e63946] text-white'
                    : 'text-gray-300 hover:bg-[#2d3a4f] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="ml-3 text-sm">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div ref={exitMenuRef} className="p-2 border-t border-gray-700">
          <div className="relative">
            <button
              onClick={() => setShowExitMenu(!showExitMenu)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                showExitMenu ? 'bg-[#2d3a4f] text-white' : 'text-gray-300 hover:bg-[#2d3a4f] hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ExternalLink className="w-5 h-5" />
                <span className="text-sm">Ir a...</span>
              </div>
              <ChevronUp className={`w-4 h-4 transition-transform ${showExitMenu ? '' : 'rotate-180'}`} />
            </button>
            {showExitMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#2d3a4f] rounded-lg overflow-hidden shadow-xl border border-gray-600">
                <a href="https://app.psivisionhub.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-[#3d4a5f] hover:text-white transition-colors">
                  <Home className="w-5 h-5" />
                  <span className="text-sm">Ir a Home</span>
                </a>
                <a href="https://app.psivisionhub.com/crm" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-[#3d4a5f] hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm">Ir al CRM</span>
                </a>
                <div className="border-t border-gray-600">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm">Cerrar sesion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <aside className={`hidden lg:flex fixed top-0 left-0 bottom-0 flex-col bg-[#1e2a3b] z-30 transition-all duration-300 ${isExpanded ? 'w-48' : 'w-14'}`}>
        <div className={`flex items-center h-14 border-b border-gray-700 ${isExpanded ? 'px-3 justify-between' : 'justify-center'}`}>
          {isExpanded && <span className="font-bold text-white text-sm">PSI Vision</span>}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-[#2d3a4f] text-gray-400 hover:text-white"
          >
            {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`flex items-center mx-2 my-0.5 rounded-lg transition-colors ${
                  isExpanded ? 'px-2 py-1.5' : 'px-2 py-1.5 justify-center'
                } ${
                  active
                    ? 'bg-[#e63946] text-white'
                    : 'text-gray-300 hover:bg-[#2d3a4f] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {isExpanded && <span className="ml-2 text-xs">{item.label}</span>}
                {item.badge && isExpanded && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {item.badge && !isExpanded && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-700">
          <div ref={!isMobileOpen ? exitMenuRef : undefined} className="relative">
            <button
              onClick={() => setShowExitMenu(!showExitMenu)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
                showExitMenu ? 'bg-[#2d3a4f] text-white' : 'text-gray-300 hover:bg-[#2d3a4f] hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {isExpanded && <span className="text-xs">Ir a...</span>}
              </div>
              {isExpanded && <ChevronUp className={`w-3 h-3 transition-transform ${showExitMenu ? '' : 'rotate-180'}`} />}
            </button>
            {showExitMenu && (
              <div className={`absolute bottom-full mb-1 bg-[#2d3a4f] rounded-lg overflow-hidden shadow-xl border border-gray-600 ${isExpanded ? 'left-0 w-full' : 'left-full ml-2 w-44'}`}>
                <a href="https://app.psivisionhub.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-[#3d4a5f] hover:text-white transition-colors">
                  <Home className="w-4 h-4" />
                  <span className="text-xs">Ir a Home</span>
                </a>
                <a href="https://app.psivisionhub.com/crm" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-[#3d4a5f] hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">Ir al CRM</span>
                </a>
                <div className="border-t border-gray-600">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs">Cerrar sesion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-48' : 'w-14'}`} />
      <div className="lg:hidden h-12" />
    </React.Fragment>
  );
}
