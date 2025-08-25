const AnonymousStory = require('../models/AnonymousStory');
const mongoose = require('mongoose');

class StoriesController {
  async createStory(req, res) {
    try {
      const { title, content, category, tags } = req.body;

      if (!title || !content || !category) {
        return res.status(400).json({ 
          message: 'Title, content, and category are required',
          code: 'MISSING_FIELDS'
        });
      }

      if (title.length > 100) {
        return res.status(400).json({ 
          message: 'Title is too long (max 100 characters)',
          code: 'TITLE_TOO_LONG'
        });
      }

      if (content.length > 10000) {
        return res.status(400).json({ 
          message: 'Content is too long (max 10000 characters)',
          code: 'CONTENT_TOO_LONG'
        });
      }

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
      res.status(500).json({ 
        message: 'Failed to post story',
        code: 'STORY_CREATE_ERROR'
      });
    }
  }

  async getStories(req, res) {
    try {
      const { 
        category, 
        page = 1, 
        limit = 10, 
        sort = 'newest' 
      } = req.query;

      let query = { status: 'published' };

      if (category) {
        query.category = category;
      }

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
        .select('-flags');

      const total = await AnonymousStory.countDocuments(query);

      const storiesWithUserLikes = stories.map(story => {
        const storyObj = story.toObject();
        storyObj.userLiked = req.user ? story.likedBy.includes(req.user._id.toString()) : false;
        delete storyObj.likedBy;
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
      res.status(500).json({ 
        message: 'Failed to fetch stories',
        code: 'STORIES_FETCH_ERROR'
      });
    }
  }

  async getStoryById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          message: 'Invalid story ID',
          code: 'INVALID_ID'
        });
      }

      const story = await AnonymousStory.findOne({
        _id: id,
        status: 'published'
      });

      if (!story) {
        return res.status(404).json({ 
          message: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
      }

      const storyObj = story.toObject();
      storyObj.userLiked = req.user ? story.likedBy.includes(req.user._id.toString()) : false;

      res.json({
        story: storyObj
      });

    } catch (error) {
      console.error('Get story error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch story',
        code: 'STORY_FETCH_ERROR'
      });
    }
  }

  async toggleLike(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          message: 'Invalid story ID',
          code: 'INVALID_ID'
        });
      }

      const story = await AnonymousStory.findOne({
        _id: id,
        status: 'published'
      });

      if (!story) {
        return res.status(404).json({ 
          message: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
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
      res.status(500).json({ 
        message: 'Failed to update like',
        code: 'LIKE_UPDATE_ERROR'
      });
    }
  }

  async getUserStories(req, res) {
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
      res.status(500).json({ 
        message: 'Failed to fetch user stories',
        code: 'USER_STORIES_FETCH_ERROR'
      });
    }
  }

  async updateStory(req, res) {
    try {
      const { id } = req.params;
      const { title, content, category, tags } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          message: 'Invalid story ID',
          code: 'INVALID_ID'
        });
      }

      const story = await AnonymousStory.findOne({
        _id: id,
        authorId: req.user._id.toString()
      });

      if (!story) {
        return res.status(404).json({ 
          message: 'Story not found or not authorized',
          code: 'STORY_NOT_FOUND_OR_UNAUTHORIZED'
        });
      }

      if (title) {
        if (title.length > 100) {
          return res.status(400).json({ 
            message: 'Title is too long (max 100 characters)',
            code: 'TITLE_TOO_LONG'
          });
        }
        story.title = title;
      }
      
      if (content) {
        if (content.length > 10000) {
          return res.status(400).json({ 
            message: 'Content is too long (max 10000 characters)',
            code: 'CONTENT_TOO_LONG'
          });
        }
        story.content = content;
      }
      
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
      res.status(500).json({ 
        message: 'Failed to update story',
        code: 'STORY_UPDATE_ERROR'
      });
    }
  }

  async deleteStory(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          message: 'Invalid story ID',
          code: 'INVALID_ID'
        });
      }

      const story = await AnonymousStory.findOneAndDelete({
        _id: id,
        authorId: req.user._id.toString()
      });

      if (!story) {
        return res.status(404).json({ 
          message: 'Story not found or not authorized',
          code: 'STORY_NOT_FOUND_OR_UNAUTHORIZED'
        });
      }

      res.json({ message: 'Story deleted successfully' });

    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({ 
        message: 'Failed to delete story',
        code: 'STORY_DELETE_ERROR'
      });
    }
  }

  async flagStory(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !['inappropriate', 'spam', 'harmful', 'other'].includes(reason)) {
        return res.status(400).json({ 
          message: 'Valid reason is required',
          code: 'INVALID_FLAG_REASON'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
          message: 'Invalid story ID',
          code: 'INVALID_ID'
        });
      }

      const story = await AnonymousStory.findOne({
        _id: id,
        status: 'published'
      });

      if (!story) {
        return res.status(404).json({ 
          message: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
      }

      const alreadyFlagged = story.flags.some(flag => 
        flag.flaggedBy === req.user._id.toString()
      );

      if (alreadyFlagged) {
        return res.status(400).json({ 
          message: 'You have already flagged this story',
          code: 'ALREADY_FLAGGED'
        });
      }

      story.addFlag(req.user._id.toString(), reason);
      await story.save();

      res.json({ message: 'Story flagged successfully' });

    } catch (error) {
      console.error('Flag story error:', error);
      res.status(500).json({ 
        message: 'Failed to flag story',
        code: 'STORY_FLAG_ERROR'
      });
    }
  }

  async getCategories(req, res) {
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
      res.status(500).json({ 
        message: 'Failed to fetch categories',
        code: 'CATEGORIES_FETCH_ERROR'
      });
    }
  }
}

module.exports = new StoriesController();