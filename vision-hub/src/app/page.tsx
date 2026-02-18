'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import MorningBriefing from '@/components/home/MorningBriefing';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e63946]"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <Header titulo="Dashboard" subtitulo="Centro de comando PSI" />
      <div className="p-3 lg:p-4 space-y-3 lg:space-y-4">
        <MorningBriefing />
      </div>
    </div>
  );
}
