require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

// Datos iniciales para la base de datos
async function seed() {
    try {
        console.log('🌱 Iniciando proceso de siembra de datos...');
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Verificar si ya existen datos
            const usersCheck = await client.query('SELECT COUNT(*) FROM usuarios');
            
            if (parseInt(usersCheck.rows[0].count) > 0) {
                console.log('⚠️ La base de datos ya tiene datos. Abortando proceso de siembra.');
                await client.query('ROLLBACK');
                client.release();
                return;
            }
            
            // Crear usuarios de prueba
            console.log('👤 Creando usuarios de prueba...');
            
            // Contraseñas: Admin123, Evaluador123, Nino123
            const hashedPasswords = {
                admin: await bcrypt.hash('Admin123', SALT_ROUNDS),
                evaluador: await bcrypt.hash('Evaluador123', SALT_ROUNDS),
                nino: await bcrypt.hash('Nino123', SALT_ROUNDS)
            };
            
            // Insertar administrador
            const adminResult = await client.query(
                `INSERT INTO usuarios (nombre, correo_electronico, contrasena, tipo_usuario) 
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                ['Administrador', 'admin@priming.com', hashedPasswords.admin, 'admin']
            );
            
            console.log(`✅ Administrador creado con ID: ${adminResult.rows[0].id}`);
            
            // Insertar evaluadores
            const evaluadores = [
                { nombre: 'Docente Pérez', correo: 'docente@priming.com', codigo: 'DOC001', tipo: 'Docente' },
                { nombre: 'Estudiante García', correo: 'estudiante@priming.com', codigo: 'EST001', tipo: 'Estudiante' },
                { nombre: 'Egresado Martínez', correo: 'egresado@priming.com', codigo: 'EGR001', tipo: 'Egresado' }
            ];
            
            for (const evaluador of evaluadores) {
                const evalResult = await client.query(
                    `INSERT INTO usuarios (nombre, correo_electronico, contrasena, tipo_usuario) 
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [evaluador.nombre, evaluador.correo, hashedPasswords.evaluador, 'evaluador']
                );
                
                const evalId = evalResult.rows[0].id;
                
                await client.query(
                    `INSERT INTO evaluadores (usuario_id, codigo, tipo) VALUES ($1, $2, $3)`,
                    [evalId, evaluador.codigo, evaluador.tipo]
                );
                
                console.log(`✅ Evaluador ${evaluador.nombre} creado con ID: ${evalId}`);
            }
            
            // Insertar niños
            const ninos = [
                { nombre: 'Juan Pérez', correo: 'juan@priming.com', edad: 5, grado: -1, colegio: 'Colegio San José', jornada: 'mañana' },
                { nombre: 'María García', correo: 'maria@priming.com', edad: 6, grado: 1, colegio: 'Colegio Santa Inés', jornada: 'tarde' },
                { nombre: 'Pedro Rodríguez', correo: 'pedro@priming.com', edad: 7, grado: 2, colegio: 'Colegio Nuevo Horizonte', jornada: 'Continua' }
            ];
            
            for (const nino of ninos) {
                const ninoResult = await client.query(
                    `INSERT INTO usuarios (nombre, correo_electronico, contrasena, tipo_usuario) 
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [nino.nombre, nino.correo, hashedPasswords.nino, 'niño']
                );
                
                const ninoId = ninoResult.rows[0].id;
                
                const ninoInfoResult = await client.query(
                    `INSERT INTO ninos (usuario_id, edad, grado, colegio, jornada) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [ninoId, nino.edad, nino.grado, nino.colegio, nino.jornada]
                );
                
                console.log(`✅ Niño ${nino.nombre} creado con ID: ${ninoId}`);
            }
            
            // Insertar juegos y niveles (si no existen)
            const juegosCheck = await client.query('SELECT COUNT(*) FROM juegos');
            
            if (parseInt(juegosCheck.rows[0].count) === 0) {
                console.log('🎮 Creando juegos y niveles...');
                
                // Juegos
                const juegos = [
                    { nombre: 'Cognados', descripcion: 'Juego de palabras que suenan similar tanto en español como en inglés', imagen: '/images/juegos/cognados.png' },
                    { nombre: 'Pares Mínimos', descripcion: 'Juego de palabras que suenan similar en su pronunciación en inglés', imagen: '/images/juegos/pares-minimos.png' }
                ];
                
                for (const juego of juegos) {
                    const juegoResult = await client.query(
                        `INSERT INTO juegos (nombre, descripcion, imagen) 
                         VALUES ($1, $2, $3) RETURNING id`,
                        [juego.nombre, juego.descripcion, juego.imagen]
                    );
                    
                    const juegoId = juegoResult.rows[0].id;
                    console.log(`✅ Juego ${juego.nombre} creado con ID: ${juegoId}`);
                    
                    // Niveles para cada juego
                    const dificultades = ['fácil', 'medio', 'difícil'];
                    const tiempos = [180, 150, 90]; // segundos
                    
                    for (let i = 0; i < dificultades.length; i++) {
                        const nivelResult = await client.query(
                            `INSERT INTO niveles (juego_id, nombre, descripcion, dificultad, instrucciones, tiempo_maximo, audio_entrenamiento) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                            [
                                juegoId,
                                `Nivel ${i + 1}`,
                                `Nivel ${dificultades[i]} de ${juego.nombre}`,
                                dificultades[i],
                                `Escucha el audio y selecciona las palabras correctas.`,
                                tiempos[i],
                                `/audio/${juego.nombre.toLowerCase().replace(' ', '-')}/${dificultades[i]}/intro.mp3`
                            ]
                        );
                        
                        console.log(`✅ Nivel ${i + 1} (${dificultades[i]}) creado para ${juego.nombre}`);
                    }
                }
            }
            
            // Asignar niños a evaluadores (crear encuestas)
            console.log('📋 Creando encuestas y asignaciones...');
            
            // Obtener IDs de evaluadores
            const evaluadoresQuery = await client.query('SELECT id FROM evaluadores');
            const evaluadoresIds = evaluadoresQuery.rows;
            
            // Obtener IDs de niños
            const ninosQuery = await client.query('SELECT id FROM ninos');
            const ninosIds = ninosQuery.rows;
            
            // Asignar cada niño a cada evaluador
            for (const nino of ninosIds) {
                for (const evaluador of evaluadoresIds) {
                    await client.query(
                        `INSERT INTO encuestas (nino_id, evaluador_id, fecha, num_intentos, num_sesion, observaciones)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            nino.id,
                            evaluador.id,
                            new Date(),
                            0,
                            1,
                            'Encuesta inicial de prueba'
                        ]
                    );
                }
                
                console.log(`✅ Niño con ID ${nino.id} asignado a todos los evaluadores`);
            }
            
            await client.query('COMMIT');
            console.log('✅ Proceso de siembra completado exitosamente!');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error en el proceso de siembra:', error);
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Error general en el proceso de siembra:', error);
    }
}

// Ejecutar función de siembra
seed()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error en la siembra:', err);
        process.exit(1);
    });