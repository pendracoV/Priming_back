const express = require('express');
const router = express.Router();
const { verifyToken, verifyNinoOrEvaluador } = require('../middleware/auth');
const juegoController = require('../controllers/juegoController');

// Todas las rutas inician con /api/juegos

// Obtener todos los juegos disponibles
router.get('/', verifyToken, juegoController.getJuegos);

// Obtener datos de un nivel específico
router.get('/:juegoId/nivel/:nivelId', verifyToken, juegoController.getNivel);

// Guardar progreso del jugador
router.post('/:juegoId/nivel/:nivelId/progreso', verifyToken, juegoController.guardarProgreso);

// Obtener progreso del jugador
router.get('/progreso', verifyToken, juegoController.getProgreso);

module.exports = router;