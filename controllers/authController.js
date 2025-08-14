const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { ERROR_CODES, USER_TYPES } = require('../config/constants');
const { validatePassword, validateEmail } = require('../utils/passwordUtils');

// Controlador para registro de evaluadores
const register = async (req, res, next) => {
    try {
        const {
            nombre,
            correo_electronico,
            contrasena,
            tipo_usuario,
            // Campos de evaluador
            codigo,
            tipo, // Egresado, Estudiante o Docente
            tipo_documento, // TI, CC
            // Campos de niño
            edad, // 5, 6, 7
            grado, // 0, 1, 2, 3
            colegio,
            jornada // mañana, tarde, continua
        } = req.body;

        console.log('📩 Datos recibidos en el backend:', req.body);

        // Validaciones básicas comunes
        if (!validatePassword(contrasena)) {
            return res.status(400).json({
                error: "La contraseña es inválida o está vacía",
                code: ERROR_CODES.INVALID_PASSWORD
            });
        }

        if (!validateEmail(correo_electronico)) {
            return res.status(400).json({
                error: "El correo electrónico es inválido o está vacío",
                code: ERROR_CODES.INVALID_EMAIL
            });
        }

        // Verificar correo existente
        const correoExistente = await db.query(
            'SELECT id FROM usuarios WHERE correo_electronico = $1',
            [correo_electronico]
        );

        if (correoExistente.rows.length > 0) {
            return res.status(400).json({
                error: "El correo electrónico ya está registrado",
                code: ERROR_CODES.EMAIL_EXISTS
            });
        }

        // Validaciones específicas por tipo de usuario
        if (tipo_usuario === 'evaluador') {
            if (!codigo || !tipo || !tipo_documento) {
                return res.status(400).json({
                    error: "Código, tipo y tipo de documento son obligatorios para evaluadores",
                    code: ERROR_CODES.MISSING_FIELDS
                });
            }

            // Verificar código único para evaluadores
            const codigoExistente = await db.query(
                'SELECT id FROM evaluadores WHERE codigo = $1',
                [codigo]
            );
            if (codigoExistente.rows.length > 0) {
                return res.status(400).json({
                    error: `El código ya está registrado`,
                    code: ERROR_CODES.CODE_EXISTS,
                    detail: `Ya existe la llave (codigo)=(${codigo}).`
                });
            }
        }

        if (tipo_usuario === 'niño') {
            if (!edad || !grado || !colegio || !jornada) {
                return res.status(400).json({
                    error: "Edad, grado, colegio y jornada son obligatorios para niños",
                    code: ERROR_CODES.MISSING_FIELDS
                });
            }
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasena.trim(), 10);
        console.log('🔑 Contraseña encriptada:', hashedPassword);

        // Iniciar transacción
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // Crear usuario
            const usuarioResult = await client.query(
                'INSERT INTO usuarios (nombre, correo_electronico, contrasena, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id',
                [nombre, correo_electronico, hashedPassword, tipo_usuario]
            );

            const userId = usuarioResult.rows[0].id;

            // Insertar según el tipo de usuario
            if (tipo_usuario === 'evaluador') {
                await client.query(
                    'INSERT INTO evaluadores (usuario_id, codigo, tipo, tipo_documento, nombre) VALUES ($1, $2, $3, $4, $5)',
                    [userId, codigo, tipo, tipo_documento, nombre]
                );
            }

            if (tipo_usuario === 'niño') {
                await client.query(
                    'INSERT INTO ninos (usuario_id, edad, grado, colegio, jornada) VALUES ($1, $2, $3, $4, $5)',
                    [userId, edad, grado, colegio, jornada]
                );
            }

            await client.query('COMMIT');
            client.release();

            res.status(201).json({ message: 'Usuario registrado exitosamente', userId });

        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            console.error("❌ Error en el registro:", error);

            // Manejo de error por código duplicado en evaluadores
            if (error.detail && error.detail.includes('(codigo)=')) {
                return res.status(400).json({
                    error: `El código ya está registrado`,
                    code: ERROR_CODES.CODE_EXISTS,
                    detail: error.detail
                });
            }

            next(error);
        }

    } catch (error) {
        next(error);
    }
};


// Controlador para inicio de sesión
const login = async (req, res, next) => {
    try {
        const { correo_electronico, contrasena } = req.body;

        // Validar datos obligatorios
        if (!correo_electronico || !contrasena) {
            return res.status(400).json({ 
                error: "Correo y contraseña son obligatorios",
                code: ERROR_CODES.MISSING_CREDENTIALS
            });
        }

        // Buscar usuario por correo
        const result = await db.query(
            'SELECT * FROM usuarios WHERE correo_electronico = $1', 
            [correo_electronico]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: "Usuario no encontrado",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }

        // Verificar contraseña
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(contrasena, user.contrasena);
        
        if (!isMatch) {
            return res.status(401).json({ 
                error: "Contraseña incorrecta",
                code: ERROR_CODES.WRONG_PASSWORD
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                tipo_usuario: user.tipo_usuario === "administrador" ? USER_TYPES.ADMIN : user.tipo_usuario 
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Eliminar la contraseña antes de enviar la respuesta
        delete user.contrasena;

        res.json({ token, user });

    } catch (error) {
        next(error);
    }
};

// Controlador para verificar token
const verifyToken = async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT id, nombre, correo_electronico, tipo_usuario FROM usuarios WHERE id = $1', 
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                valid: false,
                error: "Usuario no encontrado",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }

        res.json({
            valid: true,
            user: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    verifyToken
};