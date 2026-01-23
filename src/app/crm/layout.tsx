'use client';
import { useEffect } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import Sidebar from '@/components/crm/Sidebar';
import ChatbotAsistente from '@/components/crm/ChatbotAsistente';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { darkMode } = useCRMStore();
  
  // Registrar conexión/desconexión del agente
  useSessionTracker();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
      <ChatbotAsistente />
    </div>
  );
}
