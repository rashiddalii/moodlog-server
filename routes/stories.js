const express = require('express');
const AnonymousStory = require('../models/AnonymousStory');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Post a new anonymous story
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    // Validation
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Title, content, and category are required' });
    }

    if (title.length > 100) {
      return res.status(400).json({ message: 'Title is too long (max 100 characters)' });
    }

    if (content.length > 10000) {
      return res.status(400).json({ message: 'Content is too long (max 10000 characters)' });
    }

    // Create story with anonymous author ID
    const story = new AnonymousStory({
      authorId: req.user._id.toString(),
      title,
      content,
      category,
      tags: tags || []
    });

    await story.save();

    res.status(201).json({
      message: 'Story posted successfully',
      story: {
        id: story._id,
        title: story.title,
        excerpt: story.excerpt,
        category: story.category,
        tags: story.tags,
        likes: story.likes,
        commentsCount: story.commentsCount,
        createdAt: story.createdAt
      }
    });

  } catch (error) {
    console.error('Post story error:', error);
    res.status(500).json({ message: 'Failed to post story' });
  }
});

// Get all published stories (with optional filtering)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      category, 
      page = 1, 
      limit = 10, 
      sort = 'newest' 
    } = req.query;

    let query = { status: 'published' };

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'popular':
        sortObj = { likes: -1, createdAt: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const stories = await AnonymousStory.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-flags -likedBy');

    const total = await AnonymousStory.countDocuments(query);

    // Check if current user has liked each story
    const storiesWithUserLikes = stories.map(story => {
      const storyObj = story.toObject();
      storyObj.userLiked = req.user ? story.likedBy.includes(req.user._id.toString()) : false;
      return storyObj;
    });

    res.json({
      stories: storiesWithUserLikes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalStories: total,
        hasNext: skip + stories.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ message: 'Failed to fetch stories' });
  }
});

// Get a specific story by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const story = await AnonymousStory.findOne({
      _id: id,
      status: 'published'
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    const storyObj = story.toObject();
    storyObj.userLiked = req.user ? story.likedBy.includes(req.user._id.toString()) : false;

    res.json({
      story: storyObj
    });

  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ message: 'Failed to fetch story' });
  }
});

// Like/unlike a story
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const story = await AnonymousStory.findOne({
      _id: id,
      status: 'published'
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    const authorId = req.user._id.toString();
    const hasLiked = story.likedBy.includes(authorId);

    if (hasLiked) {
      story.removeLike(authorId);
    } else {
      story.addLike(authorId);
    }

    await story.save();

    res.json({
      message: hasLiked ? 'Story unliked' : 'Story liked',
      likes: story.likes,
      userLiked: !hasLiked
    });

  } catch (error) {
    console.error('Like story error:', error);
    res.status(500).json({ message: 'Failed to update like' });
  }
});

// Get user's own stories
router.get('/user/my-stories', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const stories = await AnonymousStory.find({
      authorId: req.user._id.toString()
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-flags -likedBy');

    const total = await AnonymousStory.countDocuments({
      authorId: req.user._id.toString()
    });

    res.json({
      stories,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalStories: total,
        hasNext: skip + stories.length < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ message: 'Failed to fetch user stories' });
  }
});

// Update user's own story
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags } = req.body;

    const story = await AnonymousStory.findOne({
      _id: id,
      authorId: req.user._id.toString()
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found or not authorized' });
    }

    // Update fields if provided
    if (title) story.title = title;
    if (content) story.content = content;
    if (category) story.category = category;
    if (tags) story.tags = tags;

    await story.save();

    res.json({
      message: 'Story updated successfully',
      story: {
        id: story._id,
        title: story.title,
        excerpt: story.excerpt,
        category: story.category,
        tags: story.tags,
        status: story.status,
        updatedAt: story.updatedAt
      }
    });

  } catch (error) {
    console.error('Update story error:', error);
    res.status(500).json({ message: 'Failed to update story' });
  }
});

// Delete user's own story
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const story = await AnonymousStory.findOneAndDelete({
      _id: id,
      authorId: req.user._id.toString()
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found or not authorized' });
    }

    res.json({ message: 'Story deleted successfully' });

  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'Failed to delete story' });
  }
});

// Flag a story for moderation
router.post('/:id/flag', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !['inappropriate', 'spam', 'harmful', 'other'].includes(reason)) {
      return res.status(400).json({ message: 'Valid reason is required' });
    }

    const story = await AnonymousStory.findOne({
      _id: id,
      status: 'published'
    });

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if user already flagged this story
    const alreadyFlagged = story.flags.some(flag => 
      flag.flaggedBy === req.user._id.toString()
    );

    if (alreadyFlagged) {
      return res.status(400).json({ message: 'You have already flagged this story' });
    }

    story.addFlag(req.user._id.toString(), reason);
    await story.save();

    res.json({ message: 'Story flagged successfully' });

  } catch (error) {
    console.error('Flag story error:', error);
    res.status(500).json({ message: 'Failed to flag story' });
  }
});

// Get story categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      'Anxiety',
      'Depression', 
      'Recovery',
      'Coping',
      'Hope',
      'Gratitude',
      'Other'
    ];

    res.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

module.exports = router;
