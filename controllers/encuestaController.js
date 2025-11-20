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
        const evaluador_id = req.user.id;

        const {
            nino_id,
            resumen_examen_mental,
            antecedentes_clinicos,
            diagnostico_aprendizaje,
            problemas_academicos,
            problemas_lectoescritura,
            evaluacion_pretest,
            evaluacion_postest,
            observaciones_sesion,
            observacion_conductual,
            recomendaciones,
            indicadores_logro,

            game_type,
            difficulty,
            current_level,
            accumulated_score,
            last_played
        } = req.body;

        // Verificar evaluador
        const evaluadorQuery = await db.query(
            "SELECT id FROM evaluadores WHERE usuario_id = $1",
            [evaluador_id]
        );

        if (evaluadorQuery.rows.length === 0) {
            return res.status(400).json({ error: "No tienes permisos de evaluador" });
        }

        const evaluadorRealId = evaluadorQuery.rows[0].id;

        // Verificar encuesta
        const encuestaQuery = await db.query(
            "SELECT id FROM encuestas WHERE id = $1 AND evaluador_id = $2",
            [encuesta_id, evaluadorRealId]
        );

        if (encuestaQuery.rows.length === 0) {
            return res.status(404).json({ error: "Encuesta no encontrada" });
        }

        const client = await db.getClient();

        try {
            await client.query("BEGIN");

            // Insertar nuevo resultado clínico
            await client.query(
            `INSERT INTO resultados_encuesta (
                encuesta_id,
                nino_id,
                evaluador_id,
                resumen_examen_mental,
                antecedentes_clinicos,
                diagnostico_aprendizaje,
                problemas_academicos,
                problemas_lectoescritura,
                evaluacion_pretest,
                evaluacion_postest,
                observaciones_sesion,
                observacion_conductual,
                recomendaciones,
                indicadores_logro,
                game_type,
                difficulty,
                current_level,
                accumulated_score,
                last_played
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
            )`,
            [
                encuesta_id,
                nino_id,
                evaluadorRealId, // ← ESTE FALTABA
                resumen_examen_mental,
                antecedentes_clinicos,
                diagnostico_aprendizaje,
                problemas_academicos,
                problemas_lectoescritura,
                evaluacion_pretest,
                evaluacion_postest,
                observaciones_sesion,
                observacion_conductual,
                recomendaciones,
                indicadores_logro,
                game_type,
                difficulty,
                current_level,
                accumulated_score,
                last_played
            ]
        );


            // Actualizar encuesta original
            await client.query(
                "UPDATE encuestas SET num_intentos = num_intentos + 1 WHERE id = $1",
                [encuesta_id]
            );

            await client.query("COMMIT");

            res.json({ message: "Resultados registrados correctamente" });

        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
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


// Admin: obtener encuestas + resultados de un usuario niño
const getEncuestasUsuarioAdmin = async (req, res, next) => {
    try {
        const { usuario_id } = req.params;

        // 👉 (Opcional) validar que quien hace la petición sea administrador:
        // if (req.user.tipo_usuario !== 'administrador') {
        //   return res.status(403).json({ error: 'Solo administradores pueden ver esta información' });
        // }

        // 1. Ver si este usuario tiene ficha de niño
        const ninoQuery = await db.query(
            `SELECT n.id AS nino_id, u.nombre AS nino_nombre
             FROM ninos n
             JOIN usuarios u ON n.usuario_id = u.id
             WHERE n.usuario_id = $1`,
            [usuario_id]
        );

        // Si no es niño o no tiene ficha, devolvemos lista vacía
        if (ninoQuery.rows.length === 0) {
            return res.json([]);
        }

        const ninoId = ninoQuery.rows[0].nino_id;
        const ninoNombre = ninoQuery.rows[0].nino_nombre;

        // 2. Traer encuestas de ese niño (todas, sin filtrar por evaluador)
        const encuestasRes = await db.query(
            `SELECT 
                e.id,
                e.fecha,
                e.num_intentos,
                e.num_sesion,
                e.observaciones,
                e.nino_id,
                ev.id AS evaluador_id,
                uev.nombre AS evaluador_nombre
             FROM encuestas e
             JOIN evaluadores ev ON e.evaluador_id = ev.id
             JOIN usuarios uev ON ev.usuario_id = uev.id
             WHERE e.nino_id = $1
             ORDER BY e.fecha DESC`,
            [ninoId]
        );

        const encuestas = encuestasRes.rows;

        if (encuestas.length === 0) {
            return res.json([]);
        }

        const encuestaIds = encuestas.map(e => e.id);

        // 3. Traer resultados de todas esas encuestas
        const resultadosRes = await db.query(
            `SELECT
                r.id,
                r.encuesta_id,
                r.resumen_examen_mental,
                r.antecedentes_clinicos,
                r.diagnostico_aprendizaje,
                r.problemas_academicos,
                r.problemas_lectoescritura,
                r.evaluacion_pretest,
                r.evaluacion_postest,
                r.observaciones_sesion,
                r.observacion_conductual,
                r.recomendaciones,
                r.indicadores_logro,
                r.game_type,
                r.difficulty,
                r.current_level,
                r.accumulated_score,
                r.last_played
             FROM resultados_encuesta r
             WHERE r.encuesta_id = ANY($1::int[])
             ORDER BY r.id ASC`,
            [encuestaIds]
        );

        const resultadosByEncuesta = {};
        for (const row of resultadosRes.rows) {
            if (!resultadosByEncuesta[row.encuesta_id]) {
                resultadosByEncuesta[row.encuesta_id] = [];
            }
            resultadosByEncuesta[row.encuesta_id].push(row);
        }

        // 4. Empaquetar: encuestas + resultados[]
        const payload = encuestas.map(e => ({
            ...e,
            nino_nombre: ninoNombre,
            resultados: resultadosByEncuesta[e.id] || []
        }));

        res.json(payload);
    } catch (error) {
        next(error);
    }
};

// Actualizar un resultado de encuesta (uso administrador)
const updateResultadoAdmin = async (req, res, next) => {
  try {
    const { resultado_id } = req.params;

    const {
      resumen_examen_mental,
      antecedentes_clinicos,
      diagnostico_aprendizaje,
      problemas_academicos,
      problemas_lectoescritura,
      evaluacion_pretest,
      evaluacion_postest,
      observaciones_sesion,
      observacion_conductual,
      recomendaciones,
      indicadores_logro,
      game_type,
      difficulty,
      current_level,
      accumulated_score,
      last_played
    } = req.body;

    // 👀 Aquí podrías verificar que req.user sea administrador si tienes ese campo:
    // if (req.user.tipo_usuario !== 'administrador') {
    //   return res.status(403).json({ error: 'Solo administradores pueden editar resultados.' });
    // }

    const result = await db.query(
      `UPDATE resultados_encuesta
       SET
         resumen_examen_mental = $1,
         antecedentes_clinicos = $2,
         diagnostico_aprendizaje = $3,
         problemas_academicos = $4,
         problemas_lectoescritura = $5,
         evaluacion_pretest = $6,
         evaluacion_postest = $7,
         observaciones_sesion = $8,
         observacion_conductual = $9,
         recomendaciones = $10,
         indicadores_logro = $11,
         game_type = $12,
         difficulty = $13,
         current_level = $14,
         accumulated_score = $15,
         last_played = $16
       WHERE id = $17
       RETURNING *`,
      [
        resumen_examen_mental,
        antecedentes_clinicos,
        diagnostico_aprendizaje,
        problemas_academicos,
        problemas_lectoescritura,
        evaluacion_pretest,
        evaluacion_postest,
        observaciones_sesion,
        observacion_conductual,
        recomendaciones,
        indicadores_logro,
        game_type,
        difficulty,
        current_level,
        accumulated_score,
        last_played,
        resultado_id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Resultado no encontrado" });
    }

    res.json({
      message: "Resultado actualizado correctamente",
      resultado: result.rows[0],
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
    getResultadosEncuesta,
    getEncuestasUsuarioAdmin,
    updateResultadoAdmin
};