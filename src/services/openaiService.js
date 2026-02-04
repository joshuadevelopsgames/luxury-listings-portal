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

    return `Analyze these Google Sheets columns and map them to content calendar fields.

SHEET COLUMNS:
${columnsInfo}

AVAILABLE FIELDS TO MAP TO:
- postDate: The date/time to post (CRITICAL - look for dates in ANY format, including "Monday, October 20")
- platform: Social media platform (Instagram, TikTok, Facebook, LinkedIn, etc.)
- contentType: Type of content (Reel, Story, Carousel, Post, Video, Image, etc.) - Look for "Content Type" columns
- caption: The MAIN post text/caption - Look for "Caption", "Post Text", "Description" columns with long text
- assignedTo: Person responsible (name or email)
- status: Current status (Planned, Draft, In Progress, Ready, Published, Posted, etc.)
- imageUrl: URLs to IMAGES/PHOTOS ONLY - Prioritize "Photo Link", "Image", "Cover", "Thumbnail" columns
- mediaUrls: URLs to VIDEOS or general media - Look for "Video Link", "Media", "Link" columns (but NOT if they're specifically photo/image columns)
- notes: Additional notes, topics, property addresses, or short reference text - Look for "Content Topic", "Notes", "Topic", "Address"
- hashtags: Hashtags for the post

IMPORTANT: If there are separate "Photo" and "Video" columns:
- Map photo/image columns to "imageUrl"
- Map video columns to "mediaUrls"
- Do NOT map both to the same field

INSTRUCTIONS:
1. Analyze each column header and sample data
2. Determine the best field match for each column
3. If a column doesn't match any field, map it to "unmapped"
4. Use context clues from both header names and data patterns
5. **CRITICAL**: postDate is the MOST IMPORTANT field - look for ANY column with dates:
   - Headers like: "Date", "Post Date", "Publish Date", "Schedule", "When", "Day", "Week", "Time"
   - Data patterns like: "11/15/2024", "2024-11-15", "Nov 15", "15-Nov-24", timestamps, etc.
   - Even if the header doesn't say "date", if the data looks like dates, map it to postDate

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
}

export const openaiService = new OpenAIService();

