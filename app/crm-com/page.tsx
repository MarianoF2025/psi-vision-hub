import { getCurrentUser } from '@/lib/auth';
import CRMInterface from '@/components/crm/CRMInterface';
import { redirect } from 'next/navigation';

// Usuario mock para desarrollo local
const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@local.com',
  role: 'admin' as const,
  name: 'Usuario Desarrollo',
};

export default async function CRMComPage() {
  try {
    // En desarrollo local, permitir acceso sin autenticación
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ALLOW_LOCAL_ACCESS === 'true';
    
    let user = await getCurrentUser();
    
    // Si no hay usuario y estamos en desarrollo, usar usuario mock
    if (!user && isDevelopment) {
      console.log('🔧 Modo desarrollo: usando usuario mock para CRM');
      user = MOCK_USER;
    }
    
    // Si no hay usuario y NO estamos en desarrollo, redirigir al login
    if (!user) {
      redirect('/login');
    }

    return (
      <div className="fixed inset-0 overflow-hidden">
        <CRMInterface user={user} />
      </div>
    );
  } catch (error) {
    console.error('Error en CRMComPage:', error);
    
    // En desarrollo, permitir acceso incluso con errores
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ALLOW_LOCAL_ACCESS === 'true';
    
    if (isDevelopment) {
      console.log('🔧 Modo desarrollo: permitiendo acceso con usuario mock después de error');
      return (
        <div className="fixed inset-0 overflow-hidden">
          <CRMInterface user={MOCK_USER} />
        </div>
      );
    }
    
    // Si hay un error crítico y NO estamos en desarrollo, redirigir al login
    redirect('/login');
  }
}
