const JournalEntry = require('../models/JournalEntry');

class JournalController {
  async createOrUpdateEntry(req, res) {
    try {
      const { content, mood, moodEmoji, tags } = req.body;

      if (!content || !mood) {
        return res.status(400).json({ 
          message: 'Content and mood are required',
          code: 'MISSING_FIELDS'
        });
      }

      if (mood < 1 || mood > 5 || !Number.isInteger(mood)) {
        return res.status(400).json({ 
          message: 'Mood must be a whole number between 1 and 5',
          code: 'INVALID_MOOD'
        });
      }

      if (content.length > 5000) {
        return res.status(400).json({ 
          message: 'Content is too long (max 5000 characters)',
          code: 'CONTENT_TOO_LONG'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let entry = await JournalEntry.findOne({
        user: req.user._id,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (entry) {
        entry.addEditHistory();
        entry.content = content;
        entry.mood = mood;
        entry.moodEmoji = moodEmoji;
        entry.tags = tags || [];
        entry.isEdited = true;
      } else {
        entry = new JournalEntry({
          user: req.user._id,
          content,
          mood,
          moodEmoji,
          tags: tags || []
        });
      }

      await entry.save();

      res.json({
        message: entry.isEdited ? 'Journal entry updated' : 'Journal entry created',
        entry: {
          id: entry._id,
          content: entry.content,
          mood: entry.mood,
          moodEmoji: entry.moodEmoji,
          tags: entry.tags,
          date: entry.date,
          isEdited: entry.isEdited,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        }
      });

    } catch (error) {
      console.error('Journal entry error:', error);
      res.status(500).json({ 
        message: 'Failed to save journal entry',
        code: 'JOURNAL_SAVE_ERROR'
      });
    }
  }

  async getEntryByDate(req, res) {
    try {
      const { date } = req.params;
      
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ 
          message: 'Invalid date format',
          code: 'INVALID_DATE'
        });
      }

      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      const entry = await JournalEntry.findOne({
        user: req.user._id,
        date: {
          $gte: targetDate,
          $lt: nextDay
        }
      });

      if (!entry) {
        return res.status(404).json({ 
          message: 'No entry found for this date',
          code: 'ENTRY_NOT_FOUND'
        });
      }

      res.json({
        entry: {
          id: entry._id,
          content: entry.content,
          mood: entry.mood,
          moodEmoji: entry.moodEmoji,
          tags: entry.tags,
          date: entry.date,
          isEdited: entry.isEdited,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        }
      });

    } catch (error) {
      console.error('Get entry error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch journal entry',
        code: 'JOURNAL_FETCH_ERROR'
      });
    }
  }

  async getEntries(req, res) {
    try {
      const { startDate, endDate, limit = 30 } = req.query;

      let query = { user: req.user._id };

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          query.date = { $gte: start, $lte: end };
        }
      }

      const entries = await JournalEntry.find(query)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .select('-editHistory');

      res.json({
        entries: entries.map(entry => ({
          id: entry._id,
          content: entry.content,
          mood: entry.mood,
          moodEmoji: entry.moodEmoji,
          tags: entry.tags,
          date: entry.date,
          isEdited: entry.isEdited,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        }))
      });

    } catch (error) {
      console.error('Get entries error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch journal entries',
        code: 'ENTRIES_FETCH_ERROR'
      });
    }
  }

  async deleteEntry(req, res) {
    try {
      const { date } = req.params;
      
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ 
          message: 'Invalid date format',
          code: 'INVALID_DATE'
        });
      }

      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      const entry = await JournalEntry.findOneAndDelete({
        user: req.user._id,
        date: {
          $gte: targetDate,
          $lt: nextDay
        }
      });

      if (!entry) {
        return res.status(404).json({ 
          message: 'No entry found for this date',
          code: 'ENTRY_NOT_FOUND'
        });
      }

      res.json({ message: 'Journal entry deleted successfully' });

    } catch (error) {
      console.error('Delete entry error:', error);
      res.status(500).json({ 
        message: 'Failed to delete journal entry',
        code: 'JOURNAL_DELETE_ERROR'
      });
    }
  }

  async getMoodTrends(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const entries = await JournalEntry.find({
        user: req.user._id,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      const moodCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const moodTrend = [];
      let totalMood = 0;
      let entryCount = 0;

      entries.forEach(entry => {
        moodCounts[entry.mood]++;
        totalMood += entry.mood;
        entryCount++;
        
        moodTrend.push({
          date: entry.date.toISOString().split('T')[0],
          mood: entry.mood,
          moodEmoji: entry.moodEmoji
        });
      });

      const averageMood = entryCount > 0 ? (totalMood / entryCount).toFixed(1) : 0;
      const mostFrequentMood = Object.entries(moodCounts).reduce((a, b) => 
        moodCounts[a[0]] > moodCounts[b[0]] ? a : b
      )[0];

      let improvementTrend = 'stable';
      if (moodTrend.length >= 7) {
        const firstWeek = moodTrend.slice(0, 7).reduce((sum, entry) => sum + entry.mood, 0) / 7;
        const lastWeek = moodTrend.slice(-7).reduce((sum, entry) => sum + entry.mood, 0) / 7;
        
        if (lastWeek > firstWeek + 0.5) improvementTrend = 'improving';
        else if (lastWeek < firstWeek - 0.5) improvementTrend = 'declining';
      }

      res.json({
        statistics: {
          totalEntries: entryCount,
          averageMood: parseFloat(averageMood),
          mostFrequentMood: parseInt(mostFrequentMood),
          moodDistribution: moodCounts,
          improvementTrend
        },
        moodTrend,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });

    } catch (error) {
      console.error('Mood trends error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch mood trends',
        code: 'MOOD_TRENDS_ERROR'
      });
    }
  }

  async getRecentEntries(req, res) {
    try {
      const { limit = 5 } = req.query;

      const entries = await JournalEntry.find({ user: req.user._id })
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .select('content mood moodEmoji date');

      res.json({
        entries: entries.map(entry => ({
          id: entry._id,
          content: entry.content,
          mood: entry.mood,
          moodEmoji: entry.moodEmoji,
          date: entry.date
        }))
      });

    } catch (error) {
      console.error('Recent entries error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch recent entries',
        code: 'RECENT_ENTRIES_ERROR'
      });
    }
  }
}

module.exports = new JournalController();