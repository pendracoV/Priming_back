const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Rutas de usuario
router.get('/user', verifyToken, userController.getUserInfo);
router.get('/perfil', verifyToken, userController.getProfile);
router.put('/perfil', verifyToken, userController.updateProfile);
router.put('/cambiar-password', verifyToken, userController.changePassword);
router.get('/users', verifyToken, userController.getAllUsers);

module.exports = router;