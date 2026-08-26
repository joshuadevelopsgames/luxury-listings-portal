/**
 * Cloud Vision OCR Service
 * Runs GPT-4o Vision OCR through the server-side proxy at /api/ai so the
 * API key stays off the client. Images are compressed to 1024px JPEG before
 * upload (see compressForUpload), keeping requests small.
 */

import { aiChatCompletion } from './aiProxyClient';

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
  "topCities": [ { "name": "<string>", "percentage": <number> } ],
  "topCountries": [ { "name": "<string>", "percentage": <number> } ],
  "ageRanges": [ { "range": "<string>", "percentage": <number> } ],
  "gender": { "men": <number>, "women": <number> },
  "contentShared": <number, "Content you shared" count from the Professional dashboard, ONLY if shown>,
  "topSourcesOfViews": [ { "source": "<string, e.g. 'Profile'>", "percentage": <number> } ],
  "contentBreakdown": [ { "type": "<e.g. 'Posts'>", "count": <number, newer "Views by content type" count e.g. 18000>, "percentage": <number, older % split> } ],
  "interactionsByContent": [ { "type": "<e.g. 'Posts'>", "count": <number, newer "Interactions by content type" count e.g. 928>, "percentage": <number, older % split> } ],
  "activeTimes": [ { "hour": "<string, e.g. '9a'>", "activity": <number, 0-100 relative bar height> } ]
}`;

      const data = await aiChatCompletion({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: `Extract all Instagram analytics metrics from these ${images.length} screenshot(s).` },
            ...imageContent,
          ]},
        ],
        temperature: 0.1,
        max_tokens: 3500,
        response_format: { type: 'json_object' },
      });

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
