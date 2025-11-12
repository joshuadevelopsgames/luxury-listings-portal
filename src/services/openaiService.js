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
- postDate: The date/time to post (CRITICAL - look for dates in ANY format)
- platform: Social media platform (Instagram, TikTok, Facebook, LinkedIn, etc.)
- contentType: Type of content (Reel, Story, Carousel, Post, Video, etc.)
- caption: The post caption or description
- assignedTo: Person responsible (name or email)
- status: Current status (Planned, Draft, In Progress, Ready, Published, etc.)
- mediaUrls: URLs to images/videos (comma-separated)
- notes: Additional notes or comments
- hashtags: Hashtags for the post

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
      // Caption matching
      else if (lowerHeader.includes('caption') || lowerHeader.includes('description') || lowerHeader.includes('text') || lowerHeader.includes('post')) {
        field = 'caption';
        conf = 'high';
        suggestion = 'Matched by keyword: caption/description/text';
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
      // Media matching
      else if (lowerHeader.includes('media') || lowerHeader.includes('image') || lowerHeader.includes('video') || lowerHeader.includes('url') || lowerHeader.includes('link')) {
        field = 'mediaUrls';
        conf = 'medium';
        suggestion = 'Matched by keyword: media/image/video/url';
      }
      // Notes matching
      else if (lowerHeader.includes('note') || lowerHeader.includes('comment') || lowerHeader.includes('remark')) {
        field = 'notes';
        conf = 'medium';
        suggestion = 'Matched by keyword: note/comment';
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
}

export const openaiService = new OpenAIService();

