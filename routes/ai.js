const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const aiController = require('../controllers/aiController');
const router = express.Router();

router.post('/analyze-mood', authenticateToken, aiController.analyzeMood);
router.post('/health-chat', authenticateToken, aiController.healthChat);

module.exports = router;