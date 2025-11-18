import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Brain } from 'lucide-react';

export default async function IATCCPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userRole={user?.role} />
      
      <div className="flex-1 ml-64">
        <Header userName={user?.name} userEmail={user?.email} />
        
        <main className="pt-24 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">IA Especialista TCC</h1>
                  <p className="text-slate-600">Asistente de IA para Terapia Cognitivo-Conductual</p>
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-6">
                <p className="text-slate-600">
                  Módulo de IA Especialista TCC en desarrollo. Disponible para alumnos y staff.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

