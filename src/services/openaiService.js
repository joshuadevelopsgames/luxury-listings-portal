/**
 * OpenAI Service for AI-powered features
 * Used for smart column mapping in Google Sheets imports
 *
 * SECURITY: every AI call goes through the server-side proxy at /api/ai
 * (see api/ai.js + services/aiProxyClient.js) so the OpenRouter/OpenAI key
 * never ships in the browser bundle. Model names here are provider-neutral
 * logical names ('gpt-4o', 'gpt-4o-mini'); the proxy maps them per provider.
 */

import { aiChatCompletion, aiChatContent } from './aiProxyClient';
import { uploadFileForVision, removeFiles } from './storageService';

// Provider per-request image cap is ~20 (OpenRouter; varies by model). Stay under
// it so ANY number of screenshots works: small batches are a single request,
// larger ones are split across requests and their metrics merged.
const MAX_IMAGES_PER_VISION_REQUEST = 12;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Array fields keyed by the property identifying a duplicate row, so merging
// per-batch results unions them by identity instead of clobbering.
const MERGE_ARRAY_KEYS = {
  topCities: 'name', topCountries: 'name', ageRanges: 'range',
  contentBreakdown: 'type', interactionsByContent: 'type',
  topSourcesOfViews: 'source', activeTimes: 'hour',
};

// Merge per-batch Instagram metrics: first-defined wins for scalars, shallow
// merge for nested objects (gender/growth), union-by-key for the array fields.
function mergeInstagramMetrics(list) {
  const out = {};
  for (const m of list) {
    if (!m || typeof m !== 'object') continue;
    for (const [k, v] of Object.entries(m)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v)) {
        const keyField = MERGE_ARRAY_KEYS[k];
        const acc = Array.isArray(out[k]) ? out[k] : [];
        if (keyField) {
          const seen = new Set(acc.map((it) => String(it?.[keyField] ?? '').toLowerCase()));
          for (const it of v) {
            const id = String(it?.[keyField] ?? '').toLowerCase();
            if (!id || !seen.has(id)) { acc.push(it); if (id) seen.add(id); }
          }
        } else {
          acc.push(...v);
        }
        out[k] = acc;
      } else if (typeof v === 'object') {
        out[k] = { ...(out[k] && typeof out[k] === 'object' ? out[k] : {}), ...v };
      } else if (out[k] === undefined || out[k] === null) {
        out[k] = v;
      }
    }
  }
  return out;
}

