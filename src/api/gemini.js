import { GoogleGenerativeAI } from "@google/generative-ai";
import { generationConfig, systemInstruction } from "./geminiConfig";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Check for API key
if (!API_KEY || API_KEY === 'your_api_key_here') {
  console.error(
    '%c⚠️ Gemini API Key Not Configured!',
    'color: #ef4444; font-size: 16px; font-weight: bold;'
  );
  console.log(
    '%cPlease follow these steps:\n\n' +
    '1. Get API key from: https://aistudio.google.com/app/apikey\n' +
    '2. Create .env file in project root\n' +
    '3. Add: VITE_GEMINI_API_KEY=your_key_here\n' +
    '4. Restart dev server (npm run dev)\n\n' +
    'See SETUP.md for detailed instructions',
    'color: #f59e0b; font-size: 14px;'
  );
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Initialize model with optimized settings
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  generationConfig,
  systemInstruction,
});

/**
 * Конвертирует ArrayBuffer в base64 без переполнения стека
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // Обрабатываем по 8KB за раз
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
}

/**
 * Генерация промпта прямо в браузере, без серверов
 */
export async function generatePromptFromImage(file, { signal, onPhase } = {}) {
  try {
    onPhase?.("Analysing image…");

    // читаем файл → в base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    onPhase?.("Generating prompt…");

    const result = await model.generateContent(
      [
        {
          inlineData: {
            data: base64,
            mimeType: file.type,
          },
        },
        {
          text: "Analyze this image and create a detailed, comprehensive description for AI image generation. Structure your response with these sections: Overall Impression, Subject and Appearance, Setting and Background, Technical Aspects (lighting, colors, composition), and Style/Mood. Be thorough and specific. Write a professional, detailed analysis that captures all important visual elements.",
        },
      ],
      { signal }
    );

    onPhase?.("Finalizing…");

    return result.response.text();
  } catch (error) {
    console.error("Gemini error:", error);
    
    // Проверяем географические ограничения
    if (error.message?.includes("User location is not supported") || 
        error.message?.includes("location") && error.status === 400) {
      throw {
        type: "location_restricted",
        message: "⚠️ Gemini API is not available in your region. Please use a VPN (US/UK/EU servers) and try again."
      };
    }
    
    // Проверяем специфичные ошибки API
    if (error.message?.includes("API key")) {
      throw {
        type: "api_key",
        message: "API key issue. Please check your Gemini API key in .env file."
      };
    }
    
    if (error.message?.includes("403") || error.status === 403) {
      throw {
        type: "forbidden",
        message: "API access denied. Your API key may be invalid or leaked."
      };
    }
    
    // Общая сетевая ошибка
    throw {
      type: "network",
      message: "Failed to generate prompt. Please try again."
    };
  }
}
