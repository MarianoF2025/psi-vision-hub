import { getCurrentUser } from '@/lib/auth';
import SettingsPage from '@/components/crm/pages/SettingsPage';
import { redirect } from 'next/navigation';

const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@local.com',
  role: 'admin' as const,
  name: 'Usuario Desarrollo',
};

export default async function AjustesPage() {
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

    return <SettingsPage user={user} />;
  } catch (error) {
    console.error('Error en AjustesPage:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ALLOW_LOCAL_ACCESS === 'true';
    
    if (isDevelopment) {
      return <SettingsPage user={MOCK_USER} />;
    }
    
    redirect('/login');
  }
}

