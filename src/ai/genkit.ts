
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// IMPORTANT: Replace "YOUR_GOOGLE_GEMINI_API_KEY_REPLACE_ME" with your actual Google Gemini API Key.
// Hardcoding API keys is not recommended for production. Consider environment variables for better security.
const GOOGLE_GEMINI_API_KEY = "AIzaSyCT5lgSfwLO_NCeGrmthXvbs3SY00QdmJ4";

// API Key check removed

export const ai = genkit({
  plugins: [googleAI(GOOGLE_GEMINI_API_KEY ? { apiKey: GOOGLE_GEMINI_API_KEY } : undefined)].filter(p => p), // Pass apiKey if defined, filter out undefined plugin if key is missing
  model: 'googleai/gemini-2.0-flash', // Corrected: Closed the string
});
