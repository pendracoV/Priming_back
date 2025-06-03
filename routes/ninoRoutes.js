const express = require('express');
const router = express.Router();
const { verifyToken, verifyNino } = require('../middleware/auth');
const ninoController = require('../controllers/ninoController');

// Todas las rutas inician con /api/nino

// Obtener datos del niño actual
router.get('/perfil', verifyToken, verifyNino, ninoController.getPerfilNino);

// Obtener progreso del niño en los juegos
router.get('/progreso', verifyToken, verifyNino, ninoController.getProgresoNino);

module.exports = router;