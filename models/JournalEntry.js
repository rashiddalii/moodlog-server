const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Date of the journal entry (YYYY-MM-DD format)
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Journal content
  content: {
    type: String,
    required: true,
    maxlength: 5000 // Limit to prevent abuse
  },
  // Mood rating (1-5 scale)
  mood: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Mood must be a whole number between 1 and 5'
    }
  },
  // Optional mood emoji
  moodEmoji: {
    type: String,
    enum: ['😢', '😕', '😐', '🙂', '😊'],
    required: false
  },
  // Optional tags for categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  // Track if entry was edited
  isEdited: {
    type: Boolean,
    default: false
  },
  // Track edit history
  editHistory: [{
    content: String,
    mood: Number,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure one entry per user per day
journalEntrySchema.index({ user: 1, date: 1 }, { unique: true });

// Pre-save middleware to handle edit history
journalEntrySchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('mood')) {
    this.isEdited = true;
  }
  next();
});

// Method to add edit to history
journalEntrySchema.methods.addEditHistory = function() {
  this.editHistory.push({
    content: this.content,
    mood: this.mood,
    editedAt: new Date()
  });
};

// Virtual for formatted date
journalEntrySchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Ensure virtuals are included in JSON
journalEntrySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
