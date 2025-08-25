const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const journalController = require('../controllers/journalController');
const router = express.Router();

router.post('/entry', authenticateToken, journalController.createOrUpdateEntry);
router.get('/entry/:date', authenticateToken, journalController.getEntryByDate);
router.get('/entries', authenticateToken, journalController.getEntries);
router.delete('/entry/:date', authenticateToken, journalController.deleteEntry);
router.get('/mood-trends', authenticateToken, journalController.getMoodTrends);
router.get('/recent', authenticateToken, journalController.getRecentEntries);

module.exports = router;
