const express = require('express');
const router = express.Router();
const { verifyToken, verifyEvaluador } = require('../middleware/auth');
const evaluadorController = require('../controllers/evaluadorController');

// Todas las rutas inician con /api/evaluador

// Asignar niño a evaluador
router.post('/asignar-nino', verifyToken, verifyEvaluador, evaluadorController.asignarNino);

// Obtener niños asignados
router.get('/ninos', verifyToken, verifyEvaluador, evaluadorController.getNinosAsignados);

// Obtener resultados de un niño específico
router.get('/resultados/:ninoId', verifyToken, verifyEvaluador, evaluadorController.getResultadosNino);

module.exports = router;