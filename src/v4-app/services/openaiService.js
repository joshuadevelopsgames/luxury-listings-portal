/**
 * OpenAI Service stub for V4.
 * V3 calls OpenAI directly from the client.
 * In V4, AI features are handled via Supabase Edge Functions
 * (see edgeFunctionsService.js).
 */

import { generateCaption, generateReportSummary, canvasAssist, runHealthCheck, rankListingPhotos, scrapeListing } from './edgeFunctionsService';

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

  /**
   * Rank listing photos via GPT-4o Vision edge function.
   * Falls back gracefully if the edge function isn't deployed yet.
   * @param {Array<{ id: string, url: string }>} images
   * @returns {Promise<Array<{ id: string, score: number, flags: string[], rationale: string }>>}
   */
  async rankListingPhotos(images) {
    try {
      return await rankListingPhotos(images);
    } catch (e) {
      console.warn('[V4] rankListingPhotos edge function not available:', e.message);
      throw e;
    }
  },

  /**
   * Scrape a listing URL for structured property data.
   * @param {string} url
   * @returns {Promise<{ title, address, price, beds, baths, squareFeet, description, sourceDomain, photos }>}
   */
  async scrapeListing(url) {
    try {
      return await scrapeListing(url);
    } catch (e) {
      console.warn('[V4] scrapeListing failed:', e.message);
      return {};
    }
  },
};

export default openaiService;
