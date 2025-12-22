import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Endpoint para procesar status updates de WhatsApp (read receipts)
router.post('/status', async (req: Request, res: Response) => {
  try {
    const { statuses } = req.body;
    
    if (!statuses || !Array.isArray(statuses)) {
      return res.json({ success: true, ignored: true, reason: 'No statuses' });
    }

    for (const status of statuses) {
      if (status.status === 'read' && status.id) {
        // Buscar mensaje por whatsapp_message_id y marcar como leído
        const { error } = await supabase
          .from('mensajes')
          .update({ leido: true, leido_at: new Date().toISOString() })
          .eq('whatsapp_message_id', status.id);
        
        if (!error) {
          console.log(`✓✓ Mensaje marcado como leído: ${status.id.substring(0, 30)}...`);
        }
      }
    }

    res.json({ success: true, processed: statuses.length });
  } catch (error: any) {
    console.error('Error procesando status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
