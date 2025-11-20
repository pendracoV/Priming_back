const express = require('express');
const router = express.Router();
const { verifyToken, verifyEvaluador /* , verifyAdmin */ } = require('../middleware/auth');
const encuestaController = require('../controllers/encuestaController');

// Todas las rutas inician con /api/encuestas

// Crear una nueva encuesta
router.post('/', verifyToken, verifyEvaluador, encuestaController.crearEncuesta);

// Obtener encuestas de un niño (vista evaluador)
router.get('/nino/:nino_id', verifyToken, verifyEvaluador, encuestaController.getEncuestasNino);

// Actualizar encuesta
router.put('/:encuesta_id', verifyToken, verifyEvaluador, encuestaController.updateEncuesta);

// Registrar resultados de encuesta
router.post('/:encuesta_id/resultados', verifyToken, verifyEvaluador, encuestaController.registrarResultados);

// Obtener resultados de una encuesta (vista evaluador)
router.get('/:encuesta_id/resultados', verifyToken, verifyEvaluador, encuestaController.getResultadosEncuesta);

/* ============================
   RUTA ADMIN: encuestas de un usuario niño
   ============================ */
// GET /api/encuestas/admin/usuario/:usuario_id
// Devuelve todas las encuestas + resultados asociadas al usuario (si tiene ficha de niño)
router.get('/admin/usuario/:usuario_id',verifyToken,encuestaController.getEncuestasUsuarioAdmin);



// 🔹 Admin: actualizar resultado concreto
router.put('/admin/resultados/:resultado_id',verifyToken,encuestaController.updateResultadoAdmin
);


module.exports = router;
