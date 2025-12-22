<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CrowdGuard AI - Crowd Management System

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1HTeFHXVOjYFs9E_onsM6fA6UJ7q1KcLf

## Run Locally

**Prerequisites:**  Node.js 16+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory and set your Gemini API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your actual API key
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## Build for Production

1. Build the app:
   ```bash
   npm run build
   ```

2. Preview the production build:
   ```bash
   npm run preview
   ```

## Environment Variables

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key (required). Get one from [Google AI Studio](https://aistudio.google.com/apikey)

## Deployment

For production deployment:

1. Make sure your `.env` file with `VITE_GEMINI_API_KEY` is set
2. Run `npm run build` to create the optimized production build
3. Deploy the `dist/` folder to your hosting service (Netlify, Vercel, GitHub Pages, etc.)
4. Set the environment variable `VITE_GEMINI_API_KEY` in your hosting platform's settings

## Technologies Used

- React 19
- TypeScript
- Tailwind CSS
- Vite
- Google Gemini AI API
