import { getCurrentUser } from '@/lib/auth';
import TagsPage from '@/components/crm/pages/TagsPage';
import { redirect } from 'next/navigation';

const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@local.com',
  role: 'admin' as const,
  name: 'Usuario Desarrollo',
};

export default async function EtiquetasPage() {
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

    return <TagsPage user={user} />;
  } catch (error) {
    console.error('Error en EtiquetasPage:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ALLOW_LOCAL_ACCESS === 'true';
    
    if (isDevelopment) {
      return <TagsPage user={MOCK_USER} />;
    }
    
    redirect('/login');
  }
}

