const mongoose = require('mongoose');

const anonymousStorySchema = new mongoose.Schema({
  // Anonymous author - no user reference
  authorId: {
    type: String,
    required: true
  },
  // Story title
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  // Story content
  content: {
    type: String,
    required: true,
    maxlength: 10000 // Longer limit for stories
  },
  // Story category/topic
  category: {
    type: String,
    required: true,
    enum: ['Anxiety', 'Depression', 'Recovery', 'Coping', 'Hope', 'Gratitude', 'Other']
  },
  // Story tags for better categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  // Story status (draft, published, flagged)
  status: {
    type: String,
    enum: ['draft', 'published', 'flagged', 'removed'],
    default: 'published'
  },
  // Community engagement
  likes: {
    type: Number,
    default: 0
  },
  // Track who liked (for preventing duplicate likes)
  likedBy: [{
    type: String // authorId of users who liked
  }],
  // Comments count
  commentsCount: {
    type: Number,
    default: 0
  },
  // Story visibility
  isPublic: {
    type: Boolean,
    default: true
  },
  // Moderation flags
  flags: [{
    reason: {
      type: String,
      enum: ['inappropriate', 'spam', 'harmful', 'other']
    },
    flaggedBy: String, // authorId
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
anonymousStorySchema.index({ status: 1, createdAt: -1 });
anonymousStorySchema.index({ category: 1, status: 1 });
anonymousStorySchema.index({ authorId: 1, createdAt: -1 });

// Method to add like
anonymousStorySchema.methods.addLike = function(authorId) {
  if (!this.likedBy.includes(authorId)) {
    this.likedBy.push(authorId);
    this.likes = this.likedBy.length;
  }
};

// Method to remove like
anonymousStorySchema.methods.removeLike = function(authorId) {
  const index = this.likedBy.indexOf(authorId);
  if (index > -1) {
    this.likedBy.splice(index, 1);
    this.likes = this.likedBy.length;
  }
};

// Method to add flag
anonymousStorySchema.methods.addFlag = function(authorId, reason) {
  this.flags.push({
    reason,
    flaggedBy: authorId
  });
  
  // Auto-flag if too many flags
  if (this.flags.length >= 3) {
    this.status = 'flagged';
  }
};

// Virtual for excerpt (first 200 characters)
anonymousStorySchema.virtual('excerpt').get(function() {
  return this.content.length > 200 
    ? this.content.substring(0, 200) + '...' 
    : this.content;
});

// Ensure virtuals are included in JSON
anonymousStorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('AnonymousStory', anonymousStorySchema);
