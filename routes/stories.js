const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const storiesController = require('../controllers/storiesController');
const router = express.Router();

router.get('/categories/list', storiesController.getCategories);
router.get('/user/my-stories', authenticateToken, storiesController.getUserStories);
router.post('/', authenticateToken, storiesController.createStory);
router.get('/', optionalAuth, storiesController.getStories);
router.get('/:id', optionalAuth, storiesController.getStoryById);
router.put('/:id', authenticateToken, storiesController.updateStory);
router.delete('/:id', authenticateToken, storiesController.deleteStory);
router.post('/:id/like', authenticateToken, storiesController.toggleLike);
router.post('/:id/flag', authenticateToken, storiesController.flagStory);

module.exports = router;
