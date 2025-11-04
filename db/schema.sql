-- ============================================================================
-- ESQUEMA DE BASE DE DATOS COMPLETO PARA EL PROYECTO PRIMING
-- ============================================================================
-- Proyecto: Sistema de Aprendizaje de Inglés para Niños
-- Versión: 1.0.0
-- Fecha: 3 de noviembre de 2025
-- ============================================================================

-- Configuración inicial
SET client_encoding = 'UTF8';
SET timezone = 'America/Bogota';

-- Eliminar tablas si existen (en orden inverso a las dependencias)
DROP TABLE IF EXISTS resultados_encuesta CASCADE;
DROP TABLE IF EXISTS progreso_ninos CASCADE;
DROP TABLE IF EXISTS progreso_juego CASCADE;
DROP TABLE IF EXISTS encuestas CASCADE;
DROP TABLE IF EXISTS seleccionables CASCADE;
DROP TABLE IF EXISTS indicadores CASCADE;
DROP TABLE IF EXISTS niveles CASCADE;
DROP TABLE IF EXISTS juegos CASCADE;
DROP TABLE IF EXISTS ninos CASCADE;
DROP TABLE IF EXISTS evaluadores CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================================================
-- TABLA: usuarios
-- Descripción: Tabla principal de usuarios del sistema
-- Tipos: admin, evaluador, niño
-- ============================================================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo_electronico VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL, -- Aumentado para bcrypt hash
    tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('administrador', 'evaluador', 'niño')),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_correo ON usuarios(correo_electronico);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo_usuario);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- Comentarios de la tabla usuarios
COMMENT ON TABLE usuarios IS 'Tabla principal de usuarios del sistema (administradores, evaluadores y niños)';
COMMENT ON COLUMN usuarios.contrasena IS 'Hash de contraseña generado con bcrypt';
COMMENT ON COLUMN usuarios.tipo_usuario IS 'Tipo de usuario: administrador, evaluador o niño';

-- ============================================================================
-- TABLA: evaluadores
-- Descripción: Información específica de evaluadores
-- Tipos: Estudiante, Docente, Egresado
-- ============================================================================

CREATE TABLE evaluadores (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Estudiante', 'Docente', 'Egresado')),
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('TI', 'CC')),
    nombre VARCHAR(100) NOT NULL,
    institucion VARCHAR(150),
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id)
);

-- Índices para evaluadores
CREATE INDEX idx_evaluadores_usuario_id ON evaluadores(usuario_id);
CREATE INDEX idx_evaluadores_codigo ON evaluadores(codigo);
CREATE INDEX idx_evaluadores_tipo ON evaluadores(tipo);

-- Comentarios de la tabla evaluadores
COMMENT ON TABLE evaluadores IS 'Información adicional de usuarios tipo evaluador';
COMMENT ON COLUMN evaluadores.codigo IS 'Código único de identificación del evaluador';
COMMENT ON COLUMN evaluadores.tipo IS 'Tipo de evaluador: Estudiante, Docente o Egresado';
COMMENT ON COLUMN evaluadores.tipo_documento IS 'Tipo de documento de identidad: TI (Tarjeta de Identidad) o CC (Cédula de Ciudadanía)';
COMMENT ON COLUMN evaluadores.nombre IS 'Nombre completo del evaluador';

-- ============================================================================
-- TABLA: ninos
-- Descripción: Información específica de niños
-- Edades: 5-7 años, Grados: Preescolar (-1) a 2do primaria (2)
-- ============================================================================

CREATE TABLE ninos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    edad INTEGER NOT NULL CHECK (edad BETWEEN 5 AND 7),
    grado INTEGER NOT NULL CHECK (grado BETWEEN -1 AND 2), -- -1 para preescolar, 0-2 para primaria
    colegio VARCHAR(150) NOT NULL,
    jornada VARCHAR(50) NOT NULL CHECK (jornada IN ('mañana', 'tarde', 'Continua')),
    fecha_nacimiento DATE,
    genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro')),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id)
);

-- Índices para niños
CREATE INDEX idx_ninos_usuario_id ON ninos(usuario_id);
CREATE INDEX idx_ninos_edad ON ninos(edad);
CREATE INDEX idx_ninos_grado ON ninos(grado);
CREATE INDEX idx_ninos_colegio ON ninos(colegio);

-- Comentarios de la tabla ninos
COMMENT ON TABLE ninos IS 'Información de niños participantes en el sistema';
COMMENT ON COLUMN ninos.grado IS 'Grado escolar: -1 (preescolar), 0 (transición), 1 (primero), 2 (segundo)';
COMMENT ON COLUMN ninos.jornada IS 'Jornada escolar del niño';

