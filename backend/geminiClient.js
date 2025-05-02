// geminiClient.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKeys = [
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4,
  process.env.GEMINI_API_KEY5,
  process.env.GEMINI_API_KEY6,
  process.env.GEMINI_API_KEY7,
  process.env.GEMINI_API_KEY8,
  process.env.GEMINI_API_KEY9
];

let currentKeyIndex = 0;

function createModel(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
}

async function generateGeminiResponse(prompt, maxRetries = apiKeys.length) {
  let retries = 0;

  while (retries < maxRetries) {
    const apiKey = apiKeys[currentKeyIndex];
    const model = createModel(apiKey);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.warn(`Gemini API key ${currentKeyIndex + 1} failed: ${err.message}`);

      // Rotate to the next key
      currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
      retries++;
    }
  }

  throw new Error("All Gemini API keys failed or quota exhausted");
}

module.exports = { generateGeminiResponse };
