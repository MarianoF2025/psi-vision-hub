'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, MessageSquare, ChevronRight, Lightbulb, Home, BarChart3, LogIn, LogOut, User, Menu, X } from 'lucide-react';

const MODULOS = [
  {
    id: 'vision-hub',
    nombre: 'PSI Vision Hub',
    subtitulo: 'Marketing, Ventas & Analytics',
    descripcion: 'Vision Hub integra todos los tableros de marketing, ventas y alumnos en un solo espacio. Te muestra metricas en tiempo real y te avisa cuando algo necesita atencion.',
    caracteristicas: [
      'Marketing: CPL, ROI y rendimiento por canal',
      'Ventas: conversion, ranking y evolucion',
      'Alumnos: retencion, progreso y satisfaccion',
      'IA: alertas y recomendaciones automaticas',
    ],
    frase: 'Datos claros para decidir mejor, todos los dias.',
    icono: Eye,
    colorBg: 'bg-red-100',
    colorIcono: 'text-red-500',
    colorBtn: 'bg-red-500 hover:bg-red-600',
    colorDot: 'bg-red-400',
    href: '/tableros',
  },
  {
    id: 'centralwap',
    nombre: 'Centralwap',
    subtitulo: 'Tu espacio de trabajo en WhatsApp',
    descripcion: 'Centralwap te ayuda a tener todo en un solo lugar: contactos, mensajes y seguimientos. Podes ver cada conversacion, marcar su estado y dejar que el sistema te recuerde los seguimientos.',
    caracteristicas: [
      'Bandeja ordenada por tipo de contacto',
      'Seguimientos automaticos y recordatorios',
      'Historial completo y trazabilidad en Supabase',
      'Integracion directa con Vision Hub',
    ],
    frase: 'Simple, organizado y hecho para trabajar tranquilo.',
    icono: MessageSquare,
    colorBg: 'bg-indigo-100',
    colorIcono: 'text-indigo-500',
    colorBtn: 'bg-indigo-500 hover:bg-indigo-600',
    colorDot: 'bg-indigo-400',
    href: '/crm',
  },
];

const SIDEBAR_ITEMS = [
  { id: 'inicio', nombre: 'Inicio', icono: Home, href: '/', activo: true },
  { id: 'vision-hub', nombre: 'PSI Vision Hub', icono: BarChart3, href: '/tableros', activo: false },
  { id: 'centralwap', nombre: 'Centralwap', icono: MessageSquare, href: '/crm', activo: false },
];

export default function HomePage() {
  const { user, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = user?.user_metadata?.nombre || user?.user_metadata?.full_name || user?.email?.split('@')[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <Eye size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">PSI</p>
            <p className="text-[10px] text-slate-400">Vision Hub</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 text-white"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-14"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed top-14 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="flex-1 p-2">
          {SIDEBAR_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm ${
                item.activo
                  ? 'bg-red-500 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icono size={18} />
              <span className="font-medium">{item.nombre}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        )}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-52 bg-slate-900 text-white flex-col fixed top-0 left-0 bottom-0">
        <div className="p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <Eye size={18} />
          </div>
          <div>
            <p className="font-bold text-sm">PSI</p>
            <p className="text-[10px] text-slate-400">Vision Hub</p>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {SIDEBAR_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors text-sm ${
                item.activo
                  ? 'bg-red-500 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icono size={18} />
              <span className="font-medium">{item.nombre}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="p-3 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesion
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-52">
        {/* Spacer for mobile header */}
        <div className="h-14 lg:hidden" />

        {/* Header Desktop */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
              PSI
            </div>
            <div className="hidden sm:block">
              <p className="font-semibold text-slate-800 text-sm">PSI Asociacion</p>
              <p className="text-[10px] text-slate-500">Vision Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tableros" className="hidden sm:flex px-3 py-1.5 bg-red-500 text-white rounded-full text-xs font-medium items-center gap-1.5 hover:bg-red-600">
              <Eye size={14} /> Vision Hub
            </Link>
            <Link href="/crm" className="hidden sm:flex px-3 py-1.5 border border-slate-300 text-slate-700 rounded-full text-xs font-medium items-center gap-1.5 hover:bg-slate-50">
              <MessageSquare size={14} /> CRM
            </Link>

            {loading ? (
              <div className="px-3 py-1.5 border border-slate-200 rounded-full">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                  <User size={14} />
                  {userName}
                </div>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 border border-red-300 text-red-600 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} /> <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50">
                <LogIn size={14} /> <span className="hidden sm:inline">Iniciar sesion</span>
              </Link>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 lg:overflow-auto">
          <div className="max-w-5xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">PSI Plataforma Integral</h1>
              <p className="text-sm text-slate-600 max-w-xl mx-auto px-4">
                Centraliza todos tus procesos empresariales. Desde marketing y ventas hasta gestion de clientes y administracion educativa.
              </p>
            </div>

            {/* Modulos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODULOS.map((modulo) => (
                <div key={modulo.id} className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5 hover:shadow-lg transition-shadow">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl ${modulo.colorBg} flex items-center justify-center mb-3 lg:mb-4`}>
                    <modulo.icono size={20} className={`lg:hidden ${modulo.colorIcono}`} />
                    <modulo.icono size={24} className={`hidden lg:block ${modulo.colorIcono}`} />
                  </div>

                  <h2 className="text-lg lg:text-xl font-bold text-slate-800 mb-0.5">{modulo.nombre}</h2>
                  <p className="text-slate-500 text-sm mb-2 lg:mb-3">{modulo.subtitulo}</p>

                  <p className="text-slate-600 text-sm mb-3 lg:mb-4">{modulo.descripcion}</p>

                  <ul className="space-y-1.5 mb-3 lg:mb-4">
                    {modulo.caracteristicas.map((car, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600 text-sm">
                        <span className={`w-1.5 h-1.5 rounded-full ${modulo.colorDot} mt-1.5 flex-shrink-0`} />
                        {car}
                      </li>
                    ))}
                  </ul>

                  <div className="bg-slate-50 rounded-lg p-2.5 lg:p-3 flex items-center gap-2 mb-3 lg:mb-4">
                    <Lightbulb size={16} className="text-slate-400 flex-shrink-0" />
                    <p className="text-xs text-slate-600">{modulo.frase}</p>
                  </div>

                  <Link
                    href={modulo.href}
                    className={`w-full py-2.5 ${modulo.colorBtn} text-white rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors`}
                  >
                    Acceder <ChevronRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
