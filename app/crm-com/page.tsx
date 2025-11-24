import { getCurrentUser } from '@/lib/auth';
import CRMInterface from '@/components/crm/CRMInterface';
import { redirect } from 'next/navigation';

export default async function CRMComPage() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect('/login');
    }

    return (
      <div className="h-screen w-screen overflow-auto">
        <CRMInterface user={user} />
      </div>
    );
  } catch (error) {
    console.error('Error en CRMComPage:', error);
    redirect('/login');
  }
}
