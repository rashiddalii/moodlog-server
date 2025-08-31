const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/register-anonymous', authLimiter, authController.registerAnonymous);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refreshToken);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
