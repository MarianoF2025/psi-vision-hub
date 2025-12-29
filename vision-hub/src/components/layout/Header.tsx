'use client';

import { Bell, Search, RefreshCw } from 'lucide-react';

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
}

export default function Header({ titulo, subtitulo }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 py-2 lg:px-4 lg:py-2.5">
      <div className="flex items-center justify-between">
        {/* Título */}
        <div className="min-w-0 flex-1">
          <h1 className="text-base lg:text-lg font-bold text-gray-900 truncate">{titulo}</h1>
          {subtitulo && (
            <p className="text-[10px] lg:text-xs text-gray-500 truncate">{subtitulo}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center space-x-2 lg:space-x-3 ml-2">
          {/* Search - solo desktop */}
          <div className="hidden md:block relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e63946] focus:border-transparent w-40 lg:w-48"
            />
          </div>

          {/* Refresh */}
          <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#e63946] rounded-full" />
          </button>

          {/* Avatar */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-[#e63946] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">N</span>
            </div>
            <span className="hidden sm:block text-xs font-medium text-gray-700">Nina</span>
          </div>
        </div>
      </div>
    </header>
  );
}
