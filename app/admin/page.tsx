import { getCurrentUser } from '@/lib/auth';
import { hasAdminAccess } from '@/lib/utils';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Settings, Users, Database } from 'lucide-react';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || !hasAdminAccess(user.role)) {
    redirect('/');
  }

  const adminSections = [
    {
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios, roles y permisos del sistema',
      icon: Users,
      href: '/admin/usuarios',
    },
    {
      title: 'Configuración del Sistema',
      description: 'Ajustes generales y configuración de la plataforma',
      icon: Settings,
      href: '/admin/configuracion',
    },
    {
      title: 'Base de Datos',
      description: 'Gestión y monitoreo de la base de datos',
      icon: Database,
      href: '/admin/database',
    },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userRole={user?.role} />
      
      <div className="flex-1 ml-64">
        <Header userName={user?.name} userEmail={user?.email} />
        
        <main className="pt-24 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Administración</h1>
              <p className="text-lg text-slate-600">
                Panel de administración del sistema
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminSections.map((section) => {
                const Icon = section.icon;
                return (
                  <div
                    key={section.title}
                    className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 hover:border-primary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{section.title}</h3>
                    <p className="text-slate-600 text-sm">{section.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

