const bcrypt = require('bcrypt');
const db = require('../config/db');
const { ERROR_CODES, USER_TYPES } = require('../config/constants');
const { validatePassword, validateEmail } = require('../utils/passwordUtils');

// Asignar niño a evaluador (registrar nuevo niño)
const asignarNino = async (req, res, next) => {
    try {
        console.log("📩 Datos recibidos en el backend:", req.body);
        const { nombre, correo_electronico, contrasena, edad, grado, colegio, jornada } = req.body;

        // Validación de datos requeridos
        if (!nombre || !correo_electronico || !contrasena || !edad || !grado || !colegio || !jornada) {
            return res.status(400).json({ 
                error: "Faltan datos obligatorios.",
                code: ERROR_CODES.MISSING_DATA
            });
        }

        // Validar formato de correo electrónico
        if (!validateEmail(correo_electronico)) {
            return res.status(400).json({
                error: "El formato del correo electrónico no es válido.",
                code: ERROR_CODES.INVALID_EMAIL
            });
        }

        // Validar formato de contraseña
        if (!validatePassword(contrasena)) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos 6 caracteres, una letra mayúscula y un número.",
                code: ERROR_CODES.INVALID_PASSWORD
            });
        }

        // Verificar si el correo ya existe
        const correoExistente = await db.query(
            'SELECT id FROM usuarios WHERE correo_electronico = $1',
            [correo_electronico]
        );
      
        if (correoExistente.rows.length > 0) {
            return res.status(400).json({ 
                error: "El correo electrónico ya está registrado.",
                code: ERROR_CODES.EMAIL_EXISTS
            });
        }
  
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasena.trim(), 10);
  
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
        
            // 1. Crear el usuario
            const usuarioResult = await client.query(
                'INSERT INTO usuarios (nombre, correo_electronico, contrasena, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id',
                [nombre, correo_electronico, hashedPassword, USER_TYPES.NINO]
            );
            const nuevoUsuarioId = usuarioResult.rows[0].id;
        
            // 2. Crear el registro del niño
            const ninoResult = await client.query(
                'INSERT INTO ninos (usuario_id, edad, grado, colegio, jornada) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [nuevoUsuarioId, edad, grado, colegio, jornada]
            );
            const ninoId = ninoResult.rows[0].id;
        
            // 3. Obtener el ID del evaluador
            const evaluadorQuery = await client.query(
                'SELECT id FROM evaluadores WHERE usuario_id = $1',
                [req.user.id]
            );
        
            if (evaluadorQuery.rows.length === 0) {
                throw new Error("El usuario logueado no tiene registro en evaluadores.");
            }
        
            const evaluadorId = evaluadorQuery.rows[0].id;
        
            // 4. Crear la encuesta/relación entre niño y evaluador
            const encuestaResult = await client.query(
                'INSERT INTO encuestas (nino_id, evaluador_id, fecha, num_intentos, num_sesion, observaciones) VALUES ($1, $2, NOW(), $3, $4, $5) RETURNING id',
                [ninoId, evaluadorId, 0, 1, '']
            );
        
            await client.query('COMMIT');
            client.release();
        
            res.status(201).json({
                message: "Niño registrado y encuesta iniciada exitosamente",
                encuestaId: encuestaResult.rows[0].id
            });
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            console.error("❌ Error registrando niño y encuesta:", error);
        
            if (error.message === "El usuario logueado no tiene registro en evaluadores.") {
                return res.status(400).json({ 
                    error: "No tienes permisos de evaluador para realizar esta acción.",
                    code: ERROR_CODES.NOT_EVALUATOR
                });
            }
        
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// Obtener lista de niños asignados al evaluador
const getNinosAsignados = async (req, res, next) => {
    try {
        const evaluadorId = req.user.id;

        const query = `
            SELECT 
                encuestas.id AS encuesta_id, 
                ninos.id AS nino_id, 
                usuarios.nombre AS nino_nombre, 
                usuarios.correo_electronico AS nino_correo,
                ninos.edad, 
                ninos.grado, 
                ninos.colegio, 
                ninos.jornada,
                encuestas.fecha,
                encuestas.num_intentos,
                encuestas.num_sesion,
                encuestas.observaciones
            FROM encuestas
            JOIN evaluadores ON encuestas.evaluador_id = evaluadores.id
            JOIN ninos ON encuestas.nino_id = ninos.id
            JOIN usuarios ON ninos.usuario_id = usuarios.id
            WHERE evaluadores.usuario_id = $1
            ORDER BY encuestas.fecha DESC;
        `;
      
        const result = await db.query(query, [evaluadorId]);
  
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Obtener resultados de encuestas por niño
const getResultadosNino = async (req, res, next) => {
    try {
        const { ninoId } = req.params;
        const evaluadorId = req.user.id;

        // Verificar que el niño esté asignado a este evaluador
        const verificacionQuery = `
            SELECT 1
            FROM encuestas
            JOIN evaluadores ON encuestas.evaluador_id = evaluadores.id
            WHERE encuestas.nino_id = $1 AND evaluadores.usuario_id = $2
            LIMIT 1
        `;
        
        const verificacion = await db.query(verificacionQuery, [ninoId, evaluadorId]);
        
        if (verificacion.rows.length === 0) {
            return res.status(403).json({
                error: "No tienes permiso para ver los resultados de este niño",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }

        // Obtener los datos del niño
        const ninoQuery = `
            SELECT 
                ninos.id,
                usuarios.nombre,
                usuarios.correo_electronico,
                ninos.edad,
                ninos.grado,
                ninos.colegio,
                ninos.jornada
            FROM ninos
            JOIN usuarios ON ninos.usuario_id = usuarios.id
            WHERE ninos.id = $1
        `;
        
        const ninoData = await db.query(ninoQuery, [ninoId]);
        
        if (ninoData.rows.length === 0) {
            return res.status(404).json({
                error: "Niño no encontrado",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }

        // Obtener todas las encuestas realizadas a este niño por este evaluador
        const encuestasQuery = `
            SELECT 
                encuestas.id,
                encuestas.fecha,
                encuestas.num_intentos,
                encuestas.num_sesion,
                encuestas.observaciones
            FROM encuestas
            JOIN evaluadores ON encuestas.evaluador_id = evaluadores.id
            WHERE encuestas.nino_id = $1 AND evaluadores.usuario_id = $2
            ORDER BY encuestas.fecha DESC
        `;
        
        const encuestasData = await db.query(encuestasQuery, [ninoId, evaluadorId]);

        // Obtener el progreso en los juegos
        const progresoQuery = `
            SELECT 
                juego_id,
                nivel_id,
                puntuacion,
                aciertos,
                fallos,
                tiempo,
                completado,
                fecha_actualizacion
            FROM progreso_juego
            JOIN ninos ON progreso_juego.usuario_id = ninos.usuario_id
            WHERE ninos.id = $1
            ORDER BY juego_id, nivel_id
        `;
        
        const progresoData = await db.query(progresoQuery, [ninoId]);

        // Estructurar la respuesta
        const respuesta = {
            nino: ninoData.rows[0],
            encuestas: encuestasData.rows,
            progreso: progresoData.rows
        };

        res.json(respuesta);
    } catch (error) {
        next(error);
    }
};

// Editar información de un niño asignado
const editarNino = async (req, res, next) => {
    try {
        const { ninoId } = req.params;
        const { nombre, correo_electronico, edad, grado, colegio, jornada } = req.body;
        const evaluadorId = req.user.id;

        // Verificar que el niño esté asignado a este evaluador
        const verificacionQuery = `
            SELECT ninos.usuario_id
            FROM encuestas
            JOIN evaluadores ON encuestas.evaluador_id = evaluadores.id
            JOIN ninos ON encuestas.nino_id = ninos.id
            WHERE encuestas.nino_id = $1 AND evaluadores.usuario_id = $2
            LIMIT 1
        `;
        
        const verificacion = await db.query(verificacionQuery, [ninoId, evaluadorId]);
        
        if (verificacion.rows.length === 0) {
            return res.status(403).json({
                error: "No tienes permiso para editar este niño",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }

        const ninoUsuarioId = verificacion.rows[0].usuario_id;

        // Verificar si el correo ya está en uso por otro usuario
        if (correo_electronico) {
            const correoQuery = await db.query(
                'SELECT id FROM usuarios WHERE correo_electronico = $1 AND id != $2',
                [correo_electronico, ninoUsuarioId]
            );
            
            if (correoQuery.rows.length > 0) {
                return res.status(400).json({
                    error: "El correo electrónico ya está en uso por otro usuario",
                    code: ERROR_CODES.EMAIL_EXISTS
                });
            }
        }

        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Actualizar datos de usuario
            if (nombre || correo_electronico) {
                const updateUsuarioQuery = 'UPDATE usuarios SET';
                const params = [];
                const fields = [];
                
                if (nombre) {
                    params.push(nombre);
                    fields.push(`nombre = $${params.length}`);
                }
                
                if (correo_electronico) {
                    params.push(correo_electronico);
                    fields.push(`correo_electronico = $${params.length}`);
                }
                
                params.push(ninoUsuarioId);
                
                await client.query(
                    `${updateUsuarioQuery} ${fields.join(', ')} WHERE id = $${params.length}`,
                    params
                );
            }
            
            // Actualizar datos de niño
            if (edad || grado !== undefined || colegio || jornada) {
                const updateNinoQuery = 'UPDATE ninos SET';
                const params = [];
                const fields = [];
                
                if (edad) {
                    params.push(edad);
                    fields.push(`edad = $${params.length}`);
                }
                
                if (grado !== undefined) {
                    params.push(grado);
                    fields.push(`grado = $${params.length}`);
                }
                
                if (colegio) {
                    params.push(colegio);
                    fields.push(`colegio = $${params.length}`);
                }
                
                if (jornada) {
                    params.push(jornada);
                    fields.push(`jornada = $${params.length}`);
                }
                
                params.push(ninoId);
                
                await client.query(
                    `${updateNinoQuery} ${fields.join(', ')} WHERE id = $${params.length}`,
                    params
                );
            }
            
            await client.query('COMMIT');
            
            res.json({
                message: "Datos del niño actualizados correctamente"
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

// Cambiar contraseña de un niño asignado
const cambiarPasswordNino = async (req, res, next) => {
    try {
        const { ninoId } = req.params;
        const { contrasena } = req.body;
        const evaluadorId = req.user.id;

        // Validar la contraseña
        if (!validatePassword(contrasena)) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos 6 caracteres, una letra mayúscula y un número",
                code: ERROR_CODES.INVALID_PASSWORD
            });
        }

        // Verificar que el niño esté asignado a este evaluador
        const verificacionQuery = `
            SELECT ninos.usuario_id
            FROM encuestas
            JOIN evaluadores ON encuestas.evaluador_id = evaluadores.id
            JOIN ninos ON encuestas.nino_id = ninos.id
            WHERE encuestas.nino_id = $1 AND evaluadores.usuario_id = $2
            LIMIT 1
        `;
        
        const verificacion = await db.query(verificacionQuery, [ninoId, evaluadorId]);
        
        if (verificacion.rows.length === 0) {
            return res.status(403).json({
                error: "No tienes permiso para cambiar la contraseña de este niño",
                code: ERROR_CODES.ACCESS_DENIED
            });
        }

        const ninoUsuarioId = verificacion.rows[0].usuario_id;

        // Encriptar la nueva contraseña
        const hashedPassword = await bcrypt.hash(contrasena.trim(), 10);
        
        // Actualizar la contraseña
        await db.query(
            'UPDATE usuarios SET contrasena = $1 WHERE id = $2',
            [hashedPassword, ninoUsuarioId]
        );
        
        res.json({
            message: "Contraseña del niño actualizada correctamente"
        });
    } catch (error) {
        next(error);
    }
};

// Obtener estadísticas del evaluador
const getEstadisticas = async (req, res, next) => {
    try {
        const evaluadorId = req.user.id;

        // Obtener el ID real del evaluador
        const evaluadorQuery = await db.query(
            'SELECT id FROM evaluadores WHERE usuario_id = $1',
            [evaluadorId]
        );
        
        if (evaluadorQuery.rows.length === 0) {
            return res.status(400).json({
                error: "No tienes permisos de evaluador para realizar esta acción.",
                code: ERROR_CODES.NOT_EVALUATOR
            });
        }
        
        const evaluadorRealId = evaluadorQuery.rows[0].id;

        // Obtener total de niños asignados
        const totalNinosQuery = await db.query(
            `SELECT COUNT(DISTINCT nino_id) as total
             FROM encuestas
             WHERE evaluador_id = $1`,
            [evaluadorRealId]
        );
        
        const totalNinos = totalNinosQuery.rows[0].total;

        // Obtener total de encuestas realizadas
        const totalEncuestasQuery = await db.query(
            `SELECT COUNT(*) as total
             FROM encuestas
             WHERE evaluador_id = $1`,
            [evaluadorRealId]
        );
        
        const totalEncuestas = totalEncuestasQuery.rows[0].total;

        // Obtener distribución por edades
        const distribucionEdadesQuery = await db.query(
            `SELECT ninos.edad, COUNT(*) as cantidad
             FROM encuestas
             JOIN ninos ON encuestas.nino_id = ninos.id
             WHERE encuestas.evaluador_id = $1
             GROUP BY ninos.edad
             ORDER BY ninos.edad`,
            [evaluadorRealId]
        );

        // Obtener distribución por grados
        const distribucionGradosQuery = await db.query(
            `SELECT ninos.grado, COUNT(*) as cantidad
             FROM encuestas
             JOIN ninos ON encuestas.nino_id = ninos.id
             WHERE encuestas.evaluador_id = $1
             GROUP BY ninos.grado
             ORDER BY ninos.grado`,
            [evaluadorRealId]
        );

        // Obtener distribución por colegios
        const distribucionColegiosQuery = await db.query(
            `SELECT ninos.colegio, COUNT(*) as cantidad
             FROM encuestas
             JOIN ninos ON encuestas.nino_id = ninos.id
             WHERE encuestas.evaluador_id = $1
             GROUP BY ninos.colegio
             ORDER BY cantidad DESC`,
            [evaluadorRealId]
        );

        // Estructurar la respuesta
        const respuesta = {
            totalNinos,
            totalEncuestas,
            distribucionEdades: distribucionEdadesQuery.rows,
            distribucionGrados: distribucionGradosQuery.rows,
            distribucionColegios: distribucionColegiosQuery.rows
        };

        res.json(respuesta);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    asignarNino,
    getNinosAsignados,
    getResultadosNino,
    editarNino,
    cambiarPasswordNino,
    getEstadisticas
};