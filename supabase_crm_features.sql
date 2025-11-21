-- Tabla para mensajes destacados/favoritos
CREATE TABLE IF NOT EXISTS mensajes_destacados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensaje_id UUID NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mensaje_id, usuario_id)
);

-- Tabla para mensajes fijados
CREATE TABLE IF NOT EXISTS mensajes_fijados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensaje_id UUID NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mensaje_id, conversacion_id, usuario_id)
);

-- Tabla para respuestas a mensajes (reply/quote)
CREATE TABLE IF NOT EXISTS mensajes_respuestas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensaje_id UUID NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
  mensaje_respuesta_id UUID NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mensaje_id, mensaje_respuesta_id)
);

-- Agregar columna para mensajes reenviados
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'mensajes' AND column_name = 'reenviado') THEN
    ALTER TABLE mensajes ADD COLUMN reenviado BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'mensajes' AND column_name = 'mensaje_original_id') THEN
    ALTER TABLE mensajes ADD COLUMN mensaje_original_id UUID REFERENCES mensajes(id);
  END IF;
END $$;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_mensajes_destacados_usuario ON mensajes_destacados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_destacados_mensaje ON mensajes_destacados(mensaje_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_fijados_conversacion ON mensajes_fijados(conversacion_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_respuestas_mensaje ON mensajes_respuestas(mensaje_id);

-- RLS (Row Level Security)
ALTER TABLE mensajes_destacados ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_fijados ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_respuestas ENABLE ROW LEVEL SECURITY;

-- Políticas para mensajes_destacados
CREATE POLICY "Users can view their own starred messages"
  ON mensajes_destacados FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can star their own messages"
  ON mensajes_destacados FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can unstar their own messages"
  ON mensajes_destacados FOR DELETE
  USING (auth.uid() = usuario_id);

-- Políticas para mensajes_fijados
CREATE POLICY "Users can view pinned messages in their conversations"
  ON mensajes_fijados FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can pin messages in their conversations"
  ON mensajes_fijados FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can unpin messages in their conversations"
  ON mensajes_fijados FOR DELETE
  USING (auth.uid() = usuario_id);

-- Políticas para mensajes_respuestas
CREATE POLICY "Users can view message replies"
  ON mensajes_respuestas FOR SELECT
  USING (true);

CREATE POLICY "Users can create message replies"
  ON mensajes_respuestas FOR INSERT
  WITH CHECK (true);


