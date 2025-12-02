# AI Prompt Generator

A web application that converts images into detailed AI art generation prompts using Google's Gemini API.

## Features

- 🖼️ Upload images and get professional AI prompts
- 💾 Save your favorite prompts with cloud sync
- 🔄 Regenerate prompts with one click
- 🔐 Firebase authentication
- 💳 Built-in credits system (server-side)
- ☁️ **NEW:** Full cloud synchronization (Firestore + Storage)
- 📱 **NEW:** Access your data from any device
- 🗂️ **NEW:** Complete chat history saved
- 🖼️ **NEW:** Automatic image compression
- ♾️ **NEW:** Unlimited saved prompts

## Tech Stack

- React 19 + Vite
- Gemini API (Flash Lite 2.0)
- Firebase (Auth, Firestore & Storage)
- Lucide React (Icons)
- WebP Image Compression

## Setup

1. **Clone and install**
```bash
git clone <your-repo-url>
cd ai-prompt-generator-5.0
npm install
```

2. **Configure environment**

Create a `.env` file:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
# Примечание: имя bucket может быть .firebasestorage.app (новый формат) 
# или .appspot.com (старый формат). Проверьте в Firebase Console!
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Get Gemini API Key**: https://aistudio.google.com/app/apikey  
**Firebase Setup**: See `SETUP.md`

3. **Run**
```bash
npm run dev
```

Visit `http://localhost:5173`

## Usage

1. Sign up / Log in
2. Upload an image (JPG, PNG, WEBP, max 10MB)
3. Wait for generation (~5-15 seconds)
4. Copy the prompt or save to favorites
5. Use in Midjourney, DALL-E, Stable Diffusion, etc.

## Configuration

The app is pre-configured with optimized settings for high-quality prompts. Settings can be adjusted in `src/api/geminiConfig.js` if needed.

## Troubleshooting

**"Region restricted" error**: Use a VPN (US/UK/EU servers) - Gemini API is not available in all regions.

**Out of credits**: Credits are stored server-side. Initial balance is 1000 credits per user.

**"Permission denied" error**: Make sure Firebase Security Rules are properly configured (see `FIREBASE_RULES.md`).

**Images not loading**: Ensure Firebase Storage is enabled and rules are set up correctly.

## 🆕 Recent Updates

**Version 5.0** - Full Cloud Synchronization
- Migrated from localStorage to Firestore + Firebase Storage
- All user data now syncs across devices
- Images are automatically compressed before upload
- Chat history fully preserved
- Server-side credit management

See `MIGRATION_GUIDE.md` for detailed setup instructions.

## License

MIT License
