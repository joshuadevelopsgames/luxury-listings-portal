/**
 * OpenAI Service for AI-powered features
 * Used for smart column mapping in Google Sheets imports
 *
 * SECURITY: AI extraction, caption generation, health prediction, and
 * canvas assist all run via Supabase Edge Functions to keep API keys
 * server-side and enforce rate limits.
 */


// Use OpenRouter (CORS-friendly) with fallback to OpenAI direct
const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const API_KEY = OPENROUTER_API_KEY || OPENAI_API_KEY;
const API_URL = OPENROUTER_API_KEY
  ? 'https://openrouter.ai/api/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';

class OpenAIService {
  /**
   * Analyze Google Sheets columns and suggest mappings to content calendar fields
   * @param {Array} headers - Column headers from the sheet
   * @param {Array} sampleRows - 3-5 sample rows of data
   * @returns {Promise<Object>} - Mapping suggestions { columnIndex: fieldName }
   */
  async analyzeColumnMapping(headers, sampleRows) {
    console.log('🤖 Analyzing columns with AI...', { headers, sampleRows });

    if (!API_KEY) {
      console.error('❌ OpenAI API key not found');
      throw new Error('API key is not configured. Please add REACT_APP_OPENROUTER_API_KEY to your environment variables.');
    }

    try {
      // Build the prompt
      const prompt = this.buildMappingPrompt(headers, sampleRows);

      // Call OpenAI API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          ...(OPENROUTER_API_KEY ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'Luxury Listings Portal' } : {})
        },
        body: JSON.stringify({
          model: OPENROUTER_API_KEY ? 'openai/gpt-4o-mini' : 'gpt-4o-mini', // Using mini for cost-effectiveness
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
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
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
    if (!API_KEY) {
      throw new Error('API key is not configured. Add REACT_APP_OPENROUTER_API_KEY to use enrichment.');
    }
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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          ...(OPENROUTER_API_KEY ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'Luxury Listings Portal' } : {})
        },
        body: JSON.stringify({
          model: OPENROUTER_API_KEY ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You output only valid JSON arrays. No markdown, no explanation.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
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
    console.log(`🤖 Extracting Instagram metrics with AI (direct OpenAI Vision) (${images.length} images)...`);

    if (!API_KEY) {
      throw new Error('API key is not configured. Please add REACT_APP_OPENROUTER_API_KEY to your environment variables.');
    }

    if (onProgress) onProgress(0, images.length, 'Preparing images...');

    // Convert images to base64 data URLs for OpenAI Vision
    const base64Images = await Promise.all(
      images.map(async (img) => {
        const dataUrl = await this.imageToBase64(img);
        return dataUrl;
      })
    );

    if (onProgress) onProgress(0, images.length, 'Analyzing with AI Vision...');

    // Build content array with all images for GPT-4o Vision
    const imageContent = base64Images.map((dataUrl) => ({
      type: 'image_url',
      image_url: { url: dataUrl, detail: 'high' },
    }));

    const systemPrompt = `You are an expert at extracting Instagram analytics metrics from screenshots.
Analyze ALL provided screenshots and extract every metric you can find.
Return a single JSON object combining data from all images. Use these exact field names:

{
  "followers": <number>,
  "followerChange": <number, positive or negative>,
  "accountsReached": <number>,
  "accountsReachedChange": "<string, e.g. '+12.4%'>",
  "views": <number>,
  "viewsFollowerPercent": <number, 0-100>,
  "nonFollowerPercent": <number, 0-100>,
  "interactions": <number>,
  "interactionsFollowerPercent": <number, 0-100>,
  "profileVisits": <number>,
  "profileVisitsChange": "<string, e.g. '+8.2%'>",
  "likes": <number>,
  "comments": <number>,
  "shares": <number>,
  "saves": <number>,
  "reposts": <number>,
  "growth": { "follows": <number>, "unfollows": <number>, "overall": <number> },
  "topCities": [ { "name": "<string>", "percentage": <number> }, ... ],
  "ageRanges": [ { "range": "<string, e.g. '18-24'>", "percentage": <number> }, ... ],
  "gender": { "men": <number, percentage>, "women": <number, percentage> },
  "contentBreakdown": [ { "type": "<string, e.g. 'Reels'>", "percentage": <number> }, ... ],
  "activeTimes": [ { "hour": "<string>", "activity": <number, 0-100> }, ... ]
}

Rules:
- Only include fields you can actually find in the screenshots. Omit fields with no data.
- Numbers should be plain integers (no commas, no strings) unless the field type is string.
- For percentage changes, keep the sign and % symbol as a string.
- Combine data from multiple screenshots into one object. If the same field appears in multiple screenshots, prefer the most detailed or complete version.
- Return ONLY the JSON object, no markdown, no explanation.`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          ...(OPENROUTER_API_KEY ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'Luxury Listings Portal' } : {}),
        },
        body: JSON.stringify({
          model: OPENROUTER_API_KEY ? 'openai/gpt-4o' : 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: [
              { type: 'text', text: `Extract all Instagram analytics metrics from these ${images.length} screenshot(s).` },
              ...imageContent,
            ]},
          ],
          temperature: 0.1,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `OpenAI API error (${response.status})`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error('No response from OpenAI Vision');

      const metrics = JSON.parse(raw);

      if (onProgress) onProgress(images.length, images.length, 'Complete!');
      console.log(`✅ AI extraction (direct OpenAI Vision):`, Object.keys(metrics).length, 'fields');
      return metrics;
    } catch (error) {
      console.error('❌ AI extraction failed:', error);
      throw error;
    }
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

  // ─── Helper: direct OpenRouter/OpenAI call (bypasses edge functions for reliability) ───
  async _callAI(messages, { model = null, temperature = 0.7, maxTokens = 1000, json = false } = {}) {
    if (!API_KEY) throw new Error('API key is not configured.');
    const chosenModel = model || (OPENROUTER_API_KEY ? 'openai/gpt-4o-mini' : 'gpt-4o-mini');
    const body = { model: chosenModel, messages, temperature, max_tokens: maxTokens };
    if (json) body.response_format = { type: 'json_object' };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        ...(OPENROUTER_API_KEY ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'Luxury Listings Portal' } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Generate a short client-facing analytics summary from extracted Instagram metrics.
   */
  async generateReportSummary(metrics, { dateRange = '', clientName = '' } = {}) {
    const prompt = `You are a social-media analytics expert writing for a luxury real estate marketing agency.
Given these Instagram metrics for ${clientName || 'the client'} (${dateRange || 'recent period'}):
${JSON.stringify(metrics, null, 2)}

Write a concise 3-5 sentence professional summary highlighting key performance, notable growth areas, and any areas needing attention. Use specific numbers. Keep it client-friendly and positive but honest.`;
    return this._callAI([
      { role: 'system', content: 'You write concise, data-driven Instagram analytics summaries for luxury real estate clients.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.5, maxTokens: 500 });
  }

  /**
   * Generate a social media caption with hashtags for luxury real estate content.
   */
  async generateCaption(description, platform = 'instagram', tone = 'luxury') {
    if (!description || description.trim().length < 3) {
      throw new Error('Please provide a description of the content (at least 3 characters)');
    }
    console.log(`✍️ Generating ${platform} caption...`);
    const raw = await this._callAI([
      { role: 'system', content: `You generate ${tone} social media captions for luxury real estate content on ${platform}. Return JSON: { "caption": "...", "hashtags": ["...", ...] }` },
      { role: 'user', content: `Write a ${tone} ${platform} caption for: ${description}` },
    ], { temperature: 0.8, maxTokens: 500, json: true });
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

