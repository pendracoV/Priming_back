// Definición de códigos de error
const ERROR_CODES = {
    // Errores de autenticación
    ACCESS_DENIED: 1001,
    INVALID_TOKEN: 1002,
    WRONG_PASSWORD: 1003,
    USER_NOT_FOUND: 1004,
    MISSING_CREDENTIALS: 1005,
    
    // Errores de registro
    INVALID_PASSWORD: 2001,
    INVALID_EMAIL: 2002,
    EMAIL_EXISTS: 2003,
    CODE_EXISTS: 2004,
    MISSING_DATA: 2005,
    NOT_EVALUATOR: 2006,
    
    // Errores de servidor
    SERVER_ERROR: 5001
};

// Otros constantes que puedan ser necesarias
const USER_TYPES = {
    ADMIN: 'admin',
    EVALUADOR: 'evaluador',
    NINO: 'niño'
};

const JORNADAS = ['mañana', 'tarde', 'Continua'];

const EVALUADOR_TYPES = ['Estudiante', 'Docente', 'Egresado'];

module.exports = {
    ERROR_CODES,
    USER_TYPES,
    JORNADAS,
    EVALUADOR_TYPES
};