-- ============================================================================
-- TABLA: juegos
-- Descripción: Catálogo de juegos disponibles (Cognados, Pares Mínimos)
-- ============================================================================

CREATE TABLE juegos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    imagen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para juegos
CREATE INDEX idx_juegos_activo ON juegos(activo);
CREATE INDEX idx_juegos_orden ON juegos(orden);

-- Comentarios de la tabla juegos
COMMENT ON TABLE juegos IS 'Catálogo de juegos educativos disponibles';
COMMENT ON COLUMN juegos.orden IS 'Orden de visualización de los juegos';

-- ============================================================================
-- TABLA: niveles
-- Descripción: Niveles de cada juego por dificultad
-- Dificultades: fácil, medio, difícil
-- ============================================================================

CREATE TABLE niveles (
    id SERIAL PRIMARY KEY,
    juego_id INTEGER NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    numero_nivel INTEGER NOT NULL,
    descripcion TEXT,
    dificultad VARCHAR(50) NOT NULL CHECK (dificultad IN ('facil', 'medio', 'dificil')),
    instrucciones TEXT,
    tiempo_maximo INTEGER NOT NULL, -- en segundos
    audio_entrenamiento VARCHAR(255),
    puntos_base INTEGER DEFAULT 100,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para niveles
CREATE INDEX idx_niveles_juego_id ON niveles(juego_id);
CREATE INDEX idx_niveles_dificultad ON niveles(dificultad);
CREATE INDEX idx_niveles_numero ON niveles(numero_nivel);
CREATE INDEX idx_niveles_activo ON niveles(activo);

-- Comentarios de la tabla niveles
COMMENT ON TABLE niveles IS 'Niveles de cada juego organizados por dificultad';
COMMENT ON COLUMN niveles.tiempo_maximo IS 'Tiempo máximo en segundos para completar el nivel';
COMMENT ON COLUMN niveles.puntos_base IS 'Puntos base que se otorgan al completar el nivel';

-- ============================================================================
-- TABLA: indicadores
-- Descripción: Indicadores visuales y auditivos para cada nivel
-- ============================================================================

CREATE TABLE indicadores (
    id SERIAL PRIMARY KEY,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    imagen VARCHAR(255),
    audio VARCHAR(255),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para indicadores
CREATE INDEX idx_indicadores_nivel_id ON indicadores(nivel_id);
CREATE INDEX idx_indicadores_activo ON indicadores(activo);

-- Comentarios de la tabla indicadores
COMMENT ON TABLE indicadores IS 'Indicadores (imágenes y audios) utilizados en los niveles';
COMMENT ON COLUMN indicadores.audio IS 'Ruta del archivo de audio del indicador';

-- ============================================================================
-- TABLA: seleccionables
-- Descripción: Elementos seleccionables en cada nivel
-- ============================================================================

CREATE TABLE seleccionables (
    id SERIAL PRIMARY KEY,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    indicador_id INTEGER NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
    palabra VARCHAR(100) NOT NULL,
    imagen VARCHAR(255),
    audio VARCHAR(255),
    correcto BOOLEAN NOT NULL,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para seleccionables
CREATE INDEX idx_seleccionables_nivel_id ON seleccionables(nivel_id);
CREATE INDEX idx_seleccionables_indicador_id ON seleccionables(indicador_id);
CREATE INDEX idx_seleccionables_correcto ON seleccionables(correcto);

-- Comentarios de la tabla seleccionables
COMMENT ON TABLE seleccionables IS 'Elementos que el niño puede seleccionar durante el juego';
COMMENT ON COLUMN seleccionables.correcto IS 'Indica si es la opción correcta para el indicador';

-- ============================================================================
-- TABLA: encuestas
-- Descripción: Relación entre evaluadores y niños (asignaciones)
-- ============================================================================

CREATE TABLE encuestas (
    id SERIAL PRIMARY KEY,
    nino_id INTEGER NOT NULL REFERENCES ninos(id) ON DELETE CASCADE,
    evaluador_id INTEGER NOT NULL REFERENCES evaluadores(id) ON DELETE CASCADE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    num_intentos INTEGER DEFAULT 0,
    num_sesion INTEGER DEFAULT 1,
    observaciones TEXT,
    estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'cancelada')),
    fecha_completada TIMESTAMP
);

-- Índices para encuestas
CREATE INDEX idx_encuestas_nino_id ON encuestas(nino_id);
CREATE INDEX idx_encuestas_evaluador_id ON encuestas(evaluador_id);
CREATE INDEX idx_encuestas_fecha ON encuestas(fecha DESC);
CREATE INDEX idx_encuestas_estado ON encuestas(estado);

-- Comentarios de la tabla encuestas
COMMENT ON TABLE encuestas IS 'Asignaciones de niños a evaluadores y sesiones de evaluación';
COMMENT ON COLUMN encuestas.num_sesion IS 'Número de sesión actual del niño con este evaluador';

-- ============================================================================
-- TABLA: progreso_juego
-- Descripción: Progreso detallado por nivel individual
-- ============================================================================

CREATE TABLE progreso_juego (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    juego_id INTEGER NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    puntuacion INTEGER NOT NULL DEFAULT 0,
    tiempo INTEGER NOT NULL DEFAULT 0, -- en segundos
    aciertos INTEGER NOT NULL DEFAULT 0,
    fallos INTEGER NOT NULL DEFAULT 0,
    completado BOOLEAN NOT NULL DEFAULT FALSE,
    intentos INTEGER DEFAULT 1,
    mejor_tiempo INTEGER, -- mejor tiempo registrado
    mejor_puntuacion INTEGER, -- mejor puntuación registrada
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, juego_id, nivel_id)
);

