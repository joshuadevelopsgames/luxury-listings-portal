/**
 * V4 Edge Functions Service
 *
 * Calls Supabase Edge Functions (replacing Firebase Cloud Functions).
 * Each method mirrors the old Firebase httpsCallable API shape.
 */

import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;

// Functions that call slow external APIs get a longer client-side timeout.
const SLOW_FUNCTIONS = new Set(['scrape-listing', 'rank-listing-photos']);
const DEFAULT_TIMEOUT_MS = 20_000;   // 20s for fast functions
const SLOW_TIMEOUT_MS    = 50_000;   // 50s for Apify / vision APIs

/**
 * Helper — calls a Supabase Edge Function with the current user's JWT.
 * Includes a client-side AbortController timeout so the UI never hangs forever.
 */
async function callEdgeFunction(name, body = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const timeoutMs = SLOW_FUNCTIONS.has(name) ? SLOW_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || `Edge function ${name} failed (${response.status})`);
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Edge function ${name} timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── AI Caption Generation ────────────────────────────────────────────────────

/**
 * Generate a social media caption using GPT-4o-mini.
 * @param {Object} params
 * @param {string} params.description - Content description
 * @param {string} [params.platform='instagram'] - Target platform
 * @param {string} [params.tone='luxury'] - Tone style
 * @returns {Promise<{ caption: string, hashtags: string[], platform: string, provider: string }>}
 */
export async function generateCaption({ description, platform = 'instagram', tone = 'luxury' }) {
  const result = await callEdgeFunction('generate-caption', { description, platform, tone });
  return result;
}

// ── Instagram Metrics Extraction ─────────────────────────────────────────────

/**
 * Extract Instagram metrics from screenshot images using GPT-4o Vision.
 * @param {Array<{ base64?: string, url?: string }>} images
 * @returns {Promise<{ metrics: object, provider: string }>}
 */
export async function extractInstagramMetrics(images) {
  const result = await callEdgeFunction('extract-instagram-metrics', { images });
  return result;
}

// ── Report Summary Generation ─────────────────────────────────────────────────

/**
 * Generate a client-facing Instagram report summary.
 * @param {Object} params
 * @param {object} params.metrics - Instagram metrics object
 * @param {string} [params.dateRange] - e.g. "Jan 1 - Jan 31"
 * @param {string} [params.clientName] - Client name for context
 * @returns {Promise<{ summary: string }>}
 */
export async function generateReportSummary({ metrics, dateRange, clientName }) {
  const result = await callEdgeFunction('generate-report-summary', { metrics, dateRange, clientName });
  return result;
}

// ── Client Health Prediction ──────────────────────────────────────────────────

/**
 * Run AI health prediction for one or all clients.
 * @param {string} [clientId] - Omit for bulk run on all active clients
 * @returns {Promise<{ processed: number, results: Array }>}
 */
export async function runHealthCheck(clientId) {
  const body = clientId ? { client_id: clientId } : {};
  const result = await callEdgeFunction('run-health-check', body);
  return result;
}

// ── Canvas AI Assist ───────────────────────────────────────────────────────────

/**
 * AI assistance for Canvas blocks.
 * @param {Object} params
 * @param {'summarize'|'expand'|'tone'} params.action
 * @param {string} params.content - The text content to process
 * @param {string} [params.tone] - For 'tone' action: the target tone
 * @returns {Promise<{ result: string, action: string }>}
 */
export async function canvasAssist({ action, content, tone }) {
  const result = await callEdgeFunction('canvas-assist', { action, content, tone });
  return result;
}

// ── Listing Scraper ───────────────────────────────────────────────────────────

/**
 * Scrape a listing URL for structured property data.
 * Zillow → Apify actor. Everything else → OG tags + GPT-4o-mini extraction.
 * @param {string} url
 * @returns {Promise<{ title, address, price, beds, baths, squareFeet, description, sourceDomain, photos, provider }>}
 */
export async function scrapeListing(url) {
  const result = await callEdgeFunction('scrape-listing', { url });
  return result;
}

// ── Listing Photo Ranking ──────────────────────────────────────────────────────

/**
 * Rank listing photos using GPT-4o Vision.
 * @param {Array<{ id: string, url: string }>} images - Assets to rank
 * @returns {Promise<Array<{ id: string, score: number, flags: string[], rationale: string }>>}
 */
export async function rankListingPhotos(images) {
  const result = await callEdgeFunction('rank-listing-photos', { images });
  return result;
}

export default {
  generateCaption,
  extractInstagramMetrics,
  generateReportSummary,
  runHealthCheck,
  canvasAssist,
  rankListingPhotos,
  scrapeListing,
};
