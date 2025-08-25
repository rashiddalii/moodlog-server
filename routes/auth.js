const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/register-anonymous', authController.registerAnonymous);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
