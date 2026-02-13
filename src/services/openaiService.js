/**
 * OpenAI Service for AI-powered features
 * Used for smart column mapping in Google Sheets imports
 * 
 * SECURITY: Instagram metrics extraction now uses secure Cloud Functions
 * to prevent API key exposure and add rate limiting.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Initialize Firebase Functions for secure API calls
let functions = null;
try {
  functions = getFunctions();
} catch (e) {
  console.warn('Firebase Functions not initialized, will fall back to direct API calls');
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

    if (!OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found');
      throw new Error('OpenAI API key is not configured. Please add REACT_APP_OPENAI_API_KEY to your environment variables.');
    }

    try {
      // Build the prompt
      const prompt = this.buildMappingPrompt(headers, sampleRows);

      // Call OpenAI API
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
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
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Add REACT_APP_OPENAI_API_KEY to use enrichment.');
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
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
    console.log(`🤖 Extracting Instagram metrics with AI (OpenRouter/OpenAI) (${images.length} images)...`);

    if (onProgress) onProgress(0, images.length, 'Preparing images...');

    // Convert images to base64 for Cloud Function
    const imageData = await Promise.all(
      images.map(async (img) => {
        const base64 = await this.imageToBase64(img);
        // Extract just the base64 part (remove data:image/...;base64, prefix)
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        return { base64: base64Data };
      })
    );

    if (onProgress) onProgress(0, images.length, 'Analyzing with AI (secure)...');

    // Try to use secure Cloud Function first
    if (functions) {
      try {
        const extractMetrics = httpsCallable(functions, 'extractInstagramMetricsAI');
        const result = await extractMetrics({ images: imageData });
        
        if (result.data.success) {
          if (onProgress) onProgress(images.length, images.length, 'Complete!');
          const provider = result.data.provider || 'openrouter';
          console.log(`✅ AI extraction (${provider}):`, Object.keys(result.data.metrics).length, 'fields');
          console.log(`📊 Rate limit remaining: ${result.data.rateLimitRemaining}`);
          return result.data.metrics;
        }
      } catch (error) {
        // Check if it's a rate limit error
        if (error.code === 'functions/resource-exhausted') {
          console.warn('⚠️ Rate limit exceeded:', error.message);
          throw new Error(`Rate limit exceeded: ${error.message}`);
        }
        
        // In production, never fall back to direct API (key would be exposed, CORS blocks anyway)
        const isProduction = typeof window !== 'undefined' &&
          /smmluxurylistings\.info$/i.test(window.location?.hostname || '');
        if (isProduction) {
          console.warn('⚠️ Cloud Function failed (production):', error.message);
          throw error;
        }
        // Development only: fall back to direct API if configured
        console.warn('⚠️ Cloud Function failed, checking for fallback:', error.message);
        if (!OPENAI_API_KEY) {
          throw error;
        }
        console.log('🔄 Falling back to direct API call (development mode)');
      }
    }

    // Fallback to direct API call (development only; never in production)
    const isProduction = typeof window !== 'undefined' &&
      /smmluxurylistings\.info$/i.test(window.location?.hostname || '');
    if (isProduction || !OPENAI_API_KEY) {
      throw new Error('AI extraction is not available right now. Please try again or enter metrics manually. If this persists, contact support.');
    }

    console.warn('⚠️ Using direct OpenAI API call - this should only happen in development');

    // Convert images to base64 data URLs for direct API
    const imageContents = await Promise.all(
      images.map(async (img) => {
        const base64 = await this.imageToBase64(img);
        return {
          type: 'image_url',
          image_url: { url: base64, detail: 'high' }
        };
      })
    );

    const prompt = `Extract ALL metrics from these Instagram Insights screenshots. Return ONLY valid JSON.

IMPORTANT: Look carefully at the visual layout. Numbers belong to the label they're visually associated with (inside donut charts, next to labels, etc.).

Extract these fields (use null if not visible):
{
  "dateRange": "Jan 1 - Jan 31" or similar,
  
  // VIEWS
  "views": number (the big number in/near "Views" donut),
  "viewsFromAdsPercent": number (e.g. "72.2% from ads"),
  "viewsFollowerPercent": number,
  "viewsNonFollowerPercent": number,
  "viewsContentBreakdown": [{"type": "Posts/Reels/Stories", "percentage": number}],
  
  // INTERACTIONS
  "interactions": number (the big number in/near "Interactions" donut),
  "interactionsFromAdsPercent": number (e.g. "22.8% from ads"),
  "interactionsFollowerPercent": number,
  "interactionsNonFollowerPercent": number,
  "interactionsContentBreakdown": [{"type": "Reels/Posts/Stories", "percentage": number}],
  "likes": number,
  "comments": number,
  "shares": number,
  "saves": number,
  "reposts": number,
  
  // REACH & PROFILE
  "accountsReached": number,
  "accountsReachedChange": "+X%" or "-X%",
  "profileActivity": number (total profile activity),
  "profileActivityChange": "+X%" or "-X%",
  "profileVisits": number,
  "profileVisitsChange": "+X%" or "-X%",
  "externalLinkTaps": number,
  "externalLinkTapsChange": "+X%" or "-X%",
  
  // FOLLOWERS
  "followers": number (total follower count),
  "followerChange": "+X%" or "-X%" (vs previous period),
  "growth": {"overall": number, "follows": number, "unfollows": number},
  
  // DEMOGRAPHICS (if visible)
  "topCities": [{"name": "City", "percentage": number}],
  "ageRanges": [{"range": "25-34", "percentage": number}],
  "gender": {"men": number, "women": number},
  
  // TOP CONTENT (if visible)
  "topContent": [{"views": "83K", "date": "Jan 5"}],
  "topReels": [{"likes": 271, "date": "Jan 9"}]
}

Return ONLY the JSON object, no markdown or explanation.`;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using mini for cost-effectiveness (~10x cheaper than gpt-4o)
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                ...imageContents
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Strip markdown code fences if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const metrics = JSON.parse(content);
      
      // Clean up null values
      const cleaned = {};
      for (const [key, value] of Object.entries(metrics)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = value;
        }
      }

      if (onProgress) onProgress(images.length, images.length, 'Complete!');
      
      console.log('✅ Direct OpenAI extraction:', Object.keys(cleaned).length, 'fields');
      return cleaned;

    } catch (error) {
      console.error('❌ Direct OpenAI extraction failed:', error);
      throw error;
    }
  }

  /**
   * Get current rate limit status for the authenticated user
   * @returns {Promise<Object>} - Rate limit status
   */
  async getRateLimitStatus() {
    if (!functions) {
      return { error: 'Functions not initialized' };
    }
    
    try {
      const getRateLimit = httpsCallable(functions, 'getRateLimitStatus');
      const result = await getRateLimit();
      return result.data;
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return { error: error.message };
    }
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
   * Generate a short client-facing analytics summary from extracted Instagram metrics.
   * Uses Cloud Function (OpenRouter/OpenAI). Returns summary text for report notes.
   */
  async generateReportSummary(metrics, { dateRange = '', clientName = '' } = {}) {
    if (!functions) {
      throw new Error('Firebase Functions not initialized');
    }
    const generateSummary = httpsCallable(functions, 'generateReportSummary');
    const result = await generateSummary({ metrics, dateRange, clientName });
    if (result.data?.success && result.data?.summary) {
      return result.data.summary;
    }
    throw new Error(result.data?.error || 'Summary generation failed');
  }

  /**
   * Generate a social media caption with hashtags for luxury real estate content.
   * Uses Cloud Function (OpenRouter/OpenAI).
   *
   * @param {string} description - Description of the content to post about
   * @param {string} platform - Target platform: 'instagram', 'facebook', 'linkedin', 'twitter', 'youtube'
   * @param {string} tone - Tone of the caption: 'luxury' (default), 'casual', 'professional'
   * @returns {Promise<{caption: string, hashtags: string[]}>}
   */
  async generateCaption(description, platform = 'instagram', tone = 'luxury') {
    if (!functions) {
      throw new Error('Firebase Functions not initialized');
    }

    if (!description || description.trim().length < 3) {
      throw new Error('Please provide a description of the content (at least 3 characters)');
    }

    console.log(`✍️ Generating ${platform} caption...`);

    const generateCaptionFn = httpsCallable(functions, 'generateCaption');
    const result = await generateCaptionFn({ description, platform, tone });

    if (result.data?.success) {
      console.log(`✅ Caption generated (${result.data.rateLimitRemaining} requests remaining)`);
      return {
        caption: result.data.caption,
        hashtags: result.data.hashtags || []
      };
    }

    throw new Error(result.data?.error || 'Caption generation failed');
  }

  /**
   * Predict client health/churn risk based on multiple factors.
   * Uses Cloud Function (OpenRouter/OpenAI).
   *
   * Enhanced to analyze Instagram report trends for better churn prediction:
   * - Follower growth/loss
   * - Engagement trends (views, interactions)
   * - Deliverable completion rates
   *
   * @param {Object} clientData - Client data object with health indicators
   * @param {string} clientData.clientName - Client name
   * @param {number} clientData.postsRemaining - Posts remaining in package
   * @param {number} clientData.packageSize - Total package size
   * @param {number} clientData.postsUsed - Posts used so far
   * @param {string} clientData.paymentStatus - 'Paid', 'Pending', 'Overdue'
   * @param {string} clientData.packageType - Type of package
   * @param {number} clientData.daysSinceContact - Days since last contact
   * @param {number} clientData.daysUntilRenewal - Days until contract renewal
   * @param {string} clientData.lastPostDate - Date of last post
   * @param {string} clientData.notes - Any notes about the client
   * @param {Array} reportHistory - Optional array of Instagram reports for trend analysis
   * @returns {Promise<{status: string, churnRisk: number, reason: string, action: string}>}
   */
  async predictClientHealth(clientData, reportHistory = null) {
    if (!functions) {
      throw new Error('Firebase Functions not initialized');
    }

    if (!clientData || typeof clientData !== 'object') {
      throw new Error('Client data is required');
    }

    const clientName = clientData.clientName || 'Unknown';
    const reportCount = reportHistory?.length || 0;
    console.log(`🔍 Predicting health for client: ${clientName} (${reportCount} reports for trend analysis)`);

    const predictHealthFn = httpsCallable(functions, 'predictClientHealth');
    const result = await predictHealthFn({ clientData, reportHistory });

    if (result.data?.success) {
      console.log(`✅ Health predicted: ${result.data.status} (${result.data.churnRisk}% risk)`);
      return {
        status: result.data.status,
        churnRisk: result.data.churnRisk,
        reason: result.data.reason,
        action: result.data.action
      };
    }

    throw new Error(result.data?.error || 'Health prediction failed');
  }

  /**
   * AI assist for workspace blocks: summarize, expand, or change tone
   * @param {string} action - 'summarize' | 'expand' | 'professional' | 'casual'
   * @param {string} blockText - Plain text content (strip HTML before calling)
   * @returns {Promise<string>} - Revised text
   */
  async canvasAssist(action, blockText) {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Add REACT_APP_OPENAI_API_KEY to your environment.');
    }
    const prompts = {
      summarize: 'Summarize the following text concisely in 1-3 sentences. Preserve key points only. Return only the summary, no preamble.',
      expand: 'Expand the following text into a longer, more detailed version. Keep the same tone and add relevant detail. Return only the expanded text.',
      professional: 'Rewrite the following text in a formal, professional tone. Keep the same meaning and length roughly. Return only the rewritten text.',
      casual: 'Rewrite the following text in a friendly, casual tone. Keep the same meaning. Return only the rewritten text.',
    };
    const systemPrompt = prompts[action] || prompts.summarize;
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: blockText || '(no content)' },
        ],
        temperature: 0.5,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error: ${response.status}`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    return text;
  }
}

export const openaiService = new OpenAIService();

