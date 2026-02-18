'use client';

import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
}

export default function Header({ titulo, subtitulo }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 py-2 lg:px-4 lg:py-2.5">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-base lg:text-lg font-bold text-gray-900 truncate">{titulo}</h1>
          {subtitulo && (
            <p className="text-[10px] lg:text-xs text-gray-500 truncate">{subtitulo}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 lg:space-x-3 ml-2">
          <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
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
