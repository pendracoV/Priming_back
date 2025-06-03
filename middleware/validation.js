const { ERROR_CODES } = require('../config/constants');
const { validateEmail, validatePassword } = require('../utils/passwordUtils');

// Middleware para validar datos de registro
const validateRegister = (req, res, next) => {
    try {
        const { nombre, codigo, tipo, correo_electronico, contrasena, tipo_usuario } = req.body;
        const errors = [];

        // Validar campos obligatorios
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            errors.push('El nombre es obligatorio');
        }

        if (!correo_electronico) {
            errors.push('El correo electrónico es obligatorio');
        } else if (!validateEmail(correo_electronico)) {
            return res.status(400).json({
                error: 'El formato del correo electrónico no es válido',
                code: ERROR_CODES.INVALID_EMAIL
            });
        }

        if (!contrasena) {
            errors.push('La contraseña es obligatoria');
        } else if (!validatePassword(contrasena)) {
            return res.status(400).json({
                error: 'La contraseña debe tener al menos 6 caracteres, una letra mayúscula y un número',
                code: ERROR_CODES.INVALID_PASSWORD
            });
        }

        if (!tipo_usuario || !['admin', 'evaluador', 'niño'].includes(tipo_usuario)) {
            errors.push('El tipo de usuario es obligatorio y debe ser válido');
        }

        // Validar campos específicos según el tipo de usuario
        if (tipo_usuario === 'evaluador') {
            if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
                errors.push('El código es obligatorio para evaluadores');
            }
            if (!tipo || !['Estudiante', 'Docente', 'Egresado'].includes(tipo)) {
                errors.push('El tipo de evaluador debe ser Estudiante, Docente o Egresado');
            }
        }

        if (tipo_usuario === 'niño') {
            const { edad, grado, colegio, jornada } = req.body;
            
            if (!edad || isNaN(edad) || edad < 5 || edad > 7) {
                errors.push('La edad debe estar entre 5 y 7 años');
            }
            if (grado === undefined || isNaN(grado) || grado < -1 || grado > 2) {
                errors.push('El grado debe estar entre -1 (preescolar) y 2');
            }
            if (!colegio || typeof colegio !== 'string' || colegio.trim() === '') {
                errors.push('El nombre del colegio es obligatorio');
            }
            if (!jornada || !['mañana', 'tarde', 'Continua'].includes(jornada)) {
                errors.push('La jornada debe ser mañana, tarde o Continua');
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Datos incompletos o inválidos',
                details: errors,
                code: ERROR_CODES.MISSING_DATA
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware para validar datos de login
const validateLogin = (req, res, next) => {
    try {
        const { correo_electronico, contrasena } = req.body;
        const errors = [];

        if (!correo_electronico) {
            errors.push('El correo electrónico es obligatorio');
        }

        if (!contrasena) {
            errors.push('La contraseña es obligatoria');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Correo electrónico y contraseña son obligatorios',
                code: ERROR_CODES.MISSING_CREDENTIALS
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware para validar datos de asignar niño
const validateAsignarNino = (req, res, next) => {
    try {
        const { nombre, correo_electronico, contrasena, edad, grado, colegio, jornada } = req.body;
        const errors = [];

        // Validar campos obligatorios
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
            errors.push('El nombre es obligatorio');
        }

        if (!correo_electronico) {
            errors.push('El correo electrónico es obligatorio');
        } else if (!validateEmail(correo_electronico)) {
            return res.status(400).json({
                error: 'El formato del correo electrónico no es válido',
                code: ERROR_CODES.INVALID_EMAIL
            });
        }

        if (!contrasena) {
            errors.push('La contraseña es obligatoria');
        } else if (!validatePassword(contrasena)) {
            return res.status(400).json({
                error: 'La contraseña debe tener al menos 6 caracteres, una letra mayúscula y un número',
                code: ERROR_CODES.INVALID_PASSWORD
            });
        }

        if (!edad || isNaN(edad) || edad < 5 || edad > 7) {
            errors.push('La edad debe estar entre 5 y 7 años');
        }

        if (grado === undefined || isNaN(grado) || grado < -1 || grado > 2) {
            errors.push('El grado debe estar entre -1 (preescolar) y 2');
        }

        if (!colegio || typeof colegio !== 'string' || colegio.trim() === '') {
            errors.push('El nombre del colegio es obligatorio');
        }

        if (!jornada || !['mañana', 'tarde', 'Continua'].includes(jornada)) {
            errors.push('La jornada debe ser mañana, tarde o Continua');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Faltan datos obligatorios',
                details: errors,
                code: ERROR_CODES.MISSING_DATA
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware para validar datos de progreso
const validateProgreso = (req, res, next) => {
    try {
        const { puntuacion, tiempo, aciertos, fallos, completado } = req.body;
        const errors = [];

        if (puntuacion === undefined || isNaN(puntuacion) || puntuacion < 0) {
            errors.push('La puntuación debe ser un número positivo');
        }

        if (tiempo === undefined || isNaN(tiempo) || tiempo < 0) {
            errors.push('El tiempo debe ser un número positivo');
        }

        if (aciertos === undefined || isNaN(aciertos) || aciertos < 0) {
            errors.push('Los aciertos deben ser un número positivo');
        }

        if (fallos === undefined || isNaN(fallos) || fallos < 0) {
            errors.push('Los fallos deben ser un número positivo');
        }

        if (completado === undefined || typeof completado !== 'boolean') {
            errors.push('El campo completado debe ser un valor booleano');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Datos de progreso inválidos',
                details: errors,
                code: ERROR_CODES.MISSING_DATA
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware para validar datos de encuesta
const validateEncuesta = (req, res, next) => {
    try {
        const { nino_id } = req.body;
        const errors = [];

        if (!nino_id || isNaN(nino_id) || nino_id <= 0) {
            errors.push('El ID del niño es obligatorio y debe ser un número positivo');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Datos de encuesta inválidos',
                details: errors,
                code: ERROR_CODES.MISSING_DATA
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware para validar resultados de encuesta
const validateResultadosEncuesta = (req, res, next) => {
    try {
        const { resultados } = req.body;
        const errors = [];

        if (!Array.isArray(resultados) || resultados.length === 0) {
            return res.status(400).json({
                error: 'Los resultados deben ser un array no vacío',
                code: ERROR_CODES.MISSING_DATA
            });
        }

        for (let i = 0; i < resultados.length; i++) {
            const resultado = resultados[i];
            if (!resultado.pregunta || typeof resultado.pregunta !== 'string') {
                errors.push(`El resultado ${i + 1} debe tener una pregunta válida`);
            }
            if (resultado.respuesta === undefined) {
                errors.push(`El resultado ${i + 1} debe tener una respuesta`);
            }
            if (resultado.tipo_voz && !['hombre', 'mujer'].includes(resultado.tipo_voz)) {
                errors.push(`El tipo de voz en el resultado ${i + 1} debe ser 'hombre' o 'mujer'`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Datos de resultados inválidos',
                details: errors,
                code: ERROR_CODES.MISSING_DATA
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateRegister,
    validateLogin,
    validateAsignarNino,
    validateProgreso,
    validateEncuesta,
    validateResultadosEncuesta
};