class OpenAIService {
  /**
   * Analyze Google Sheets columns and suggest mappings to content calendar fields
   * @param {Array} headers - Column headers from the sheet
   * @param {Array} sampleRows - 3-5 sample rows of data
   * @returns {Promise<Object>} - Mapping suggestions { columnIndex: fieldName }
   */
  async analyzeColumnMapping(headers, sampleRows) {
    console.log('🤖 Analyzing columns with AI...', { headers, sampleRows });

    try {
      // Build the prompt
      const prompt = this.buildMappingPrompt(headers, sampleRows);

      // Call AI via the server-side proxy (/api/ai)
      const data = await aiChatCompletion({
        model: 'gpt-4o-mini', // Using mini for cost-effectiveness
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing spreadsheet data and mapping columns to structured fields. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(data.choices[0].message.content);
      
      console.log('✅ AI mapping suggestions:', result);
      return result;

    } catch (error) {
      console.error('❌ Error analyzing columns:', error);
      throw error;
    }
  }

  /**
   * Build the prompt for column mapping analysis
   */
  buildMappingPrompt(headers, sampleRows) {
    const columnsInfo = headers.map((header, index) => {
      const samples = sampleRows.map(row => row[index]).filter(val => val).slice(0, 3);
      return `Column ${index} ("${header}"): ${samples.join(', ')}`;
    }).join('\n');

    return `You are mapping columns from a content calendar spreadsheet (e.g. agency calendars like "The Agency Corp"). Typically ONE ROW = ONE POST. Map each column to the correct content calendar field.

SHEET COLUMNS (header and sample values):
${columnsInfo}

MAP TO THESE FIELDS (one column per field unless multiple image columns):
- postDate: Date to post. CRITICAL. Look for "Date" column with values like 03/01/26, 03/02/26, MM/DD/YY, or "Monday, October 20".
- platform: Where to post. "Platform(s)", "Platform", "Channel". Values: Instagram, Post, Facebook, LinkedIn, etc. ("Post" often means general feed.)
- contentType: Kind of content. "Content Type" column. Values: Image, Story, Video, Reel, Carousel, etc.
- caption: Main post text. "Caption" column with long copy or descriptions.
- notes: Short reference. "Content Topic", "Notes", "Topic", "Address", "Listing Link" (short text).
- imageUrl: Image or cover URL. "Image/Video Cover", "Photo", "Cover", "Thumbnail". May contain full URLs or markdown like ![](url). Google Sheets image URLs (lh7-rt.googleusercontent.com) are valid.
- mediaUrls: Video or content link. "Content Link", "Video Link", "Media" when they point to video or folders.
- assignedTo: Owner. "Assigned To", "Email Confirmation" (if it's a person), etc.
- status: State. "Status", "Email Confirmation" (if values like "Date Confirmed"), etc.
- hashtags: Hashtags.

RULES:
1. "Date" column (with 03/01/26 style) MUST map to postDate.
2. "Image/Video Cover" or "Image" → imageUrl. "Content Link" → mediaUrls or notes (use notes if it's a listing/topic link).
3. "Caption" → caption. "Content Topic" → notes.
4. "Platform(s)" or "Platform" → platform. "Content Type" → contentType.
5. If a column doesn't fit, use "unmapped".

Return a JSON object with this structure:
{
  "mappings": {
    "0": "postDate",
    "1": "platform",
    "2": "contentType"
  },
  "confidence": {
    "0": "high",
    "1": "high",
    "2": "medium"
  },
  "suggestions": {
    "0": "This looks like a date column",
    "1": "Contains social media platform names"
  }
}

Column indices should be strings. Confidence levels: "high", "medium", "low".`;
  }

  /**
   * Enrich sheet rows for content calendar: suggest platform, contentType, hashtags, postDate, caption for empty/missing fields.
   * Processes in chunks to stay within token limits.
   * @param {Array<string>} headers - Column headers
   * @param {Array<Array>} rows - All data rows
   * @param {Object} columnMappings - Map columnIndex (string) -> field name
   * @param {number} maxRowsPerChunk - Max rows per API call (default 25)
   * @returns {Promise<Array<Object>>} - Array of enrichment objects, one per row: { platform?, contentType?, hashtags?, postDate?, caption?, notes? }
   */
  async enrichSheetRowsForCalendar(headers, rows, columnMappings, maxRowsPerChunk = 25) {
    if (!rows || rows.length === 0) return [];

    const fieldToCol = {};
    Object.entries(columnMappings).forEach(([colIndex, field]) => {
      if (field !== 'unmapped') fieldToCol[field] = parseInt(colIndex, 10);
    });

    const enrichments = [];
    for (let start = 0; start < rows.length; start += maxRowsPerChunk) {
      const chunk = rows.slice(start, start + maxRowsPerChunk);
      const chunkEnrichments = await this._enrichChunk(headers, chunk, fieldToCol);
      enrichments.push(...chunkEnrichments);
    }
    return enrichments;
  }

  async _enrichChunk(headers, rows, fieldToCol) {
    const rowSummaries = rows.map((row, i) => {
      const parts = [];
      ['postDate', 'platform', 'contentType', 'caption', 'notes', 'hashtags', 'status', 'assignedTo'].forEach(field => {
        const col = fieldToCol[field];
        if (col !== undefined && row[col]) parts.push(`${field}: ${String(row[col]).slice(0, 80)}`);
      });
      return `Row ${i}: ${parts.join(' | ') || '(empty)'}`;
    });

    const prompt = `You are helping build a content calendar from spreadsheet rows. For each row below, suggest values ONLY for fields that are empty or clearly wrong. Focus on: platform (instagram/facebook/linkedin/tiktok/youtube/twitter), contentType (image/video/reel/story/carousel/text), hashtags (comma-separated, relevant to luxury/social/content), postDate (ISO date or "Monday, Month Day" if inferrable from context). Keep suggestions short and actionable.

ROWS (each line is one row; only non-empty mapped fields are shown):
${rowSummaries.join('\n')}

Return a JSON array with one object per row, in order. Each object may contain any of: platform, contentType, hashtags, postDate, caption, notes. Only include a key if you are suggesting a value for that row. Use null for missing. Example: [{"platform":"instagram","hashtags":"#luxury #realestate"},{}]
Return ONLY the JSON array, no other text.`;

    try {
      const data = await aiChatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You output only valid JSON arrays. No markdown, no explanation.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      });

      let content = data.choices[0].message.content;
      if (typeof content !== 'string') return rows.map(() => ({}));
      content = content.replace(/```\w*\n?/g, '').trim();
      let arr = null;
      try {
        arr = JSON.parse(content);
      } catch {
        const match = content.match(/\[[\s\S]*\]/);
        if (match) arr = JSON.parse(match[0]);
      }
      if (!Array.isArray(arr)) {
        if (arr && typeof arr === 'object' && !Array.isArray(arr)) {
          arr = Object.keys(arr).sort((a, b) => Number(a) - Number(b)).map(k => arr[k]);
        } else {
          return rows.map(() => ({}));
        }
      }
      return arr.slice(0, rows.length).map(obj => (obj && typeof obj === 'object' ? obj : {}));
    } catch (error) {
      console.warn('Enrichment chunk failed:', error);
      return rows.map(() => ({}));
    }
  }

  /**
   * Fallback: Simple keyword-based mapping if AI fails
   */
  fallbackMapping(headers) {
    console.log('🔄 Using fallback keyword matching...');
    
    const mappings = {};
    const confidence = {};
    const suggestions = {};

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      let field = 'unmapped';
      let conf = 'low';
      let suggestion = '';

      // Date matching - expanded to catch more variations
      if (lowerHeader.includes('date') || 
          lowerHeader.includes('when') || 
          lowerHeader.includes('publish') ||
          lowerHeader.includes('schedule') ||
          lowerHeader.includes('post') ||
          lowerHeader.includes('day') ||
          lowerHeader.includes('week') ||
          lowerHeader.includes('month') ||
          lowerHeader.includes('time') ||
          lowerHeader.match(/^\d+\/\d+/) || // Starts with date pattern
          lowerHeader === 'date') {
        field = 'postDate';
        conf = 'high';
        suggestion = 'Matched by keyword: date/schedule/time';
      }
      // Platform matching
      else if (lowerHeader.includes('platform') || lowerHeader.includes('social') || lowerHeader.includes('channel')) {
        field = 'platform';
        conf = 'high';
        suggestion = 'Matched by keyword: platform/social/channel';
      }
      // Content type matching
      else if (lowerHeader.includes('type') || lowerHeader.includes('format') || lowerHeader.includes('content')) {
        field = 'contentType';
        conf = 'medium';
        suggestion = 'Matched by keyword: type/format/content';
      }
      // Caption matching (main post text)
      else if (lowerHeader.includes('caption') || 
               lowerHeader.includes('post text') || 
               lowerHeader.includes('copy') ||
               (lowerHeader.includes('description') && !lowerHeader.includes('topic'))) {
        field = 'caption';
        conf = 'high';
        suggestion = 'Matched by keyword: caption/post text/copy';
      }
      // Notes/Topic matching (shorter reference text)
      else if (lowerHeader.includes('topic') || 
               lowerHeader.includes('subject') ||
               lowerHeader.includes('title') ||
               (lowerHeader.includes('note') && !lowerHeader.includes('caption'))) {
        field = 'notes';
        conf = 'high';
        suggestion = 'Matched by keyword: topic/subject/title/notes';
      }
      // Assigned to matching
      else if (lowerHeader.includes('assign') || lowerHeader.includes('owner') || lowerHeader.includes('who') || lowerHeader.includes('responsible')) {
        field = 'assignedTo';
        conf = 'high';
        suggestion = 'Matched by keyword: assign/owner/who';
      }
      // Status matching
      else if (lowerHeader.includes('status') || lowerHeader.includes('state') || lowerHeader.includes('progress')) {
        field = 'status';
        conf = 'high';
        suggestion = 'Matched by keyword: status/state/progress';
      }
      // Photo/Image matching (prioritize for imageUrl)
      else if (lowerHeader.includes('photo') ||
               lowerHeader.includes('image') ||
               lowerHeader.includes('cover') ||
               lowerHeader.includes('thumbnail') ||
               lowerHeader.includes('picture')) {
        field = 'imageUrl';
        conf = 'high';
        suggestion = 'Matched by keyword: photo/image/cover/thumbnail';
      }
      // Video/Media matching (for mediaUrls)
      else if (lowerHeader.includes('video') || 
               lowerHeader.includes('media') || 
               lowerHeader.includes('url') || 
               lowerHeader.includes('link') ||
               lowerHeader.includes('listing link') ||
               lowerHeader.includes('content link')) {
        field = 'mediaUrls';
        conf = 'high';
        suggestion = 'Matched by keyword: video/media/link';
      }
      // Hashtags matching
      else if (lowerHeader.includes('hashtag') || lowerHeader.includes('tag') || lowerHeader.includes('#')) {
        field = 'hashtags';
        conf = 'high';
        suggestion = 'Matched by keyword: hashtag/tag';
      }

      mappings[index.toString()] = field;
      confidence[index.toString()] = conf;
      if (suggestion) {
        suggestions[index.toString()] = suggestion;
      }
    });

    return { mappings, confidence, suggestions };
  }

  /**
   * Extract Instagram metrics from screenshot images (OpenRouter or OpenAI Vision)
   * Now uses secure Cloud Function with rate limiting to prevent abuse
   * 
   * @param {Array} images - Array of image Files, Blobs, or base64 strings
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Object>} - Extracted metrics
   */
  async extractInstagramMetrics(images, onProgress = null) {
    console.log(`🤖 Extracting Instagram metrics with AI Vision (${images.length} images)...`);

    if (onProgress) onProgress(0, images.length, 'Preparing images...');

    // Downscale each screenshot (long side ≤ 2000px, JPEG) so text stays legible
    // while keeping the uploaded files small.
    const base64Images = await Promise.all(
      images.map(async (img) => {
        const dataUrl = await this.imageToBase64(img);
        return this.downscaleForVision(dataUrl);
      })
    );

    // PREFERRED PATH: upload the screenshots to storage and send the model their
    // URLs instead of inline base64. The /api/ai request body stays a few KB, so
    // it never hits Vercel's ~4.5 MB body cap no matter how many screenshots are
    // added. Images are batched to stay under the provider's per-request image
    // limit (~20 on OpenRouter), the per-batch results are merged, and the temp
    // uploads are deleted afterwards.
    let uploaded = [];
    try {
      if (onProgress) onProgress(0, images.length, 'Uploading images...');
      uploaded = await this.uploadForVision(base64Images);
      const metrics = await this.runVisionBatched(uploaded.map((u) => u.url), onProgress);
      if (onProgress) onProgress(images.length, images.length, 'Complete!');
      console.log(`✅ AI extraction (uploaded URLs):`, Object.keys(metrics).length, 'fields');
      return metrics;
    } catch (err) {
      console.warn('⚠️ URL-based Vision failed, falling back to inline base64:', err?.message || err);
    } finally {
      if (uploaded.length) this.cleanupUploads(uploaded.map((u) => u.path));
    }

    // FALLBACK PATH: inline base64 in a single request (original behaviour). Fine
    // for small batches; a very large batch may exceed the body cap, in which case
    // the caller drops to the Cloud Vision / OCR fallbacks.
    if (onProgress) onProgress(0, images.length, 'Analyzing with AI Vision...');
    const imageContent = base64Images.map((dataUrl) => ({
      type: 'image_url',
      image_url: { url: dataUrl, detail: 'high' },
    }));
    const metrics = await this.callVision(imageContent, images.length);
    if (onProgress) onProgress(images.length, images.length, 'Complete!');
    console.log(`✅ AI extraction (inline base64):`, Object.keys(metrics).length, 'fields');
    return metrics;
  }

  /**
   * Upload downscaled screenshots to storage and return [{ url, path }] so the
   * Vision request can reference them by URL instead of embedding base64.
   */
  async uploadForVision(base64Images) {
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return Promise.all(
      base64Images.map(async (dataUrl, i) => {
        const blob = await (await fetch(dataUrl)).blob();
        const path = `report-extractions/${sessionId}/${i}.jpg`;
        const url = await uploadFileForVision(path, blob);
        return { url, path };
      })
    );
  }

  /** Best-effort deletion of the temp extraction uploads (never throws). */
  cleanupUploads(paths) {
    try { removeFiles(paths); } catch { /* ignore cleanup errors */ }
  }

  /**
   * Run Vision over image URLs, batching so each request stays under the
   * provider's per-request image cap, then merge the per-batch metrics.
   */
  async runVisionBatched(urls, onProgress = null) {
    const batches = chunkArray(urls, MAX_IMAGES_PER_VISION_REQUEST);
    const partials = [];
    for (let b = 0; b < batches.length; b++) {
      if (onProgress) {
        onProgress(b, batches.length, batches.length > 1
          ? `Analyzing batch ${b + 1} of ${batches.length}...`
          : 'Analyzing with AI Vision...');
      }
      const imageContent = batches[b].map((url) => ({
        type: 'image_url',
        image_url: { url, detail: 'high' },
      }));
      partials.push(await this.callVision(imageContent, batches[b].length));
    }
    return partials.length === 1 ? partials[0] : mergeInstagramMetrics(partials);
  }

  /** Single Vision call for a prepared image-content array → parsed metrics. */
  async callVision(imageContent, count) {
    const data = await aiChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: this.buildInstagramSystemPrompt() },
        { role: 'user', content: [
          { type: 'text', text: `Extract all Instagram analytics metrics from these ${count} screenshot(s).` },
          ...imageContent,
        ]},
      ],
      temperature: 0.1,
      max_tokens: 3500,
      response_format: { type: 'json_object' },
    });
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('No response from Vision');
    return JSON.parse(raw);
  }

  /** The Instagram extraction system prompt (shared by every Vision path). */
  buildInstagramSystemPrompt() {

    const systemPrompt = `You are an expert at extracting Instagram analytics metrics from screenshots.
Analyze ALL provided screenshots and extract ONLY the metrics you can visually read from the images.
Screenshots may come from EITHER Instagram's older Insights layout OR the newer "Professional dashboard" / "Insights" layout (with Overview / Content / Audience tabs). Handle BOTH — the field names below are the same regardless of which layout a screenshot uses.

CRITICAL RULES:
- NEVER invent, guess, estimate, or infer any values. If a number is not clearly visible in a screenshot, DO NOT include that field.
- If you cannot read a value with certainty, OMIT the field entirely.
- DO NOT hallucinate follower counts, growth numbers, or change percentages unless they are explicitly shown on screen.
- Numbers should be plain integers (no commas, no strings) unless the field type is string. Expand abbreviated values only when unambiguous (e.g. "6.3K" -> 6300, "18K" -> 18000). If both a rounded value and an exact value are shown for the same metric, use the exact one.
- Prefer EXACT numbers from the Overview / Insights tabs over the ROUNDED summary numbers on the "Professional dashboard" home screen (e.g. use Views "24,807" from Overview, not "24.8K" from the dashboard).
- For percentage changes, keep the sign and % symbol as a string.
- Combine data from multiple screenshots. If the same metric appears in multiple screenshots, use the most detailed / most exact version.
- Return ONLY the JSON object, no markdown, no explanation.

NEWER-LAYOUT LABELS — map these onto the fields below:
- "Net followers" (e.g. "+64") -> followerChange. When the "Net followers" card is selected it also shows "+X follows" and "-Y unfollows" -> growth.follows = X, growth.unfollows = Y, growth.overall = the net number.
- "New followers" on the Professional dashboard home screen is a GROSS count, NOT the net change — do NOT use it as followerChange. Only "Net followers" is the net change.
- "Bio link taps" -> externalLinkTaps (the older layout calls this "External link taps"; same field).
- "Accounts reached" (shown under the "Views by content type" heading) -> accountsReached.
- "Viewers" -> accountsReached. Instagram's NEWEST layout renamed "Impressions" to "Views" and "Accounts reached" to "Viewers" — a "Viewers" count is the unique-accounts number, so map it to accountsReached, and a change % shown with it -> accountsReachedChange. Never create a separate "viewers" field.
- FOLLOWER / NON-FOLLOWER SPLIT: in the newer layout the "X% followers / Y% non-followers" line sits directly under the row of metric cards and describes whichever card is CURRENTLY SELECTED (the card with the dark rounded border). If the selected card is "Views" -> viewsFollowerPercent = X. If the selected card is "Interactions" -> interactionsFollowerPercent = X. Never assign a follower % to a metric whose card is not the selected one in that screenshot.

- IMPORTANT: "likes", "comments", "shares", "saves", "reposts" should ONLY be included if Instagram shows an explicit interaction-type breakdown screen listing those individual counts. If only a total "Interactions" number is shown, do NOT populate these fields — a single total does NOT imply individual breakdowns.
- CONTENT-TYPE BREAKDOWNS: map "Views by content type" -> contentBreakdown, and "Interactions by content type" -> interactionsByContent. For each row, use "count" for a raw number (newer layout, e.g. Posts "18K" -> count 18000, "6.3K" -> 6300) and "percentage" for a percentage split (older layout). NEVER store a count in the "percentage" field. Include a row only if it is shown; keep "Live videos" even when its count is 0.
- For "topCities" and "topCountries": include ALL cities/countries you can read from any screenshot (newer layout: "Top locations" with a Countries / Cities toggle), not just the top one.
- For "ageRanges": include ALL age brackets visible across any screenshot. Instagram typically shows: 13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+. Look carefully for 55-64 — it is often shown in smaller text at the bottom of the age chart and is easy to miss. Do NOT skip it if it appears.
- For "activeTimes": ONLY include this field if an hourly activity bar chart is explicitly visible ("Most active times" in the older layout, or "Follower active times" in the newer one). The newer chart has a day-of-week selector (Su-Sa) above the bars and only shows the selected day. Do NOT guess or invent time activity data. If no such chart appears, omit "activeTimes" entirely.

Use these exact field names (include ONLY fields you can actually see):

{
  "followers": <total follower count, ONLY if explicitly shown>,
  "followerChange": <net change number ("Net followers"), ONLY if explicitly shown>,
  "accountsReached": <number, from "Accounts reached" or the newer "Viewers" label>,
  "accountsReachedChange": "<string, e.g. '+12.4%', ONLY if shown>",
  "views": <number>,
  "viewsFollowerPercent": <number, the "% followers" shown while the Views card/section is selected>,
  "interactions": <number>,
  "interactionsFollowerPercent": <number, the "% followers" shown while the Interactions card/section is selected>,
  "profileVisits": <number>,
  "profileVisitsChange": "<string, ONLY if shown>",
  "externalLinkTaps": <number, from "External link taps" or "Bio link taps", ONLY if explicitly shown>,
  "likes": <number, ONLY if an explicit interaction breakdown screen shows this count>,
  "comments": <number, ONLY if an explicit interaction breakdown screen shows this count>,
  "shares": <number, ONLY if an explicit interaction breakdown screen shows this count>,
  "saves": <number, ONLY if an explicit interaction breakdown screen shows this count>,
  "reposts": <number, ONLY if an explicit interaction breakdown screen shows this count>,
  "follows": <number under "Follows" in profile activity, ONLY if shown>,
  "growth": { "follows": <number>, "unfollows": <number>, "overall": <number> },
  "topCities": [ { "name": "<string>", "percentage": <number> }, ... ],
  "topCountries": [ { "name": "<string>", "percentage": <number> }, ... ],
  "ageRanges": [ { "range": "<string, e.g. '18-24'>", "percentage": <number> }, ... ],
  "gender": { "men": <number, percentage>, "women": <number, percentage> },
  "contentShared": <number, "Content you shared" count from the Professional dashboard, ONLY if shown>,
  "topSourcesOfViews": [ { "source": "<string, e.g. 'Profile'>", "percentage": <number> }, ... ],
  "contentBreakdown": [ { "type": "<e.g. 'Posts'>", "count": <number, newer "Views by content type" count e.g. 18000>, "percentage": <number, older % split> }, ... ],
  "interactionsByContent": [ { "type": "<e.g. 'Posts'>", "count": <number, newer "Interactions by content type" count e.g. 928>, "percentage": <number, older % split> }, ... ],
  "activeTimes": [ { "hour": "<string, e.g. '9a'>", "activity": <number, 0-100 relative bar height> }, ... ]
}`;

    return systemPrompt;
  }

  /**
   * Get current rate limit status for the authenticated user
   * @returns {Promise<Object>} - Rate limit status
   */
  async getRateLimitStatus() {
    // Rate limits are now handled per-function inside each Edge Function.
    // This method is kept for backward compatibility but returns a stub.
    return { remaining: 50, maxPerHour: 50, maxPerDay: 200 };
  }

  /**
   * Convert image File/Blob to base64 data URL
   */
  async imageToBase64(image) {
    // Already a data URL
    if (typeof image === 'string' && image.startsWith('data:')) {
      return image;
    }
    
    // URL - fetch and convert
    if (typeof image === 'string') {
      const response = await fetch(image);
      const blob = await response.blob();
      return this.blobToBase64(blob);
    }
    
    // Handle { localFile } wrapper
    if (image.localFile) {
      return this.blobToBase64(image.localFile);
    }
    
    // File or Blob
    return this.blobToBase64(image);
  }

  /**
   * Convert Blob to base64 data URL
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Downscale a base64 image data URL so the AI request stays under the
   * serverless proxy's ~4.5 MB body limit. Scales the longest side down to
   * `maxLongSide` (default 2000px — at/above what GPT-4o consumes at high
   * detail, so text stays legible) and re-encodes as JPEG. Any failure falls
   * back to the original data URL so extraction never breaks.
   */
  downscaleForVision(dataUrl, maxLongSide = 2000, quality = 0.92) {
    return new Promise((resolve) => {
      try {
        if (typeof document === 'undefined' || typeof Image === 'undefined') {
          resolve(dataUrl);
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const longSide = Math.max(img.width, img.height);
            const scale = longSide > maxLongSide ? maxLongSide / longSide : 1;
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff'; // flatten any alpha (screenshots have none)
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });
  }

  // ─── Helper: AI call via the server-side proxy (/api/ai) ───
  async _callAI(messages, { model = null, temperature = 0.7, maxTokens = 1000, json = false } = {}) {
    const body = { model: model || 'gpt-4o-mini', messages, temperature, max_tokens: maxTokens };
    if (json) body.response_format = { type: 'json_object' };
    return aiChatContent(body);
  }

  /**
   * Generate a short client-facing analytics summary from extracted Instagram metrics.
   */
  async generateReportSummary(metrics, { dateRange = '', clientName = '' } = {}) {
    const prompt = `Here are the Instagram analytics for ${clientName || 'this account'} covering ${dateRange || 'the recent period'}:
${JSON.stringify(metrics, null, 2)}

Note on terminology: the "accountsReached" field is what Instagram now labels "Viewers" — call it "viewers" (never "impressions" or "accounts reached") so the summary matches what the client sees in their Instagram app.

Write a 3–5 sentence summary in the first-person voice of their dedicated social media manager delivering a client check-in. Speak directly to the client — conversational, confident, and positive but candid. Lead with the most meaningful wins or trends, reference specific numbers, and flag any metrics worth watching without being alarming. Sound like a knowledgeable strategist who has their back, not a report generator. Keep the total response under 500 characters.`;
    return this._callAI([
      { role: 'system', content: 'You are a sharp, client-facing social media strategist at a luxury real estate marketing agency. You write concise, insightful performance summaries that feel personal and informed — like a trusted advisor giving a quick debrief, not a data dump.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.65, maxTokens: 500 });
  }

  /**
   * Generate a social media caption with hashtags for luxury real estate content.
   * Pass a format template via options ({ formatExample, formatNotes, formatName })
   * to make the AI mirror a client's established caption style. The model is told
   * to use ONLY the facts in `description` — never to invent features (no phantom
   * pools, views, or room counts).
   */
  async generateCaption(description, platform = 'instagram', tone = 'luxury', options = {}) {
    if (!description || description.trim().length < 3) {
      throw new Error('Please provide a description of the content (at least 3 characters)');
    }
    const { formatExample = '', formatNotes = '', formatName = '' } = options || {};
    console.log(`✍️ Generating ${platform} caption${formatName ? ` using format "${formatName}"` : ''}...`);

    let system = `You generate ${tone} social media captions for luxury real estate content on ${platform}.

STRICT FACTUAL RULE — this overrides every other instruction: use ONLY the details explicitly present in the user's description. Never invent, infer, embellish, or add any feature, amenity, room/bathroom count, square footage, price, location, view, or selling point that is not explicitly stated. For example, do NOT mention a pool, ocean view, or number of bedrooms unless the description says so. If a detail isn't provided, leave it out rather than guessing.`;

    if (formatExample.trim() || formatNotes.trim()) {
      system += `\n\nFORMAT TO FOLLOW — match the structure, length, line breaks, emoji usage, punctuation, hashtag placement, and overall voice of the example below. Reproduce the FORMAT and STYLE only; never reuse the example's specific facts (its addresses, prices, or features). Every fact in your caption must come from the user's description, not the example.`;
      if (formatNotes.trim()) system += `\nAdditional format notes: ${formatNotes.trim()}`;
      if (formatExample.trim()) system += `\n\nExample caption to mirror:\n"""\n${formatExample.trim()}\n"""`;
    }

    system += `\n\nReturn JSON: { "caption": "...", "hashtags": ["...", ...] }`;

    const raw = await this._callAI([
      { role: 'system', content: system },
      { role: 'user', content: `Write a ${tone} ${platform} caption for: ${description}` },
    ], { temperature: 0.7, maxTokens: 500, json: true });
    try {
      const parsed = JSON.parse(raw);
      console.log('✅ Caption generated');
      return { caption: parsed.caption || raw, hashtags: parsed.hashtags || [] };
    } catch {
      return { caption: raw, hashtags: [] };
    }
  }

  /**
   * Predict client health/churn risk based on multiple factors.
   */
  async predictClientHealth(clientData, reportHistory = null) {
    if (!clientData || typeof clientData !== 'object') throw new Error('Client data is required');
    const clientName = clientData.clientName || 'Unknown';
    console.log(`🔍 Predicting health for client: ${clientName}`);
    const raw = await this._callAI([
      { role: 'system', content: 'You are a client-health analyst for a social media marketing agency. Analyze the data and return JSON: { "status": "Healthy|At Risk|Critical", "churnRisk": <0-100>, "reason": "...", "action": "..." }' },
      { role: 'user', content: `Analyze churn risk for ${clientName}:\n${JSON.stringify(clientData, null, 2)}\n\nInstagram report history (${reportHistory?.length || 0} reports):\n${reportHistory ? JSON.stringify(reportHistory.slice(0, 6).map(r => ({ dateRange: r.dateRange, metrics: r.metrics })), null, 2) : 'None'}` },
    ], { temperature: 0.3, maxTokens: 500, json: true });
    try {
      const result = JSON.parse(raw);
      console.log(`✅ Health predicted: ${result.status} (${result.churnRisk}% risk)`);
      return { status: result.status, churnRisk: result.churnRisk, reason: result.reason, action: result.action };
    } catch {
      throw new Error('Health prediction returned invalid response');
    }
  }

  /**
   * AI assist for workspace blocks: summarize, expand, or change tone.
   */
  async canvasAssist(action, blockText) {
    const instructions = {
      summarize: 'Summarize the following text concisely while keeping key points.',
      expand: 'Expand the following text with more detail and supporting points.',
      professional: 'Rewrite the following text in a professional, polished tone.',
      casual: 'Rewrite the following text in a friendly, conversational tone.',
    };
    return this._callAI([
      { role: 'system', content: instructions[action] || 'Rewrite the following text.' },
      { role: 'user', content: blockText || '' },
    ], { temperature: 0.6, maxTokens: 1000 });
  }
}

export const openaiService = new OpenAIService();

