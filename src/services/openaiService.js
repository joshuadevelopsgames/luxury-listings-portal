/**
 * OpenAI Service for AI-powered features
 * Used for smart column mapping in Google Sheets imports
 */

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
   * Extract Instagram metrics from screenshot images using GPT-4o Vision
   * @param {Array} images - Array of image Files, Blobs, or base64 strings
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Object>} - Extracted metrics
   */
  async extractInstagramMetrics(images, onProgress = null) {
    console.log(`🤖 Extracting Instagram metrics with GPT-4o Vision (${images.length} images)...`);

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Add REACT_APP_OPENAI_API_KEY to .env.local');
    }

    if (onProgress) onProgress(0, images.length, 'Preparing images...');

    // Convert images to base64 data URLs
    const imageContents = await Promise.all(
      images.map(async (img) => {
        const base64 = await this.imageToBase64(img);
        return {
          type: 'image_url',
          image_url: { url: base64, detail: 'high' }
        };
      })
    );

    if (onProgress) onProgress(0, images.length, 'Analyzing with GPT-4o Vision...');

    const prompt = `Extract ALL metrics from these Instagram Insights screenshots. Return ONLY valid JSON.

IMPORTANT: Look carefully at the visual layout. Numbers belong to the label they're visually associated with (inside donut charts, next to labels, etc.).

Extract these fields (use null if not visible):
{
  "dateRange": "Jan 1 - Jan 31" or similar,
  "views": number (the big number in/near "Views" donut),
  "viewsFromAdsPercent": number,
  "viewsFollowerPercent": number,
  "viewsNonFollowerPercent": number,
  "interactions": number (the big number in/near "Interactions" donut),
  "interactionsFollowerPercent": number,
  "interactionsNonFollowerPercent": number,
  "accountsReached": number,
  "accountsReachedChange": "+X%" or "-X%",
  "profileVisits": number,
  "profileVisitsChange": "+X%" or "-X%",
  "externalLinkTaps": number,
  "followers": number (total follower count),
  "topCities": [{"name": "City", "percentage": number}],
  "ageRanges": [{"range": "25-34", "percentage": number}],
  "gender": {"men": number, "women": number},
  "contentBreakdown": [{"type": "Posts/Reels/Stories", "percentage": number}],
  "growth": {"overall": number, "follows": number, "unfollows": number},
  "likes": number,
  "comments": number,
  "shares": number,
  "saves": number,
  "reposts": number
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
          model: 'gpt-4o',
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
        console.error('❌ GPT-4o Vision error:', errorData);
        throw new Error(`GPT-4o Vision error: ${errorData.error?.message || 'Unknown error'}`);
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
      
      console.log('✅ GPT-4o Vision extracted metrics:', Object.keys(cleaned).length, 'fields');
      return cleaned;

    } catch (error) {
      console.error('❌ GPT-4o Vision extraction failed:', error);
      throw error;
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

