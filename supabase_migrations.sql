-- Tabla para reacciones a mensajes
CREATE TABLE IF NOT EXISTS mensaje_reacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensaje_id UUID NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mensaje_id, usuario_id, emoji)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_mensaje_reacciones_mensaje_id ON mensaje_reacciones(mensaje_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_reacciones_usuario_id ON mensaje_reacciones(usuario_id);

-- Agregar columnas de edición y eliminación a mensajes si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'mensajes' AND column_name = 'editado') THEN
    ALTER TABLE mensajes ADD COLUMN editado BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'mensajes' AND column_name = 'eliminado') THEN
    ALTER TABLE mensajes ADD COLUMN eliminado BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Agregar columna codigo a respuestas_rapidas si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'respuestas_rapidas' AND column_name = 'codigo') THEN
    ALTER TABLE respuestas_rapidas ADD COLUMN codigo TEXT;
  END IF;
END $$;

-- RLS (Row Level Security) para mensaje_reacciones
ALTER TABLE mensaje_reacciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reactions"
  ON mensaje_reacciones FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reactions"
  ON mensaje_reacciones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own reactions"
  ON mensaje_reacciones FOR DELETE
  USING (auth.uid() = usuario_id);

