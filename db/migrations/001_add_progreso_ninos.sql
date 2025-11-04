-- Migración: Agregar tabla de progreso detallado para niños
-- Fecha: 2025-11-03
-- Descripción: Agrega la tabla progreso_ninos para gestionar el progreso de cada niño por juego y dificultad

-- Verificar si la tabla ya existe antes de crearla
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'progreso_ninos') THEN
        
        -- Crear la tabla
        CREATE TABLE progreso_ninos (
            id SERIAL PRIMARY KEY,
            nino_id INTEGER NOT NULL REFERENCES ninos(id) ON DELETE CASCADE,
            game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('cognados', 'pares-minimos')),
            difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('facil', 'medio', 'dificil')),
            current_level INTEGER NOT NULL DEFAULT 1,
            accumulated_score INTEGER NOT NULL DEFAULT 200,
            last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (nino_id, game_type, difficulty)
        );

        -- Crear índices para mejorar el rendimiento
        CREATE INDEX idx_progreso_ninos_nino_id ON progreso_ninos(nino_id);
        CREATE INDEX idx_progreso_ninos_game_type ON progreso_ninos(game_type);
        CREATE INDEX idx_progreso_ninos_difficulty ON progreso_ninos(difficulty);
        CREATE INDEX idx_progreso_ninos_last_played ON progreso_ninos(last_played DESC);

        -- Agregar comentarios a la tabla y columnas
        COMMENT ON TABLE progreso_ninos IS 'Almacena el progreso detallado de cada niño por juego y dificultad';
        COMMENT ON COLUMN progreso_ninos.nino_id IS 'ID del niño';
        COMMENT ON COLUMN progreso_ninos.game_type IS 'Tipo de juego: cognados o pares-minimos';
        COMMENT ON COLUMN progreso_ninos.difficulty IS 'Dificultad: facil, medio o dificil';
        COMMENT ON COLUMN progreso_ninos.current_level IS 'Nivel actual en el que se encuentra el niño';
        COMMENT ON COLUMN progreso_ninos.accumulated_score IS 'Puntaje acumulado del niño en esta combinación de juego/dificultad';
        COMMENT ON COLUMN progreso_ninos.last_played IS 'Última vez que el niño jugó este juego/dificultad';

        RAISE NOTICE 'Tabla progreso_ninos creada exitosamente';
    ELSE
        RAISE NOTICE 'La tabla progreso_ninos ya existe, omitiendo creación';
    END IF;
END $$;

-- Crear función para actualizar el timestamp automáticamente
CREATE OR REPLACE FUNCTION update_progreso_ninos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_update_progreso_ninos_updated_at ON progreso_ninos;
CREATE TRIGGER trigger_update_progreso_ninos_updated_at
    BEFORE UPDATE ON progreso_ninos
    FOR EACH ROW
    EXECUTE FUNCTION update_progreso_ninos_updated_at();

-- Verificar que la migración fue exitosa
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'progreso_ninos') THEN
        RAISE NOTICE '✅ Migración completada exitosamente';
        RAISE NOTICE '📊 Tabla progreso_ninos está lista para usar';
    ELSE
        RAISE EXCEPTION '❌ Error: La tabla progreso_ninos no fue creada';
    END IF;
END $$;
