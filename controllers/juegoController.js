const db = require('../config/db');

// Obtener lista de juegos disponibles
const getJuegos = async (req, res, next) => {
    try {
        // En una implementación completa, esto se obtendría de la base de datos
        // Por ahora, usamos datos de ejemplo
        const juegos = [
            {
                id: 1,
                nombre: "Cognados",
                descripcion: "Juego de palabras que suenan similar tanto en español como en inglés",
                imagen: "/images/juegos/cognados.png",
                niveles: [
                    { id: 1, nombre: "Fácil", descripcion: "Nivel básico con 10 etapas" },
                    { id: 2, nombre: "Medio", descripcion: "Nivel intermedio con 5 etapas" },
                    { id: 3, nombre: "Difícil", descripcion: "Nivel avanzado con 5 etapas" }
                ]
            },
            {
                id: 2,
                nombre: "Pares Mínimos",
                descripcion: "Juego de palabras que suenan similar en su pronunciación en inglés",
                imagen: "/images/juegos/pares-minimos.png",
                niveles: [
                    { id: 4, nombre: "Fácil", descripcion: "Nivel básico con 10 etapas" },
                    { id: 5, nombre: "Medio", descripcion: "Nivel intermedio con 5 etapas" },
                    { id: 6, nombre: "Difícil", descripcion: "Nivel avanzado con 5 etapas" }
                ]
            }
        ];
        
        res.json(juegos);
    } catch (error) {
        next(error);
    }
};

// Obtener datos de un nivel específico
const getNivel = async (req, res, next) => {
    try {
        const { juegoId, nivelId } = req.params;
        
        // En una implementación completa, esto se obtendría de la base de datos
        // Por ahora, usamos datos de ejemplo para el primer nivel de cada juego
        
        let nivelData;
        
        // Cognados - Nivel Fácil
        if (juegoId === '1' && nivelId === '1') {
            nivelData = {
                id: 1,
                nombre: "Cognados - Nivel Fácil",
                juego_id: 1,
                instrucciones: "Escucha el audio y selecciona las palabras que correspondan al sonido en inglés.",
                tiempo_maximo: 180, // 3 minutos en segundos
                audio_entrenamiento: "/audio/cognados/facil/intro.mp3",
                indicadores: [
                    {
                        id: 1,
                        nombre: "Cocodrilo",
                        imagen: "/images/cognados/cocodrilo.png",
                        audio: "/audio/cognados/facil/cocodrilo.mp3"
                    }
                ],
                seleccionables: [
                    // Ejemplos de seleccionables (en una implementación real habría más)
                    { id: 1, palabra: "Tomato", imagen: "/images/cognados/facil/tomato.png", correcto: true, indicador_id: 1 },
                    { id: 2, palabra: "Piano", imagen: "/images/cognados/facil/piano.png", correcto: true, indicador_id: 1 },
                    // ...más elementos
                ]
            };
        }
        // Pares Mínimos - Nivel Fácil
        else if (juegoId === '2' && nivelId === '4') {
            nivelData = {
                id: 4,
                nombre: "Pares Mínimos - Nivel Fácil",
                juego_id: 2,
                instrucciones: "Escucha el audio y selecciona las palabras que correspondan exactamente al sonido en inglés.",
                tiempo_maximo: 180, // 3 minutos en segundos
                audio_entrenamiento: "/audio/pares/facil/intro.mp3",
                indicadores: [
                    {
                        id: 1,
                        nombre: "Pirata",
                        imagen: "/images/pares/pirata.png",
                        audio: "/audio/pares/facil/ship.mp3"
                    }
                ],
                seleccionables: [
                    // Ejemplos de seleccionables (en una implementación real habría más)
                    { id: 1, palabra: "Ship", imagen: "/images/pares/facil/ship.png", correcto: true, indicador_id: 1 },
                    { id: 2, palabra: "Sheet", imagen: "/images/pares/facil/sheet.png", correcto: true, indicador_id: 1 },
                    // ...más elementos
                ]
            };
        } else {
            return res.status(404).json({
                error: "Nivel no encontrado"
            });
        }
        
        res.json(nivelData);
    } catch (error) {
        next(error);
    }
};

// Guardar progreso del jugador en un nivel
const guardarProgreso = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { juegoId, nivelId } = req.params;
        const { puntuacion, tiempo, aciertos, fallos, completado } = req.body;
        
        // Verificar si existe un progreso previo
        const progresoQuery = await db.query(
            'SELECT id FROM progreso_juego WHERE usuario_id = $1 AND juego_id = $2 AND nivel_id = $3',
            [userId, juegoId, nivelId]
        );
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            if (progresoQuery.rows.length > 0) {
                // Actualizar progreso existente
                const progresoId = progresoQuery.rows[0].id;
                await client.query(
                    `UPDATE progreso_juego 
                     SET puntuacion = $1, tiempo = $2, aciertos = $3, fallos = $4, completado = $5, fecha_actualizacion = NOW() 
                     WHERE id = $6`,
                    [puntuacion, tiempo, aciertos, fallos, completado, progresoId]
                );
            } else {
                // Crear nuevo progreso
                await client.query(
                    `INSERT INTO progreso_juego (usuario_id, juego_id, nivel_id, puntuacion, tiempo, aciertos, fallos, completado, fecha_creacion, fecha_actualizacion)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
                    [userId, juegoId, nivelId, puntuacion, tiempo, aciertos, fallos, completado]
                );
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

// Obtener progreso del jugador en todos los niveles
const getProgreso = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const query = await db.query(
            `SELECT juego_id, nivel_id, puntuacion, tiempo, aciertos, fallos, completado, fecha_actualizacion
             FROM progreso_juego
             WHERE usuario_id = $1
             ORDER BY juego_id, nivel_id`,
            [userId]
        );
        
        res.json(query.rows);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getJuegos,
    getNivel,
    guardarProgreso,
    getProgreso
};