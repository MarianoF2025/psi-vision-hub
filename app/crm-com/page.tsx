import { getCurrentUser } from '@/lib/auth';
import CRMInterface from '@/components/crm/CRMInterface';
import { redirect } from 'next/navigation';

export default async function CRMComPage() {
  try {
    const user = await getCurrentUser();
    
    // Si no hay usuario, redirigir al login
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
    // Si hay un error crítico, redirigir al login
    redirect('/login');
  }
}