-- Índices para progreso_juego
CREATE INDEX idx_progreso_juego_usuario ON progreso_juego(usuario_id);
CREATE INDEX idx_progreso_juego_juego ON progreso_juego(juego_id);
CREATE INDEX idx_progreso_juego_nivel ON progreso_juego(nivel_id);
CREATE INDEX idx_progreso_juego_completado ON progreso_juego(completado);
CREATE INDEX idx_progreso_juego_fecha ON progreso_juego(fecha_actualizacion DESC);

-- Comentarios de la tabla progreso_juego
COMMENT ON TABLE progreso_juego IS 'Progreso detallado de cada usuario en cada nivel específico';
COMMENT ON COLUMN progreso_juego.tiempo IS 'Tiempo empleado en segundos en el último intento';
COMMENT ON COLUMN progreso_juego.mejor_tiempo IS 'Mejor tiempo registrado en segundos';

-- ============================================================================
-- TABLA: progreso_ninos (NUEVA)
-- Descripción: Progreso general por juego y dificultad
-- Permite continuidad de juegos entre sesiones
-- ============================================================================

CREATE TABLE progreso_ninos (
    id SERIAL PRIMARY KEY,
    nino_id INTEGER NOT NULL REFERENCES ninos(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('cognados', 'pares-minimos')),
    difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('facil', 'medio', 'dificil')),
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    accumulated_score INTEGER NOT NULL DEFAULT 200 CHECK (accumulated_score >= 0),
    total_time_played INTEGER DEFAULT 0, -- tiempo total jugado en segundos
    total_sessions INTEGER DEFAULT 0, -- número de sesiones jugadas
    last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (nino_id, game_type, difficulty)
);

-- Índices para progreso_ninos
CREATE INDEX idx_progreso_ninos_nino_id ON progreso_ninos(nino_id);
CREATE INDEX idx_progreso_ninos_game_type ON progreso_ninos(game_type);
CREATE INDEX idx_progreso_ninos_difficulty ON progreso_ninos(difficulty);
CREATE INDEX idx_progreso_ninos_last_played ON progreso_ninos(last_played DESC);
CREATE INDEX idx_progreso_ninos_current_level ON progreso_ninos(current_level);

-- Comentarios de la tabla progreso_ninos
COMMENT ON TABLE progreso_ninos IS 'Progreso general de cada niño por juego y dificultad (NUEVO - Sistema de continuidad)';
COMMENT ON COLUMN progreso_ninos.game_type IS 'Tipo de juego: cognados o pares-minimos';
COMMENT ON COLUMN progreso_ninos.difficulty IS 'Dificultad: facil, medio o dificil';
COMMENT ON COLUMN progreso_ninos.current_level IS 'Nivel actual en el que se encuentra el niño';
COMMENT ON COLUMN progreso_ninos.accumulated_score IS 'Puntaje acumulado total en esta combinación';
COMMENT ON COLUMN progreso_ninos.total_time_played IS 'Tiempo total jugado en segundos';
COMMENT ON COLUMN progreso_ninos.total_sessions IS 'Número total de sesiones jugadas';
COMMENT ON COLUMN progreso_ninos.last_played IS 'Última vez que el niño jugó esta combinación';

-- ============================================================================
-- TABLA: resultados_encuesta
-- Descripción: Respuestas de encuestas realizadas
-- ============================================================================

