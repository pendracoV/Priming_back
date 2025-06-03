const express = require('express');
const router = express.Router();
const { verifyToken, verifyEvaluador } = require('../middleware/auth');
const encuestaController = require('../controllers/encuestaController');

// Todas las rutas inician con /api/encuestas

// Crear una nueva encuesta
router.post('/', verifyToken, verifyEvaluador, encuestaController.crearEncuesta);

// Obtener encuestas de un niño
router.get('/nino/:nino_id', verifyToken, verifyEvaluador, encuestaController.getEncuestasNino);

// Actualizar encuesta
router.put('/:encuesta_id', verifyToken, verifyEvaluador, encuestaController.updateEncuesta);

// Registrar resultados de encuesta
router.post('/:encuesta_id/resultados', verifyToken, verifyEvaluador, encuestaController.registrarResultados);

// Obtener resultados de una encuesta
router.get('/:encuesta_id/resultados', verifyToken, verifyEvaluador, encuestaController.getResultadosEncuesta);

module.exports = router;