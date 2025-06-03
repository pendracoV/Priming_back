const db = require('../config/db');
const { ERROR_CODES, USER_TYPES } = require('../config/constants');

// Obtener perfil del niño
const getPerfilNino = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Verificar que el usuario sea niño
        if (req.user.tipo_usuario !== USER_TYPES.NINO) {
            return res.status(403).json({
                error: "Acceso denegado. Esta función es solo para usuarios tipo niño.",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        // Obtener datos básicos del usuario
        const userQuery = await db.query(
            'SELECT id, nombre, correo_electronico, tipo_usuario FROM usuarios WHERE id = $1',
            [userId]
        );
        
        if (userQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Usuario no encontrado",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }
        
        // Obtener datos específicos del niño
        const ninoQuery = await db.query(
            'SELECT id, edad, grado, colegio, jornada FROM ninos WHERE usuario_id = $1',
            [userId]
        );
        
        if (ninoQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Datos de niño no encontrados",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }
        
        // Combinar datos del usuario y del niño
        const perfilNino = {
            ...userQuery.rows[0],
            ...ninoQuery.rows[0]
        };
        
        res.json(perfilNino);
    } catch (error) {
        next(error);
    }
};

// Obtener progreso del niño en los juegos
const getProgresoNino = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Verificar que el usuario sea niño
        if (req.user.tipo_usuario !== USER_TYPES.NINO) {
            return res.status(403).json({
                error: "Acceso denegado. Esta función es solo para usuarios tipo niño.",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        // Obtener progreso en todos los juegos
        const progresoQuery = await db.query(
            `SELECT 
                juego_id, 
                nivel_id, 
                puntuacion, 
                tiempo, 
                aciertos, 
                fallos, 
                completado, 
                fecha_creacion, 
                fecha_actualizacion
             FROM progreso_juego
             WHERE usuario_id = $1
             ORDER BY juego_id, nivel_id`,
            [userId]
        );
        
        // Obtener información de juegos disponibles
        const juegosQuery = await db.query(
            `SELECT 
                id, 
                nombre, 
                descripcion
             FROM juegos
             ORDER BY id`
        );
        
        // Obtener información de niveles disponibles
        const nivelesQuery = await db.query(
            `SELECT 
                id, 
                juego_id, 
                nombre, 
                descripcion, 
                dificultad
             FROM niveles
             ORDER BY juego_id, id`
        );
        
        // Estructura de respuesta
        const respuesta = {
            juegos: juegosQuery.rows,
            niveles: nivelesQuery.rows,
            progreso: progresoQuery.rows
        };
        
        res.json(respuesta);
    } catch (error) {
        next(error);
    }
};

// Guardar progreso en un juego
const guardarProgresoJuego = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { juegoId, nivelId } = req.params;
        const { puntuacion, tiempo, aciertos, fallos, completado } = req.body;
        
        // Verificar que el usuario sea niño
        if (req.user.tipo_usuario !== USER_TYPES.NINO) {
            return res.status(403).json({
                error: "Acceso denegado. Esta función es solo para usuarios tipo niño.",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        // Validar datos requeridos
        if (puntuacion === undefined || tiempo === undefined || aciertos === undefined || fallos === undefined || completado === undefined) {
            return res.status(400).json({
                error: "Faltan datos de progreso",
                code: ERROR_CODES.MISSING_DATA
            });
        }
        
        // Verificar si el nivel existe
        const nivelQuery = await db.query(
            'SELECT id FROM niveles WHERE id = $1 AND juego_id = $2',
            [nivelId, juegoId]
        );
        
        if (nivelQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Nivel no encontrado",
                code: ERROR_CODES.MISSING_DATA
            });
        }
        
        // Verificar si ya existe un registro de progreso para este nivel y jugador
        const progresoExistenteQuery = await db.query(
            'SELECT id FROM progreso_juego WHERE usuario_id = $1 AND juego_id = $2 AND nivel_id = $3',
            [userId, juegoId, nivelId]
        );
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            if (progresoExistenteQuery.rows.length > 0) {
                // Actualizar progreso existente
                const progresoId = progresoExistenteQuery.rows[0].id;
                await client.query(
                    `UPDATE progreso_juego 
                     SET puntuacion = $1, tiempo = $2, aciertos = $3, fallos = $4, completado = $5, fecha_actualizacion = NOW() 
                     WHERE id = $6`,
                    [puntuacion, tiempo, aciertos, fallos, completado, progresoId]
                );
            } else {
                // Insertar nuevo progreso
                await client.query(
                    `INSERT INTO progreso_juego 
                     (usuario_id, juego_id, nivel_id, puntuacion, tiempo, aciertos, fallos, completado, fecha_creacion, fecha_actualizacion)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
                    [userId, juegoId, nivelId, puntuacion, tiempo, aciertos, fallos, completado]
                );
            }
            
            // Si el nivel está completado, desbloquear siguiente nivel (si existe)
            if (completado) {
                // Obtener el siguiente nivel
                const siguienteNivelQuery = await client.query(
                    'SELECT id FROM niveles WHERE juego_id = $1 AND id > $2 ORDER BY id LIMIT 1',
                    [juegoId, nivelId]
                );
                
                if (siguienteNivelQuery.rows.length > 0) {
                    const siguienteNivelId = siguienteNivelQuery.rows[0].id;
                    
                    // Verificar si ya existe un registro para el siguiente nivel
                    const siguienteProgresoQuery = await client.query(
                        'SELECT id FROM progreso_juego WHERE usuario_id = $1 AND juego_id = $2 AND nivel_id = $3',
                        [userId, juegoId, siguienteNivelId]
                    );
                    
                    if (siguienteProgresoQuery.rows.length === 0) {
                        // Crear un registro vacío para el siguiente nivel (desbloquearlo)
                        await client.query(
                            `INSERT INTO progreso_juego 
                             (usuario_id, juego_id, nivel_id, puntuacion, tiempo, aciertos, fallos, completado, fecha_creacion, fecha_actualizacion)
                             VALUES ($1, $2, $3, 0, 0, 0, 0, false, NOW(), NOW())`,
                            [userId, juegoId, siguienteNivelId]
                        );
                    }
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                message: "Progreso guardado correctamente"
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
};

// Obtener nivel actual de juego
const getNivelActual = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { juegoId } = req.params;
        
        // Verificar que el usuario sea niño
        if (req.user.tipo_usuario !== USER_TYPES.NINO) {
            return res.status(403).json({
                error: "Acceso denegado. Esta función es solo para usuarios tipo niño.",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        // Obtener el nivel más alto desbloqueado
        const nivelQuery = await db.query(
            `SELECT nivel_id, completado
             FROM progreso_juego
             WHERE usuario_id = $1 AND juego_id = $2
             ORDER BY nivel_id DESC
             LIMIT 1`,
            [userId, juegoId]
        );
        
        let nivelActual;
        
        if (nivelQuery.rows.length === 0) {
            // Si no hay progreso, obtener el primer nivel del juego
            const primerNivelQuery = await db.query(
                'SELECT id as nivel_id FROM niveles WHERE juego_id = $1 ORDER BY id LIMIT 1',
                [juegoId]
            );
            
            if (primerNivelQuery.rows.length === 0) {
                return res.status(404).json({
                    error: "No se encontraron niveles para este juego",
                    code: ERROR_CODES.MISSING_DATA
                });
            }
            
            nivelActual = {
                ...primerNivelQuery.rows[0],
                completado: false
            };
        } else if (nivelQuery.rows[0].completado) {
            // Si el último nivel está completado, obtener el siguiente nivel
            const siguienteNivelQuery = await db.query(
                'SELECT id as nivel_id FROM niveles WHERE juego_id = $1 AND id > $2 ORDER BY id LIMIT 1',
                [juegoId, nivelQuery.rows[0].nivel_id]
            );
            
            if (siguienteNivelQuery.rows.length === 0) {
                // Si no hay más niveles, devolver el último completado
                nivelActual = {
                    ...nivelQuery.rows[0],
                    completado: true,
                    ultimo_nivel: true
                };
            } else {
                nivelActual = {
                    ...siguienteNivelQuery.rows[0],
                    completado: false
                };
            }
        } else {
            // Si el último nivel no está completado, ese es el nivel actual
            nivelActual = nivelQuery.rows[0];
        }
        
        // Obtener detalles del nivel
        const detallesNivelQuery = await db.query(
            `SELECT 
                id,
                juego_id,
                nombre,
                descripcion,
                dificultad,
                tiempo_maximo
             FROM niveles
             WHERE id = $1`,
            [nivelActual.nivel_id]
        );
        
        if (detallesNivelQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Nivel no encontrado",
                code: ERROR_CODES.MISSING_DATA
            });
        }
        
        // Obtener progreso del nivel
        const progresoQuery = await db.query(
            `SELECT 
                puntuacion,
                tiempo,
                aciertos,
                fallos,
                completado,
                fecha_actualizacion
             FROM progreso_juego
             WHERE usuario_id = $1 AND juego_id = $2 AND nivel_id = $3`,
            [userId, juegoId, nivelActual.nivel_id]
        );
        
        const respuesta = {
            nivel: detallesNivelQuery.rows[0],
            progreso: progresoQuery.rows.length > 0 ? progresoQuery.rows[0] : null
        };
        
        res.json(respuesta);
    } catch (error) {
        next(error);
    }
};

// Obtener estadísticas del niño
const getEstadisticas = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Verificar que el usuario sea niño
        if (req.user.tipo_usuario !== USER_TYPES.NINO) {
            return res.status(403).json({
                error: "Acceso denegado. Esta función es solo para usuarios tipo niño.",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        // Obtener datos del niño
        const ninoQuery = await db.query(
            `SELECT 
                usuarios.nombre,
                ninos.edad,
                ninos.grado,
                ninos.colegio,
                ninos.jornada
             FROM usuarios
             JOIN ninos ON usuarios.id = ninos.usuario_id
             WHERE usuarios.id = $1`,
            [userId]
        );
        
        if (ninoQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Datos de niño no encontrados",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }
        
        // Estadísticas generales
        const estadisticasQuery = await db.query(
            `SELECT 
                COUNT(DISTINCT juego_id) as total_juegos,
                COUNT(DISTINCT (juego_id, nivel_id)) as total_niveles,
                COUNT(DISTINCT (juego_id, nivel_id)) FILTER (WHERE completado = true) as niveles_completados,
                SUM(puntuacion) as puntuacion_total,
                SUM(tiempo) / 60 as tiempo_total_minutos,
                SUM(aciertos) as total_aciertos,
                SUM(fallos) as total_fallos
             FROM progreso_juego
             WHERE usuario_id = $1`,
            [userId]
        );
        
        // Progreso por juego
        const progresoJuegosQuery = await db.query(
            `SELECT 
                juegos.id,
                juegos.nombre,
                COUNT(DISTINCT pg.nivel_id) as niveles_jugados,
                COUNT(DISTINCT pg.nivel_id) FILTER (WHERE pg.completado = true) as niveles_completados,
                (SELECT COUNT(*) FROM niveles WHERE juego_id = juegos.id) as total_niveles,
                SUM(pg.puntuacion) as puntuacion_total,
                SUM(pg.tiempo) / 60 as tiempo_total_minutos
             FROM juegos
             LEFT JOIN progreso_juego pg ON juegos.id = pg.juego_id AND pg.usuario_id = $1
             GROUP BY juegos.id, juegos.nombre
             ORDER BY juegos.id`,
            [userId]
        );
        
        // Últimas sesiones
        const ultimasSesionesQuery = await db.query(
            `SELECT 
                juegos.nombre as juego,
                niveles.nombre as nivel,
                pg.puntuacion,
                pg.aciertos,
                pg.fallos,
                pg.tiempo,
                pg.completado,
                pg.fecha_actualizacion
             FROM progreso_juego pg
             JOIN juegos ON pg.juego_id = juegos.id
             JOIN niveles ON pg.nivel_id = niveles.id
             WHERE pg.usuario_id = $1
             ORDER BY pg.fecha_actualizacion DESC
             LIMIT 10`,
            [userId]
        );
        
        // Evaluadores asignados
        const evaluadoresQuery = await db.query(
            `SELECT 
                usuarios.nombre as evaluador_nombre,
                evaluadores.tipo as evaluador_tipo,
                MIN(encuestas.fecha) as fecha_asignacion
             FROM encuestas
             JOIN evaluadores ON encuestas.evaluador_id = evaluadores.id
             JOIN usuarios ON evaluadores.usuario_id = usuarios.id
             JOIN ninos ON encuestas.nino_id = ninos.id
             WHERE ninos.usuario_id = $1
             GROUP BY usuarios.nombre, evaluadores.tipo
             ORDER BY fecha_asignacion`,
            [userId]
        );
        
        // Estructurar respuesta
        const respuesta = {
            datos_nino: ninoQuery.rows[0],
            estadisticas: estadisticasQuery.rows[0],
            progreso_juegos: progresoJuegosQuery.rows,
            ultimas_sesiones: ultimasSesionesQuery.rows,
            evaluadores: evaluadoresQuery.rows
        };
        
        res.json(respuesta);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPerfilNino,
    getProgresoNino,
    guardarProgresoJuego,
    getNivelActual,
    getEstadisticas
};