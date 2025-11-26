// src/api/gemini.js

// Функция генерации промпта с изображения через Gemini Flash-Lite
export async function generatePromptFromImage(file, { signal, onPhase }) {
  onPhase?.("Загружаю изображение…");

  // Получаем ключ из .env
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Отсутствует VITE_GEMINI_API_KEY в .env");
  }

  // Конвертация файла → base64
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(reader.result.split(",")[1]); // убираем data:image/jpeg;base64,
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  onPhase?.("Отправляю запрос…");

  // Запрос к Gemini Flash-Lite
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=" +
      apiKey,
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Generate a detailed professional prompt describing this image." },
              { inline_data: { mime_type: file.type, data: base64 } }
            ]
          }
        ]
      }),
    }
  );

  if (!response.ok) {
    throw new Error("API error: " + (await response.text()));
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Gemini не вернул текста");

  onPhase?.("Готово");

  return text;
}
