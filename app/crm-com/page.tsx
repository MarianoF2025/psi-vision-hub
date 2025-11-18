import { getCurrentUser } from '@/lib/auth';
import CRMInterface from '@/components/crm/CRMInterface';

export default async function CRMComPage() {
  const user = await getCurrentUser();

  return (
    <div className="fixed inset-0 overflow-hidden">
      <CRMInterface user={user} />
    </div>
  );
}
