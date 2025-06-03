-- Esquema de la base de datos para el proyecto PRIMING

-- Eliminar tablas si existen (en orden inverso a las dependencias)
DROP TABLE IF EXISTS resultados_encuesta;
DROP TABLE IF EXISTS progreso_juego;
DROP TABLE IF EXISTS encuestas;
DROP TABLE IF EXISTS seleccionables;
DROP TABLE IF EXISTS indicadores;
DROP TABLE IF EXISTS niveles;
DROP TABLE IF EXISTS juegos;
DROP TABLE IF EXISTS ninos;
DROP TABLE IF EXISTS evaluadores;
DROP TABLE IF EXISTS usuarios;

-- Tabla de usuarios (común para todos los tipos de usuario)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo_electronico VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(100) NOT NULL,
    tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('admin', 'evaluador', 'niño')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de evaluadores (docentes, estudiantes, egresados)
CREATE TABLE evaluadores (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Estudiante', 'Docente', 'Egresado')),
    UNIQUE (usuario_id)
);

-- Tabla de niños
CREATE TABLE ninos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    edad INTEGER NOT NULL CHECK (edad BETWEEN 5 AND 7),
    grado INTEGER NOT NULL CHECK (grado BETWEEN -1 AND 2), -- -1 para preescolar, 0-2 para primaria
    colegio VARCHAR(100) NOT NULL,
    jornada VARCHAR(50) NOT NULL CHECK (jornada IN ('mañana', 'tarde', 'Continua')),
    UNIQUE (usuario_id)
);

-- Tabla de juegos disponibles
CREATE TABLE juegos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    imagen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de niveles para cada juego
CREATE TABLE niveles (
    id SERIAL PRIMARY KEY,
    juego_id INTEGER NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    dificultad VARCHAR(50) NOT NULL CHECK (dificultad IN ('fácil', 'medio', 'difícil')),
    instrucciones TEXT,
    tiempo_maximo INTEGER NOT NULL, -- en segundos
    audio_entrenamiento VARCHAR(255)
);

-- Tabla de indicadores (puntos en común de seleccionables)
CREATE TABLE indicadores (
    id SERIAL PRIMARY KEY,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    imagen VARCHAR(255),
    audio VARCHAR(255)
);

-- Tabla de seleccionables (elementos que se pueden seleccionar en el juego)
CREATE TABLE seleccionables (
    id SERIAL PRIMARY KEY,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    indicador_id INTEGER NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
    palabra VARCHAR(100) NOT NULL,
    imagen VARCHAR(255),
    correcto BOOLEAN NOT NULL
);

-- Tabla de encuestas (relación entre niño y evaluador)
CREATE TABLE encuestas (
    id SERIAL PRIMARY KEY,
    nino_id INTEGER NOT NULL REFERENCES ninos(id) ON DELETE CASCADE,
    evaluador_id INTEGER NOT NULL REFERENCES evaluadores(id) ON DELETE CASCADE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    num_intentos INTEGER DEFAULT 0,
    num_sesion INTEGER DEFAULT 1,
    observaciones TEXT
);

-- Tabla de progreso en juegos
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
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, juego_id, nivel_id)
);

-- Tabla de resultados de encuestas
CREATE TABLE resultados_encuesta (
    id SERIAL PRIMARY KEY,
    encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
    pregunta VARCHAR(255) NOT NULL,
    respuesta TEXT,
    tipo_voz VARCHAR(50), -- hombre/mujer
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales
-- Juegos
INSERT INTO juegos (nombre, descripcion, imagen) VALUES 
('Cognados', 'Juego de palabras que suenan similar tanto en español como en inglés', '/images/juegos/cognados.png'),
('Pares Mínimos', 'Juego de palabras que suenan similar en su pronunciación en inglés', '/images/juegos/pares-minimos.png');

-- Niveles para Cognados
INSERT INTO niveles (juego_id, nombre, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento) VALUES
(1, 'Nivel 1', 'Nivel básico de Cognados', 'fácil', 'Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.', 180, '/audio/cognados/facil/intro.mp3'),
(1, 'Nivel 2', 'Nivel intermedio de Cognados', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/cognados/medio/intro.mp3'),
(1, 'Nivel 3', 'Nivel avanzado de Cognados', 'difícil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 90, '/audio/cognados/dificil/intro.mp3');

-- Niveles para Pares Mínimos
INSERT INTO niveles (juego_id, nombre, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento) VALUES
(2, 'Nivel 1', 'Nivel básico de Pares Mínimos', 'fácil', 'Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.', 180, '/audio/pares/facil/intro.mp3'),
(2, 'Nivel 2', 'Nivel intermedio de Pares Mínimos', 'medio', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 150, '/audio/pares/medio/intro.mp3'),
(2, 'Nivel 3', 'Nivel avanzado de Pares Mínimos', 'difícil', 'Escucha los audios y selecciona las palabras que correspondan a cada sonido en inglés.', 90, '/audio/pares/dificil/intro.mp3');

-- Indicadores para el primer nivel de Cognados (ejemplo)
INSERT INTO indicadores (nivel_id, nombre, imagen, audio) VALUES
(1, 'Cocodrilo', '/images/cognados/cocodrilo.png', '/audio/cognados/facil/cocodrilo.mp3');

-- Indicadores para el primer nivel de Pares Mínimos (ejemplo)
INSERT INTO indicadores (nivel_id, nombre, imagen, audio) VALUES
(4, 'Pirata', '/images/pares/pirata.png', '/audio/pares/facil/ship.mp3');

-- Usuario administrador inicial
INSERT INTO usuarios (nombre, correo_electronico, contrasena, tipo_usuario) VALUES
('Administrador', 'admin@priming.com', '$2b$10$X7JKF9fqDjQhHBZc8JVnP.nUw9RBCwx3QJfI.dYChqQ8CcTbmZzXe', 'admin'); -- Contraseña: Admin123