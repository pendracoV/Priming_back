const bcrypt = require('bcrypt');
const db = require('../config/db');
const { ERROR_CODES, USER_TYPES } = require('../config/constants');
const { validatePassword } = require('../utils/passwordUtils');

// Obtener perfil del usuario actual
const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userType = req.user.tipo_usuario;
        
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
        
        const userData = userQuery.rows[0];
        
        // Obtener datos específicos según el tipo de usuario
        if (userType === USER_TYPES.EVALUADOR) {
            const evaluadorQuery = await db.query(
                'SELECT codigo, tipo FROM evaluadores WHERE usuario_id = $1',
                [userId]
            );
            
            if (evaluadorQuery.rows.length > 0) {
                Object.assign(userData, evaluadorQuery.rows[0]);
            }
        } else if (userType === USER_TYPES.NINO) {
            const ninoQuery = await db.query(
                'SELECT edad, grado, colegio, jornada FROM ninos WHERE usuario_id = $1',
                [userId]
            );
            
            if (ninoQuery.rows.length > 0) {
                Object.assign(userData, ninoQuery.rows[0]);
            }
        }
        
        res.json(userData);
    } catch (error) {
        next(error);
    }
};

// Actualizar perfil del usuario
const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userType = req.user.tipo_usuario;
        const { nombre, correo_electronico, tipo, codigo, edad, grado, colegio, jornada } = req.body;
        
        // Validar datos básicos
        if (!nombre || !correo_electronico) {
            return res.status(400).json({
                error: "El nombre y correo electrónico son obligatorios",
                code: ERROR_CODES.MISSING_DATA
            });
        }
        
        // Verificar si el correo ya está en uso por otro usuario
        const correoQuery = await db.query(
            'SELECT id FROM usuarios WHERE correo_electronico = $1 AND id != $2',
            [correo_electronico, userId]
        );
        
        if (correoQuery.rows.length > 0) {
            return res.status(400).json({
                error: "El correo electrónico ya está en uso por otro usuario",
                code: ERROR_CODES.EMAIL_EXISTS
            });
        }
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Actualizar datos básicos del usuario
            await client.query(
                'UPDATE usuarios SET nombre = $1, correo_electronico = $2 WHERE id = $3',
                [nombre, correo_electronico, userId]
            );
            
            // Actualizar datos específicos según el tipo de usuario
            if (userType === USER_TYPES.EVALUADOR && tipo && codigo) {
                // Verificar si el código ya está en uso por otro evaluador
                const codigoQuery = await client.query(
                    'SELECT evaluadores.id FROM evaluadores JOIN usuarios ON evaluadores.usuario_id = usuarios.id WHERE evaluadores.codigo = $1 AND usuarios.id != $2',
                    [codigo, userId]
                );
                
                if (codigoQuery.rows.length > 0) {
                    throw new Error("El código ya está en uso por otro evaluador");
                }
                
                await client.query(
                    'UPDATE evaluadores SET tipo = $1, codigo = $2 WHERE usuario_id = $3',
                    [tipo, codigo, userId]
                );
            } else if (userType === USER_TYPES.NINO && edad !== undefined && grado !== undefined && colegio && jornada) {
                await client.query(
                    'UPDATE ninos SET edad = $1, grado = $2, colegio = $3, jornada = $4 WHERE usuario_id = $5',
                    [edad, grado, colegio, jornada, userId]
                );
            }
            
            await client.query('COMMIT');
            client.release();
            
            res.json({
                message: "Perfil actualizado correctamente"
            });
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            
            if (error.message === "El código ya está en uso por otro evaluador") {
                return res.status(400).json({
                    error: error.message,
                    code: ERROR_CODES.CODE_EXISTS
                });
            }
            
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// Cambiar contraseña
const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { contrasena } = req.body;
        
        // Validar la contraseña
        if (!validatePassword(contrasena)) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos 6 caracteres, una letra mayúscula y un número",
                code: ERROR_CODES.INVALID_PASSWORD
            });
        }
        
        // Encriptar la nueva contraseña
        const hashedPassword = await bcrypt.hash(contrasena.trim(), 10);
        
        // Actualizar la contraseña en la base de datos
        await db.query(
            'UPDATE usuarios SET contrasena = $1 WHERE id = $2',
            [hashedPassword, userId]
        );
        
        res.json({
            message: "Contraseña actualizada correctamente"
        });
    } catch (error) {
        next(error);
    }
};

// Obtener datos básicos del usuario
const getUserInfo = async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT id, nombre, correo_electronico, tipo_usuario FROM usuarios WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "Usuario no encontrado",
                code: ERROR_CODES.USER_NOT_FOUND
            });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

// Obtener todos los usuarios (solo admin)
const getAllUsers = async (req, res, next) => {
    try {
        // Solo permitir admins
        if (req.user.tipo_usuario !== USER_TYPES.ADMIN) {
            return res.status(403).json({
                error: "Acceso denegado. Solo administradores pueden ver la lista de usuarios.",
                code: ERROR_CODES.UNAUTHORIZED
            });
        }

        const result = await db.query(
            'SELECT id, nombre, correo_electronico, tipo_usuario FROM usuarios ORDER BY id ASC'
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getUserInfo,
    getAllUsers
};