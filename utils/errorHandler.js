const { ERROR_CODES } = require('../config/constants');

// Manejador centralizado de errores
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);
    
    // Si ya se envió una respuesta, no hacer nada
    if (res.headersSent) {
        return next(err);
    }
    
    // Obtener información sobre el error
    const message = err.message || 'Ha ocurrido un error en el servidor';
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || ERROR_CODES.SERVER_ERROR;
    
    // Responder con el error
    res.status(statusCode).json({
        error: message,
        code: errorCode,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;