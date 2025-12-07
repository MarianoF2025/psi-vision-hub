'use client';
import { useCRMStore } from '@/stores/crm-store';
import ConversacionesPanel from '@/components/crm/ConversacionesPanel';
import ChatPanel from '@/components/crm/ChatPanel';
import InfoContactoPanel from '@/components/crm/InfoContactoPanel';

export default function CRMPage() {
  const { panelInfoAbierto, conversacionActual } = useCRMStore();
  return (
    <div className="flex w-full h-full overflow-hidden">
      <ConversacionesPanel />
      <ChatPanel />
      {panelInfoAbierto && conversacionActual && <InfoContactoPanel />}
    </div>
  );
}
