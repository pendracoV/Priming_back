const jwt = require('jsonwebtoken');
const { ERROR_CODES, USER_TYPES } = require('../config/constants');

// Middleware para verificar el token de autenticación
const verifyToken = (req, res, next) => {
    let token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ 
            error: "Acceso denegado",
            code: ERROR_CODES.ACCESS_DENIED
        });
    }

    // Si el token viene con prefijo "Bearer ", lo removemos
    if (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ 
            error: "Token inválido",
            code: ERROR_CODES.INVALID_TOKEN
        });
    }
};

// Middleware para verificar si el usuario es administrador
const verifyAdmin = (req, res, next) => {
    if (req.user.tipo_usuario !== USER_TYPES.ADMIN) {
        return res.status(403).json({ 
            error: "Acceso denegado. Se requieren permisos de administrador.",
            code: ERROR_CODES.ACCESS_DENIED
        });
    }
    next();
};

// Middleware para verificar si el usuario es evaluador
const verifyEvaluador = (req, res, next) => {
    if (req.user.tipo_usuario !== USER_TYPES.EVALUADOR && req.user.tipo_usuario !== USER_TYPES.ADMIN) {
        return res.status(403).json({ 
            error: "Acceso denegado. Se requieren permisos de evaluador.",
            code: ERROR_CODES.NOT_EVALUATOR
        });
    }
    next();
};

// Middleware para verificar si el usuario es un niño
const verifyNino = (req, res, next) => {
    if (req.user.tipo_usuario !== USER_TYPES.NINO) {
        return res.status(403).json({ 
            error: "Acceso denegado. Esta funcionalidad es solo para estudiantes.",
            code: ERROR_CODES.ACCESS_DENIED
        });
    }
    next();
};

// Middleware que permite el acceso tanto a niños como a evaluadores
const verifyNinoOrEvaluador = (req, res, next) => {
    const { tipo_usuario } = req.user;
    if (tipo_usuario !== USER_TYPES.NINO && 
        tipo_usuario !== USER_TYPES.EVALUADOR && 
        tipo_usuario !== USER_TYPES.ADMIN) {
        return res.status(403).json({ 
            error: "Acceso denegado.",
            code: ERROR_CODES.ACCESS_DENIED
        });
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdmin,
    verifyEvaluador,
    verifyNino,
    verifyNinoOrEvaluador
};
