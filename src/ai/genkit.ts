import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GOOGLE_GEMINI_API_KEY = "AIzaSyCT5lgSfwLO_NCeGrmthXvbs3SY00QdmJ4";

export const ai = genkit({
  plugins: [googleAI(GOOGLE_GEMINI_API_KEY ? { apiKey: GOOGLE_GEMINI_API_KEY } : undefined)].filter(p => p),
  model: 'googleai/gemini-2.0-flash',
});
