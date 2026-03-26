/**
 * Cloud Vision OCR Service
 * Calls OpenAI GPT-4o Vision directly from the client for fast OCR.
 * Previously used Supabase Edge Functions but 401 auth issues made that
 * unreliable — this approach uses the client-side REACT_APP_OPENAI_API_KEY.
 */

// Use OpenRouter (CORS-friendly) with fallback to OpenAI direct
const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const API_KEY = OPENROUTER_API_KEY || OPENAI_API_KEY;
const API_URL = OPENROUTER_API_KEY
  ? 'https://openrouter.ai/api/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';

class CloudVisionOCRService {
  /**
   * Resize image to max dimension for faster upload (smaller = faster)
   */
  async compressForUpload(file, maxWidth = 1024) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : resolve(file)),
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => {
        if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        resolve(file);
      };
      if (file instanceof File || file instanceof Blob) {
        img.src = URL.createObjectURL(file);
      } else {
        resolve(file);
      }
    });
  }

  /**
   * Convert a File/Blob to base64 string (optionally compress first for speed)
   */
  async fileToBase64(file, compress = true) {
    const toEncode = compress && (file instanceof File || file instanceof Blob)
      ? await this.compressForUpload(file)
      : file;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(toEncode);
    });
  }

  /**
   * Process screenshots using Supabase Edge Function (GPT-4o-mini vision)
   * @param {Array} images - Array of { localFile, url } objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Extracted metrics
   */
  async processScreenshots(images, onProgress = null) {
    const startTime = Date.now();
    console.log(`🚀 Starting AI OCR for ${images.length} images...`);

    if (onProgress) {
      onProgress(0, images.length, 'Preparing images...');
    }

    if (!API_KEY) {
      throw new Error('OpenAI API key is not configured.');
    }

    try {
      // Convert images to base64 data URLs for OpenAI Vision
      const base64Images = await Promise.all(
        images.map(async (img) => {
          if (img.localFile || img instanceof File || img instanceof Blob) {
            const file = img.localFile || img;
            const compressed = await this.compressForUpload(file);
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(compressed);
            });
          } else if (typeof img === 'string' && img.startsWith('data:')) {
            return img;
          } else {
            const url = img.url || img;
            const resp = await fetch(url);
            const blob = await resp.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        })
      );

      if (onProgress) {
        onProgress(0, images.length, 'Processing with AI Vision...');
      }

      const imageContent = base64Images.map((dataUrl) => ({
        type: 'image_url',
        image_url: { url: dataUrl, detail: 'high' },
      }));

      const systemPrompt = `You are an expert at extracting Instagram analytics metrics from screenshots.
Analyze ALL provided screenshots and extract ONLY the metrics you can visually read from the images.

CRITICAL RULES:
- NEVER invent, guess, estimate, or infer any values. If a number is not clearly visible in a screenshot, DO NOT include that field.
- If you cannot read a value with certainty, OMIT the field entirely.
- DO NOT hallucinate follower counts, growth numbers, or change percentages unless they are explicitly shown on screen.
- Numbers should be plain integers (no commas, no strings) unless the field type is string.
- For percentage changes, keep the sign and % symbol as a string.
- Combine data from multiple screenshots. If the same metric appears in multiple screenshots, use the most detailed version.
- Return ONLY the JSON object, no markdown, no explanation.

Use these exact field names (include ONLY fields you can actually see):

{
  "followers": <total follower count, ONLY if explicitly shown>,
  "followerChange": <net change number, ONLY if explicitly shown>,
  "accountsReached": <number>,
  "accountsReachedChange": "<string, ONLY if shown>",
  "views": <number>,
  "viewsFollowerPercent": <number, the "Followers" percentage under the Views section>,
  "interactions": <number>,
  "interactionsFollowerPercent": <number, the "Followers" percentage under the Interactions section>,
  "profileVisits": <number>,
  "profileVisitsChange": "<string, ONLY if shown>",
  "likes": <number>,
  "comments": <number>,
  "shares": <number>,
  "saves": <number>,
  "reposts": <number>,
  "follows": <number under "Follows" in profile activity, ONLY if shown>,
  "growth": { "follows": <number>, "unfollows": <number>, "overall": <number> },
  "topCities": [ { "name": "<string>", "percentage": <number> } ],
  "ageRanges": [ { "range": "<string>", "percentage": <number> } ],
  "gender": { "men": <number>, "women": <number> },
  "topSourcesOfViews": [ { "source": "<string, e.g. 'Profile'>", "percentage": <number> } ],
  "contentBreakdown": [ { "type": "<string>", "percentage": <number> } ],
  "activeTimes": [ { "hour": "<string>", "activity": <number, 0-100> } ]
}`;

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

      if (onProgress) {
        onProgress(images.length, images.length, 'Complete!');
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ AI OCR complete in ${totalTime}s (direct OpenAI Vision)`);
      console.log(`📊 Found metrics:`, Object.keys(metrics).length, 'fields');

      return metrics;
    } catch (error) {
      console.error('AI OCR error:', error);
      throw new Error(`OCR processing failed: ${error.message}. You can still enter metrics manually.`);
    }
  }

  /**
   * No cleanup needed for Edge Functions
   */
  async terminate() {
    // No-op
  }
}

export const cloudVisionOCRService = new CloudVisionOCRService();
export default cloudVisionOCRService;