CREATE TABLE resultados_encuesta (
    id SERIAL PRIMARY KEY,
    encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
    pregunta VARCHAR(255) NOT NULL,
    respuesta TEXT,
    tipo_voz VARCHAR(50) CHECK (tipo_voz IN ('hombre', 'mujer', 'otro')),
    puntuacion INTEGER,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para resultados_encuesta
CREATE INDEX idx_resultados_encuesta_encuesta_id ON resultados_encuesta(encuesta_id);
CREATE INDEX idx_resultados_encuesta_fecha ON resultados_encuesta(fecha DESC);

-- Comentarios de la tabla resultados_encuesta
COMMENT ON TABLE resultados_encuesta IS 'Respuestas individuales de las encuestas realizadas';
COMMENT ON COLUMN resultados_encuesta.tipo_voz IS 'Tipo de voz del audio evaluado';

-- ============================================================================
-- TRIGGERS Y FUNCIONES
-- ============================================================================

-- Función para actualizar automáticamente fecha_actualizacion
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at en progreso_ninos
CREATE OR REPLACE FUNCTION update_progreso_ninos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para usuarios
CREATE TRIGGER trigger_update_usuarios_fecha_actualizacion
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para progreso_juego
CREATE TRIGGER trigger_update_progreso_juego_fecha_actualizacion
    BEFORE UPDATE ON progreso_juego
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para progreso_ninos
CREATE TRIGGER trigger_update_progreso_ninos_updated_at
    BEFORE UPDATE ON progreso_ninos
    FOR EACH ROW
    EXECUTE FUNCTION update_progreso_ninos_updated_at();

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Juegos disponibles
INSERT INTO juegos (id, nombre, descripcion, imagen, orden) VALUES 
(1, 'Cognados', 'Juego de palabras que suenan similar tanto en español como en inglés', '/images/juegos/cognados.png', 1),
(2, 'Pares Mínimos', 'Juego de palabras que suenan similar en su pronunciación en inglés', '/images/juegos/pares-minimos.png', 2);

-- Ajustar secuencia de juegos
SELECT setval('juegos_id_seq', (SELECT MAX(id) FROM juegos));

-- Niveles para Cognados - Fácil (10 niveles)
INSERT INTO niveles (juego_id, nombre, numero_nivel, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento, puntos_base) VALUES
(1, 'Cognados Fácil - Nivel 1', 1, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 2', 2, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 3', 3, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 4', 4, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 5', 5, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 6', 6, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 7', 7, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 8', 8, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 9', 9, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100),
(1, 'Cognados Fácil - Nivel 10', 10, 'Nivel básico de Cognados', 'facil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3', 100);

-- Niveles para Cognados - Medio (5 niveles)
INSERT INTO niveles (juego_id, nombre, numero_nivel, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento, puntos_base) VALUES
(1, 'Cognados Medio - Nivel 1', 1, 'Nivel intermedio de Cognados', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/cognados/medio/intro.mp3', 150),
(1, 'Cognados Medio - Nivel 2', 2, 'Nivel intermedio de Cognados', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/cognados/medio/intro.mp3', 150),
(1, 'Cognados Medio - Nivel 3', 3, 'Nivel intermedio de Cognados', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/cognados/medio/intro.mp3', 150),
(1, 'Cognados Medio - Nivel 4', 4, 'Nivel intermedio de Cognados', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/cognados/medio/intro.mp3', 150),
(1, 'Cognados Medio - Nivel 5', 5, 'Nivel intermedio de Cognados', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/cognados/medio/intro.mp3', 150);

-- Niveles para Cognados - Difícil (5 niveles)
INSERT INTO niveles (juego_id, nombre, numero_nivel, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento, puntos_base) VALUES
(1, 'Cognados Difícil - Nivel 1', 1, 'Nivel avanzado de Cognados', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/cognados/dificil/intro.mp3', 200),
(1, 'Cognados Difícil - Nivel 2', 2, 'Nivel avanzado de Cognados', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/cognados/dificil/intro.mp3', 200),
(1, 'Cognados Difícil - Nivel 3', 3, 'Nivel avanzado de Cognados', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/cognados/dificil/intro.mp3', 200),
(1, 'Cognados Difícil - Nivel 4', 4, 'Nivel avanzado de Cognados', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/cognados/dificil/intro.mp3', 200),
(1, 'Cognados Difícil - Nivel 5', 5, 'Nivel avanzado de Cognados', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/cognados/dificil/intro.mp3', 200);

-- Niveles para Pares Mínimos - Fácil (10 niveles)
INSERT INTO niveles (juego_id, nombre, numero_nivel, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento, puntos_base) VALUES
(2, 'Pares Mínimos Fácil - Nivel 1', 1, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 2', 2, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 3', 3, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 4', 4, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 5', 5, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 6', 6, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 7', 7, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 8', 8, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 9', 9, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100),
(2, 'Pares Mínimos Fácil - Nivel 10', 10, 'Nivel básico de Pares Mínimos', 'facil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3', 100);

-- Niveles para Pares Mínimos - Medio (5 niveles)
INSERT INTO niveles (juego_id, nombre, numero_nivel, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento, puntos_base) VALUES
(2, 'Pares Mínimos Medio - Nivel 1', 1, 'Nivel intermedio de Pares Mínimos', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/pares/medio/intro.mp3', 150),
(2, 'Pares Mínimos Medio - Nivel 2', 2, 'Nivel intermedio de Pares Mínimos', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/pares/medio/intro.mp3', 150),
(2, 'Pares Mínimos Medio - Nivel 3', 3, 'Nivel intermedio de Pares Mínimos', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/pares/medio/intro.mp3', 150),
(2, 'Pares Mínimos Medio - Nivel 4', 4, 'Nivel intermedio de Pares Mínimos', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/pares/medio/intro.mp3', 150),
(2, 'Pares Mínimos Medio - Nivel 5', 5, 'Nivel intermedio de Pares Mínimos', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/pares/medio/intro.mp3', 150);

-- Niveles para Pares Mínimos - Difícil (5 niveles)
INSERT INTO niveles (juego_id, nombre, numero_nivel, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento, puntos_base) VALUES
(2, 'Pares Mínimos Difícil - Nivel 1', 1, 'Nivel avanzado de Pares Mínimos', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/pares/dificil/intro.mp3', 200),
(2, 'Pares Mínimos Difícil - Nivel 2', 2, 'Nivel avanzado de Pares Mínimos', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/pares/dificil/intro.mp3', 200),
(2, 'Pares Mínimos Difícil - Nivel 3', 3, 'Nivel avanzado de Pares Mínimos', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/pares/dificil/intro.mp3', 200),
(2, 'Pares Mínimos Difícil - Nivel 4', 4, 'Nivel avanzado de Pares Mínimos', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/pares/dificil/intro.mp3', 200),
(2, 'Pares Mínimos Difícil - Nivel 5', 5, 'Nivel avanzado de Pares Mínimos', 'dificil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 120, '/audio/pares/dificil/intro.mp3', 200);

-- Usuario administrador inicial
-- Contraseña: Admin123
INSERT INTO usuarios (nombre, correo_electronico, contrasena, tipo_usuario) VALUES
('Administrador', 'admin@priming.com', '$2b$10$X7JKF9fqDjQhHBZc8JVnP.nUw9RBCwx3QJfI.dYChqQ8CcTbmZzXe', 'administrador');

-- ============================================================================
-- INFORMACIÓN FINAL
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'BASE DE DATOS PRIMING CREADA EXITOSAMENTE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Tablas creadas:';
    RAISE NOTICE '  ✓ usuarios (con índices y triggers)';
    RAISE NOTICE '  ✓ evaluadores';
    RAISE NOTICE '  ✓ ninos';
    RAISE NOTICE '  ✓ juegos (2 juegos insertados)';
    RAISE NOTICE '  ✓ niveles (40 niveles insertados: 20 Cognados + 20 Pares Mínimos)';
    RAISE NOTICE '  ✓ indicadores';
    RAISE NOTICE '  ✓ seleccionables';
    RAISE NOTICE '  ✓ encuestas';
    RAISE NOTICE '  ✓ progreso_juego';
    RAISE NOTICE '  ✓ progreso_ninos (NUEVA - Sistema de continuidad)';
    RAISE NOTICE '  ✓ resultados_encuesta';
    RAISE NOTICE '';
    RAISE NOTICE 'Datos iniciales:';
    RAISE NOTICE '  ✓ 2 Juegos (Cognados y Pares Mínimos)';
    RAISE NOTICE '  ✓ 40 Niveles (10+5+5 por juego)';
    RAISE NOTICE '  ✓ 1 Usuario administrador';
    RAISE NOTICE '';
    RAISE NOTICE 'Credenciales de administrador:';
    RAISE NOTICE '  Email: admin@priming.com';
    RAISE NOTICE '  Password: Admin123';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers configurados:';
    RAISE NOTICE '  ✓ Auto-actualización de timestamps';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Versión: 1.0.0';
    RAISE NOTICE 'Fecha: 3 de noviembre de 2025';
    RAISE NOTICE '============================================================================';
END $$;