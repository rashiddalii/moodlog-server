const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

class AIService {
  async analyzeMoodFromText(text) {
    try {
      if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return 3; // Default neutral if no API key
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze this text and return only a number 1-5 for mood:
1=Very Sad, 2=Sad, 3=Neutral, 4=Happy, 5=Very Happy

Text: "${text}"

Number:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const moodScore = parseInt(response.text().trim());
      
      return isNaN(moodScore) || moodScore < 1 || moodScore > 5 ? 3 : moodScore;
    } catch (error) {
      console.error('AI mood analysis error:', error.message);
      return 3; // Default to neutral
    }
  }

  async healthChat(message, conversationHistory = []) {
    try {
      console.log('Health chat called with:', message);
      console.log('API Key exists:', !!config.GEMINI_API_KEY);
      
      if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return "Please configure your Gemini API key in the .env file to use this feature.";
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `You are a helpful AI health assistant. Answer this question about health or wellness. Answer like a professional doctor and keep it short and simple text and a paragraph: ${message}`;

      console.log('Sending prompt to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Gemini response received:', text?.substring(0, 50));
      
      return text || "I understand you're looking for health guidance. Could you please rephrase your question?";
    } catch (error) {
      console.error('AI health chat error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      
      if (error.message?.includes('API_KEY') || error.status === 400) {
        return "API key issue. Please check your Gemini API configuration.";
      }
      return `Error: ${error.message || 'Technical difficulties'}`;
    }
  }
}

module.exports = new AIService();