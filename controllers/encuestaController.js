const db = require('../config/db');
const { ERROR_CODES } = require('../config/constants');

// Crear una nueva encuesta
const crearEncuesta = async (req, res, next) => {
    try {
        const { nino_id, observaciones } = req.body;
        const evaluador_id = req.user.id;
        
        // Verificar que el niño existe
        const ninoQuery = await db.query(
            'SELECT id FROM ninos WHERE id = $1',
            [nino_id]
        );
        
        if (ninoQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Niño no encontrado",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }
        
        // Obtener el ID del evaluador
        const evaluadorQuery = await db.query(
            'SELECT id FROM evaluadores WHERE usuario_id = $1',
            [evaluador_id]
        );
        
        if (evaluadorQuery.rows.length === 0) {
            return res.status(400).json({
                error: "No tienes permisos de evaluador para realizar esta acción.",
                code: ERROR_CODES.NOT_EVALUATOR
            });
        }
        
        const evaluadorRealId = evaluadorQuery.rows[0].id;
        
        // Crear la encuesta
        const encuestaResult = await db.query(
            'INSERT INTO encuestas (nino_id, evaluador_id, fecha, num_intentos, num_sesion, observaciones) VALUES ($1, $2, NOW(), $3, $4, $5) RETURNING id',
            [nino_id, evaluadorRealId, 0, 1, observaciones || '']
        );
        
        res.status(201).json({
            message: "Encuesta creada exitosamente",
            encuestaId: encuestaResult.rows[0].id
        });
    } catch (error) {
        next(error);
    }
};

// Obtener encuestas de un niño
const getEncuestasNino = async (req, res, next) => {
    try {
        const { nino_id } = req.params;
        const evaluador_id = req.user.id;
        
        // Obtener el ID del evaluador
        const evaluadorQuery = await db.query(
            'SELECT id FROM evaluadores WHERE usuario_id = $1',
            [evaluador_id]
        );
        
        if (evaluadorQuery.rows.length === 0) {
            return res.status(400).json({
                error: "No tienes permisos de evaluador para realizar esta acción.",
                code: ERROR_CODES.NOT_EVALUATOR
            });
        }
        
        const evaluadorRealId = evaluadorQuery.rows[0].id;
        
        // Obtener encuestas
        const encuestasQuery = await db.query(
            `SELECT 
                encuestas.id, 
                encuestas.fecha, 
                encuestas.num_intentos, 
                encuestas.num_sesion, 
                encuestas.observaciones,
                ninos.id AS nino_id,
                usuarios.nombre AS nino_nombre
             FROM encuestas
             JOIN ninos ON encuestas.nino_id = ninos.id
             JOIN usuarios ON ninos.usuario_id = usuarios.id
             WHERE encuestas.nino_id = $1 AND encuestas.evaluador_id = $2
             ORDER BY encuestas.fecha DESC`,
            [nino_id, evaluadorRealId]
        );
        
        res.json(encuestasQuery.rows);
    } catch (error) {
        next(error);
    }
};

// Actualizar encuesta
const updateEncuesta = async (req, res, next) => {
    try {
        const { encuesta_id } = req.params;
        const { num_intentos, num_sesion, observaciones } = req.body;
        const evaluador_id = req.user.id;
        
        // Obtener el ID del evaluador
        const evaluadorQuery = await db.query(
            'SELECT id FROM evaluadores WHERE usuario_id = $1',
            [evaluador_id]
        );
        
        if (evaluadorQuery.rows.length === 0) {
            return res.status(400).json({
                error: "No tienes permisos de evaluador para realizar esta acción.",
                code: ERROR_CODES.NOT_EVALUATOR
            });
        }
        
        const evaluadorRealId = evaluadorQuery.rows[0].id;
        
        // Verificar que la encuesta existe y pertenece al evaluador
        const encuestaQuery = await db.query(
            'SELECT id FROM encuestas WHERE id = $1 AND evaluador_id = $2',
            [encuesta_id, evaluadorRealId]
        );
        
        if (encuestaQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Encuesta no encontrada o no tienes permiso para editarla",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        // Actualizar la encuesta
        await db.query(
            'UPDATE encuestas SET num_intentos = $1, num_sesion = $2, observaciones = $3 WHERE id = $4',
            [num_intentos, num_sesion, observaciones, encuesta_id]
        );
        
        res.json({
            message: "Encuesta actualizada correctamente"
        });
    } catch (error) {
        next(error);
    }
};

// Registrar resultados de encuesta
const registrarResultados = async (req, res, next) => {
    try {
        const { encuesta_id } = req.params;
        const { resultados } = req.body;
        const evaluador_id = req.user.id;
        
        // Obtener el ID del evaluador
        const evaluadorQuery = await db.query(
            'SELECT id FROM evaluadores WHERE usuario_id = $1',
            [evaluador_id]
        );
        
        if (evaluadorQuery.rows.length === 0) {
            return res.status(400).json({
                error: "No tienes permisos de evaluador para realizar esta acción.",
                code: ERROR_CODES.NOT_EVALUATOR
            });
        }
        
        const evaluadorRealId = evaluadorQuery.rows[0].id;
        
        // Verificar que la encuesta existe y pertenece al evaluador
        const encuestaQuery = await db.query(
            'SELECT id FROM encuestas WHERE id = $1 AND evaluador_id = $2',
            [encuesta_id, evaluadorRealId]
        );
        
        if (encuestaQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Encuesta no encontrada o no tienes permiso para editarla",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        // Insertar resultados
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Eliminar resultados anteriores si existen
            await client.query(
                'DELETE FROM resultados_encuesta WHERE encuesta_id = $1',
                [encuesta_id]
            );
            
            // Insertar nuevos resultados
            for (const resultado of resultados) {
                await client.query(
                    'INSERT INTO resultados_encuesta (encuesta_id, pregunta, respuesta, tipo_voz) VALUES ($1, $2, $3, $4)',
                    [encuesta_id, resultado.pregunta, resultado.respuesta, resultado.tipo_voz]
                );
            }
            
            // Actualizar la encuesta para incrementar el número de intentos
            await client.query(
                'UPDATE encuestas SET num_intentos = num_intentos + 1 WHERE id = $1',
                [encuesta_id]
            );
            
            await client.query('COMMIT');
            
            res.json({
                message: "Resultados registrados correctamente"
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

// Obtener resultados de una encuesta
const getResultadosEncuesta = async (req, res, next) => {
    try {
        const { encuesta_id } = req.params;
        const evaluador_id = req.user.id;
        
        // Obtener el ID del evaluador
        const evaluadorQuery = await db.query(
            'SELECT id FROM evaluadores WHERE usuario_id = $1',
            [evaluador_id]
        );
        
        if (evaluadorQuery.rows.length === 0) {
            return res.status(400).json({
                error: "No tienes permisos de evaluador para realizar esta acción.",
                code: ERROR_CODES.NOT_EVALUATOR
            });
        }
        
        const evaluadorRealId = evaluadorQuery.rows[0].id;
        
        // Verificar que la encuesta existe y pertenece al evaluador
        const encuestaQuery = await db.query(
            `SELECT 
                encuestas.id, 
                encuestas.fecha, 
                encuestas.num_intentos, 
                encuestas.num_sesion, 
                encuestas.observaciones,
                ninos.id AS nino_id,
                usuarios.nombre AS nino_nombre
             FROM encuestas
             JOIN ninos ON encuestas.nino_id = ninos.id
             JOIN usuarios ON ninos.usuario_id = usuarios.id
             WHERE encuestas.id = $1 AND encuestas.evaluador_id = $2`,
            [encuesta_id, evaluadorRealId]
        );
        
        if (encuestaQuery.rows.length === 0) {
            return res.status(404).json({
                error: "Encuesta no encontrada o no tienes permiso para verla",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }
        
        const encuesta = encuestaQuery.rows[0];
        
        // Obtener resultados
        const resultadosQuery = await db.query(
            'SELECT id, pregunta, respuesta, tipo_voz FROM resultados_encuesta WHERE encuesta_id = $1',
            [encuesta_id]
        );
        
        res.json({
            encuesta,
            resultados: resultadosQuery.rows
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    crearEncuesta,
    getEncuestasNino,
    updateEncuesta,
    registrarResultados,
    getResultadosEncuesta
};