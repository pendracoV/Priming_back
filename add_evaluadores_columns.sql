-- Agregar columnas faltantes a la tabla evaluadores
ALTER TABLE evaluadores ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10);
ALTER TABLE evaluadores ADD COLUMN IF NOT EXISTS nombre VARCHAR(100);

-- Actualizar constraint después de agregar la columna (solo si la columna está vacía)
-- Nota: Si hay datos existentes, primero debes actualizarlos antes de agregar el constraint
DO $$ 
BEGIN
    -- Agregar constraint para tipo_documento si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluadores_tipo_documento_check'
    ) THEN
        ALTER TABLE evaluadores 
        ADD CONSTRAINT evaluadores_tipo_documento_check 
        CHECK (tipo_documento IN ('TI', 'CC'));
    END IF;
END $$;

-- Comentarios
COMMENT ON COLUMN evaluadores.tipo_documento IS 'Tipo de documento de identidad: TI (Tarjeta de Identidad) o CC (Cédula de Ciudadanía)';
COMMENT ON COLUMN evaluadores.nombre IS 'Nombre completo del evaluador';

SELECT 'Columnas agregadas exitosamente a la tabla evaluadores' AS resultado;
