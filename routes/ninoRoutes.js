const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    getPerfilNino,
    getProgresoNino,
    guardarProgresoJuego,
    getNivelActual,
    getEstadisticas,
    validarPassword,              // NUEVO
    getProgresoEspecifico,        // NUEVO
    saveProgresoEspecifico        // NUEVO
} = require('../controllers/ninoController');

// Rutas existentes (ajusta según las que ya tengas)
router.get('/perfil', verifyToken, getPerfilNino);
router.get('/progreso', verifyToken, getProgresoNino);
router.post('/juego/:juegoId/nivel/:nivelId/progreso', verifyToken, guardarProgresoJuego);
router.get('/juego/:juegoId/nivel-actual', verifyToken, getNivelActual);
router.get('/estadisticas', verifyToken, getEstadisticas);

// NUEVAS RUTAS
router.post('/validar-password', verifyToken, validarPassword);
router.get('/:nino_id/progreso-especifico', verifyToken, getProgresoEspecifico);
router.post('/:nino_id/progreso-especifico', verifyToken, saveProgresoEspecifico);

module.exports = router;