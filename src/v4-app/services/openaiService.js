/**
 * OpenAI Service stub for V4.
 * V3 calls OpenAI directly from the client.
 * In V4, AI features are handled via Supabase Edge Functions
 * (see edgeFunctionsService.js).
 */

import { generateCaption, generateReportSummary, canvasAssist, runHealthCheck } from './edgeFunctionsService';

export const openaiService = {
  async generateCaption(prompt, options = {}) {
    try {
      return await generateCaption(prompt, options);
    } catch (e) {
      console.warn('[V4] Caption generation via edge function failed:', e.message);
      return { caption: '', error: e.message };
    }
  },

  async generateText(prompt) {
    try {
      const result = await canvasAssist({ action: 'expand', text: prompt });
      return result?.text || '';
    } catch (e) {
      console.warn('[V4] Text generation failed:', e.message);
      return '';
    }
  },

  async summarize(text) {
    try {
      const result = await canvasAssist({ action: 'summarize', text });
      return result?.text || '';
    } catch (e) {
      return text;
    }
  },

  async generateReportSummary(data) {
    try {
      return await generateReportSummary(data);
    } catch (e) {
      return { summary: '', error: e.message };
    }
  },

  async runHealthCheck(data) {
    try {
      return await runHealthCheck(data);
    } catch (e) {
      return { prediction: null, error: e.message };
    }
  },

  async chat(messages) {
    console.warn('[V4] Direct OpenAI chat not available — use edge functions');
    return { message: 'AI chat is being migrated to V4.' };
  },
};

export default openaiService;
