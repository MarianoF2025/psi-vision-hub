-- Sistema de Tickets con Auditoría Completa
-- PSI Vision Hub - Router + CRM

-- Tabla de Derivaciones (Tickets)
CREATE TABLE IF NOT EXISTS derivaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_numero TEXT UNIQUE NOT NULL,
  conversacion_id UUID REFERENCES conversaciones(id) ON DELETE CASCADE,
  telefono TEXT NOT NULL,
  nombre_contacto TEXT,
  
  -- Auditoría
  area_origen TEXT NOT NULL,
  area_destino TEXT NOT NULL,
  motivo TEXT NOT NULL,
  contexto_completo JSONB,
  
  -- Estados y seguimiento
  estado TEXT DEFAULT 'Pendiente', -- Pendiente, Asignado, En_Proceso, Resuelto, Cerrado
  prioridad TEXT DEFAULT 'Normal', -- Baja, Normal, Alta, Urgente
  asignado_a TEXT,
  fecha_asignacion TIMESTAMPTZ,
  fecha_primera_respuesta TIMESTAMPTZ,
  fecha_resolucion TIMESTAMPTZ,
  
  -- Métricas
  tiempo_respuesta_minutos INTEGER,
  satisfaccion_cliente INTEGER CHECK (satisfaccion_cliente >= 1 AND satisfaccion_cliente <= 5),
  notas_internas TEXT,
  derivado_por TEXT DEFAULT 'Router Automático',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Eventos de Tickets para auditoría completa
CREATE TABLE IF NOT EXISTS ticket_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES derivaciones(id) ON DELETE CASCADE,
  evento_tipo TEXT NOT NULL, -- 'creado', 'asignado', 'respondido', 'transferido', 'cerrado', 'reabierto'
  descripcion TEXT,
  usuario TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_derivaciones_ticket_numero ON derivaciones(ticket_numero);
CREATE INDEX IF NOT EXISTS idx_derivaciones_conversacion_id ON derivaciones(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_derivaciones_estado ON derivaciones(estado);
CREATE INDEX IF NOT EXISTS idx_derivaciones_area_destino ON derivaciones(area_destino);
CREATE INDEX IF NOT EXISTS idx_derivaciones_created_at ON derivaciones(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_eventos_ticket_id ON ticket_eventos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_eventos_evento_tipo ON ticket_eventos(evento_tipo);

-- Actualizar tabla conversaciones para incluir campos de tickets
ALTER TABLE conversaciones 
  ADD COLUMN IF NOT EXISTS ticket_activo UUID REFERENCES derivaciones(id),
  ADD COLUMN IF NOT EXISTS ticket_numero TEXT,
  ADD COLUMN IF NOT EXISTS menu_actual TEXT DEFAULT 'principal',
  ADD COLUMN IF NOT EXISTS submenu_actual TEXT,
  ADD COLUMN IF NOT EXISTS ultima_interaccion TIMESTAMPTZ DEFAULT NOW();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en derivaciones
DROP TRIGGER IF EXISTS update_derivaciones_updated_at ON derivaciones;
CREATE TRIGGER update_derivaciones_updated_at
  BEFORE UPDATE ON derivaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vista de rendimiento por área
CREATE OR REPLACE VIEW vista_rendimiento_areas AS
SELECT 
  area_destino,
  COUNT(*) as tickets_totales,
  COUNT(*) FILTER (WHERE estado = 'Resuelto') as resueltos,
  COUNT(*) FILTER (WHERE estado = 'Cerrado') as cerrados,
  AVG(tiempo_respuesta_minutos) as tiempo_promedio_minutos,
  COUNT(*) FILTER (WHERE prioridad = 'Alta') as alta_prioridad,
  COUNT(*) FILTER (WHERE prioridad = 'Urgente') as urgente,
  COUNT(*) FILTER (WHERE estado = 'Pendiente') as pendientes,
  COUNT(*) FILTER (WHERE estado = 'En_Proceso') as en_proceso
FROM derivaciones 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY area_destino
ORDER BY tickets_totales DESC;

-- Comentarios para documentación
COMMENT ON TABLE derivaciones IS 'Sistema de tickets/derivaciones con auditoría completa';
COMMENT ON TABLE ticket_eventos IS 'Eventos de auditoría para cada ticket';
COMMENT ON VIEW vista_rendimiento_areas IS 'Métricas de rendimiento por área de los últimos 30 días';

