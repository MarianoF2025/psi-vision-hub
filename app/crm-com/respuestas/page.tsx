import { getCurrentUser } from '@/lib/auth';
import QuickRepliesPage from '@/components/crm/pages/QuickRepliesPage';
import { redirect } from 'next/navigation';

const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@local.com',
  role: 'admin' as const,
  name: 'Usuario Desarrollo',
};

export default async function RespuestasPage() {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ALLOW_LOCAL_ACCESS === 'true';
    
    let user = await getCurrentUser();
    
    if (!user && isDevelopment) {
      user = MOCK_USER;
    }
    
    if (!user) {
      redirect('/login');
    }

    return <QuickRepliesPage user={user} />;
  } catch (error) {
    console.error('Error en RespuestasPage:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ALLOW_LOCAL_ACCESS === 'true';
    
    if (isDevelopment) {
      return <QuickRepliesPage user={MOCK_USER} />;
    }
    
    redirect('/login');
  }
}

