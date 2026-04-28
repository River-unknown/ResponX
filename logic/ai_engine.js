const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini with API key from environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// Simulated AI Engine for Heuristic AI Triage using Google Gemini
const verifyEvent = async (payload) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    const prompt = `Analyze this IoT sensor event for a building crisis system. Event details: Type: ${payload.type}, Location: ${payload.location}, Intensity: ${payload.intensity || 'unknown'}. 
    Determine a confidence score (0.0 to 1.0) indicating the likelihood of a crisis. Calculate it as intensity / 100 if intensity is provided, otherwise 0.5. Respond ONLY with valid JSON: {"confidence": 0.95}. Classify as verified crisis if confidence >0.85, advisory if confidence >0.5, false positive otherwise.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Remove markdown formatting if present
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(text);
    const confidence = Math.max(0, Math.min(1, parsed.confidence || 0));
    
    return {
      confidence,
      verified: confidence > 0.85,
      advisory: confidence > 0.5,
      falsePositive: confidence <= 0.5
    };
  } catch (error) {
    // Check if it's a rate limit error
    if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
      console.warn('Gemini API rate limit reached. Using simulation for this request.');
    } else {
      console.error('Gemini API error, falling back to simulation:', error.message);
    }
    
    // Fallback to original simulation if API fails
    let confidence = 0;
    
    if (payload.intensity !== undefined) {
      confidence = payload.intensity / 100;
    } else {
      confidence = Math.random();
    }
    
    confidence = Math.max(0, Math.min(1, confidence));
    
    return {
      confidence,
      verified: confidence > 0.85,
      advisory: confidence > 0.5,
      falsePositive: confidence <= 0.5
    };
  }
};

module.exports = {
  verifyEvent
};
