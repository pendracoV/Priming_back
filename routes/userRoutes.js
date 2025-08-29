const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Rutas de usuario (acceso propio)
router.get('/user', verifyToken, userController.getUserInfo);
router.get('/perfil', verifyToken, userController.getProfile);
router.put('/perfil', verifyToken, userController.updateProfile);
router.put('/cambiar-password', verifyToken, userController.changePassword);

// Rutas de administración (solo admin)
router.get('/users', verifyToken, verifyAdmin, userController.getAllUsers);
router.put('/users/:id', verifyToken, verifyAdmin, userController.updateUserByAdmin);
router.delete('/users/:id', verifyToken, verifyAdmin, userController.deleteUserByAdmin);

module.exports = router;
