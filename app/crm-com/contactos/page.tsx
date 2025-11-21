import { getCurrentUser } from '@/lib/auth';
import ContactsPage from '@/components/crm/pages/ContactsPage';
import { redirect } from 'next/navigation';

const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@local.com',
  role: 'admin' as const,
  name: 'Usuario Desarrollo',
};

export default async function ContactosPage() {
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

    return <ContactsPage user={user} />;
  } catch (error) {
    console.error('Error en ContactosPage:', error);
    
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ALLOW_LOCAL_ACCESS === 'true';
    
    if (isDevelopment) {
      return <ContactsPage user={MOCK_USER} />;
    }
    
    redirect('/login');
  }
}

