const aiService = require('../services/aiService');

class AIController {
  async analyzeMood(req, res) {
    try {
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ 
          message: 'Content is required',
          code: 'MISSING_CONTENT'
        });
      }

      const suggestedMood = await aiService.analyzeMoodFromText(content);

      // Ensure we always return a valid mood number
      if (typeof suggestedMood !== 'number' || suggestedMood < 1 || suggestedMood > 5) {
        console.log('Invalid mood returned from AI service, using default');
        return res.json({
          suggestedMood: 3,
          message: 'Mood analysis completed (using default)'
        });
      }

      res.json({
        suggestedMood,
        message: 'Mood analysis completed'
      });

    } catch (error) {
      console.error('AI mood analysis error:', error);
      // Return a default mood instead of an error
      res.json({
        suggestedMood: 3,
        message: 'Mood analysis failed, using default mood'
      });
    }
  }

  async healthChat(req, res) {
    try {
      const { message, conversationHistory } = req.body;
      console.log('Health chat request:', { message, historyLength: conversationHistory?.length || 0 });

      if (!message || !message.trim()) {
        return res.status(400).json({ 
          message: 'Message is required',
          code: 'MISSING_MESSAGE'
        });
      }

      const response = await aiService.healthChat(message, conversationHistory || []);
      console.log('AI response:', response.substring(0, 100) + '...');

      res.json({
        response,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('AI health chat controller error:', error);
      res.status(500).json({ 
        message: 'Failed to process chat message',
        code: 'AI_CHAT_ERROR'
      });
    }
  }
}

module.exports = new AIController();