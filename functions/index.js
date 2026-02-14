/**
 * Firebase Cloud Functions for Instagram OCR and Slack Integration
 * Uses Google Cloud Vision API for fast, accurate text extraction
 * Includes secure OpenAI proxy with rate limiting
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const functionsV1 = require('firebase-functions');
const { auth: authV1 } = require('firebase-functions/v1');
const vision = require('@google-cloud/vision');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================
const RATE_LIMITS = {
  openai: {
    maxRequestsPerHour: 50,      // Max requests per user per hour (OpenRouter/OpenAI)
    maxRequestsPerDay: 200,       // Max requests per user per day
    maxImagesPerRequest: 10,     // Max images per single request
    cooldownMinutes: 5,          // Cooldown after hitting limit
  },
  vision: {
    maxRequestsPerHour: 30,      // Max Cloud Vision requests per user per hour
    maxRequestsPerDay: 100,       // Max per user per day
    maxImagesPerRequest: 15,     // Max images per processInstagramScreenshots call
    cooldownMinutes: 5,
  }
};

// CORS origins for callable functions (avoids preflight failures from app origin)
const ALLOWED_ORIGINS = [
  'https://www.smmluxurylistings.info',
  'https://smmluxurylistings.info',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

/**
 * Check and update rate limit for a user
 * @param {string} userId - Firebase user ID
 * @param {string} feature - Feature being rate limited (e.g., 'openai')
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
async function checkRateLimit(userId, feature = 'openai') {
  const db = admin.firestore();
  const limits = RATE_LIMITS[feature];
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const rateLimitRef = db.collection('rate_limits').doc(`${userId}_${feature}`);
  
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(rateLimitRef);
    const data = doc.exists ? doc.data() : { requests: [] };
    
    // Filter to only keep requests from the last 24 hours
    const recentRequests = (data.requests || []).filter(
      ts => new Date(ts) > dayAgo
    );
    
    // Count requests in the last hour and day
    const requestsLastHour = recentRequests.filter(ts => new Date(ts) > hourAgo).length;
    const requestsLastDay = recentRequests.length;
    
    // Check if user is in cooldown
    if (data.cooldownUntil && new Date(data.cooldownUntil) > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(data.cooldownUntil),
        reason: 'cooldown'
      };
    }
    
    // Check hourly limit
    if (requestsLastHour >= limits.maxRequestsPerHour) {
      const cooldownUntil = new Date(now.getTime() + limits.cooldownMinutes * 60 * 1000);
      transaction.set(rateLimitRef, {
        requests: recentRequests,
        cooldownUntil: cooldownUntil.toISOString(),
        lastUpdated: now.toISOString()
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: cooldownUntil,
        reason: 'hourly_limit'
      };
    }
    
    // Check daily limit
    if (requestsLastDay >= limits.maxRequestsPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(recentRequests[0]).getTime() + 24 * 60 * 60 * 1000,
        reason: 'daily_limit'
      };
    }
    
    // Allow request and record it
    recentRequests.push(now.toISOString());
    transaction.set(rateLimitRef, {
      requests: recentRequests,
      cooldownUntil: null,
      lastUpdated: now.toISOString()
    });
    
    return {
      allowed: true,
      remaining: Math.min(
        limits.maxRequestsPerHour - requestsLastHour - 1,
        limits.maxRequestsPerDay - requestsLastDay - 1
      ),
      resetAt: null
    };
  });
}

/**
 * Log API usage for monitoring and billing
 */
async function logApiUsage(userId, userEmail, feature, details) {
  const db = admin.firestore();
  await db.collection('api_usage_logs').add({
    userId,
    userEmail,
    feature,
    ...details,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Initialize Vision client
const visionClient = new vision.ImageAnnotatorClient();

// ============================================================================
// SECURE OPENAI PROXY WITH RATE LIMITING
// ============================================================================

/**
 * Extract Instagram metrics from screenshots using GPT-4o Vision
 * Secure server-side implementation with rate limiting
 * 
 * This prevents API key exposure and adds abuse protection
 */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_VISION_MODEL = 'openai/gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_VISION_MODEL = 'gpt-4o-mini';

exports.extractInstagramMetricsAI = onCall({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 120,
  secrets: ['OPENROUTER_API_KEY', 'OPENAI_API_KEY'],
}, async (request) => {
  // 1. Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to use this feature');
  }

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email || 'unknown';
  
  console.log(`🤖 Vision extraction request from user: ${userEmail}`);

  // 2. Check rate limit
  const rateLimit = await checkRateLimit(userId, 'openai');
  
  if (!rateLimit.allowed) {
    console.log(`⚠️ Rate limit exceeded for ${userEmail}: ${rateLimit.reason}`);
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. ${rateLimit.reason === 'cooldown' 
        ? `Please wait ${RATE_LIMITS.openai.cooldownMinutes} minutes.` 
        : rateLimit.reason === 'hourly_limit'
        ? `Maximum ${RATE_LIMITS.openai.maxRequestsPerHour} requests per hour.`
        : `Maximum ${RATE_LIMITS.openai.maxRequestsPerDay} requests per day.`}`
    );
  }

  // 3. Validate request data
  const { images } = request.data;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new HttpsError('invalid-argument', 'images array is required');
  }

  if (images.length > RATE_LIMITS.openai.maxImagesPerRequest) {
    throw new HttpsError(
      'invalid-argument', 
      `Maximum ${RATE_LIMITS.openai.maxImagesPerRequest} images per request`
    );
  }

  // 4. Get API keys (OpenRouter primary, OpenAI fallback)
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openRouterKey && !openAIKey) {
    console.error('❌ No API key: set OPENROUTER_API_KEY or OPENAI_API_KEY secret');
    throw new HttpsError('internal', 'No AI provider key configured (OpenRouter or OpenAI)');
  }

  console.log(`📸 Processing ${images.length} images for ${userEmail}`);
  const startTime = Date.now();

  // 5. Prepare image content for vision
  const imageContents = images.map(img => ({
    type: 'image_url',
    image_url: {
      url: img.base64 ? `data:image/jpeg;base64,${img.base64}` : img.url,
      detail: 'high'
    }
  }));

  // 6. Build the extraction prompt
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

  const body = {
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
  };

  let data;
  let provider;

  // 7. Try OpenRouter first, then OpenAI fallback
  if (openRouterKey) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`
        },
        body: JSON.stringify({ ...body, model: OPENROUTER_VISION_MODEL })
      });
      if (response.ok) {
        data = await response.json();
        provider = 'openrouter';
      } else {
        const err = await response.json().catch(() => ({}));
        console.warn('⚠️ OpenRouter request failed:', err.error?.message || response.statusText);
        throw new Error(err.error?.message || response.statusText);
      }
    } catch (openRouterErr) {
      console.warn('⚠️ OpenRouter failed, trying OpenAI fallback:', openRouterErr.message);
      if (!openAIKey) {
        await logApiUsage(userId, userEmail, 'openai_instagram_metrics', {
          imageCount: images.length,
          error: openRouterErr.message,
          processingTimeMs: Date.now() - startTime
        });
        throw new HttpsError('internal', `AI extraction failed: ${openRouterErr.message}`);
      }
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({ ...body, model: OPENAI_VISION_MODEL })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('❌ OpenAI fallback error:', err);
        throw new HttpsError('internal', `AI extraction failed: ${err.error?.message || response.statusText}`);
      }
      data = await response.json();
      provider = 'openai';
    }
  } else {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`
      },
      body: JSON.stringify({ ...body, model: OPENAI_VISION_MODEL })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('❌ OpenAI API error:', err);
      throw new HttpsError('internal', `AI extraction failed: ${err.error?.message || response.statusText}`);
    }
    data = await response.json();
    provider = 'openai';
  }

  try {
    let content = data.choices[0].message.content;
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const metrics = JSON.parse(content);

    const cleaned = {};
    for (const [key, value] of Object.entries(metrics)) {
      if (value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ ${provider} extracted ${Object.keys(cleaned).length} fields in ${processingTime}s`);

    await logApiUsage(userId, userEmail, 'openai_instagram_metrics', {
      imageCount: images.length,
      fieldsExtracted: Object.keys(cleaned).length,
      processingTimeMs: Date.now() - startTime,
      provider,
      model: provider === 'openrouter' ? OPENROUTER_VISION_MODEL : OPENAI_VISION_MODEL,
      tokensUsed: data.usage?.total_tokens || 0
    });

    return {
      success: true,
      metrics: cleaned,
      processingTime: parseFloat(processingTime),
      rateLimitRemaining: rateLimit.remaining,
      provider
    };
  } catch (error) {
    console.error(`❌ ${provider} extraction failed:`, error);
    await logApiUsage(userId, userEmail, 'openai_instagram_metrics', {
      imageCount: images.length,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    });
    throw new HttpsError('internal', `AI extraction failed: ${error.message}`);
  }
});

/**
 * Generate a short client-facing report summary from extracted Instagram metrics.
 * Focus: what went well, which content type did best, standout takeaways. 3-5 sentences.
 */
exports.generateReportSummary = onCall({
  cors: ALLOWED_ORIGINS,
  maxInstances: 10,
  secrets: ['OPENROUTER_API_KEY', 'OPENAI_API_KEY'],
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const userEmail = request.auth.token.email || 'unknown';
    const rateLimit = await checkRateLimit(userId, 'openai');
    if (!rateLimit.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        rateLimit.reason === 'cooldown'
          ? `Please wait ${RATE_LIMITS.openai.cooldownMinutes} minutes.`
          : 'Rate limit exceeded. Try again later.'
      );
    }

    const { metrics = {}, dateRange = '', clientName = '' } = request.data || {};
    if (!metrics || typeof metrics !== 'object') {
      throw new HttpsError('invalid-argument', 'metrics object is required');
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openRouterKey && !openAIKey) {
      throw new HttpsError('internal', 'No AI provider key configured');
    }

    const metricsJson = JSON.stringify(metrics, null, 0).substring(0, 8000);
    const systemPrompt = `You are a social media account manager writing a short summary for a client's Instagram report. The client will read this, so write as their SMM: friendly, clear, and insightful.

Rules:
- Always refer to the account as "your account" (e.g. "Your account had a strong month..."). If a client/account name is provided, you may add it once for clarity (e.g. "Your account (Blair Chang)..."), but never use the client name as the subject (e.g. do NOT write "Blair Chang experienced...").
- Tone: professional but casual and friendly — like a sharp SMM who knows what matters, not a generic analyst.
- Be insightful, not descriptive. Avoid weak or vague phrasing (e.g. "indicating heightened engagement", "underscores the importance of video"). Be concrete: use a key number when it tells the story, then say what it means for them or what we should do next.
- Include a clear "so what" where it fits naturally (what the numbers suggest, what’s working) — but do not add a forward-looking next step or recommendation at the end.
- 3-5 sentences. No bullet lists. No preamble. Always end the paragraph on a positive or neutral note, never on a negative. Do not use em dashes (—); use commas, periods, or "and" instead. Output only the summary paragraph.`;
    const userPrompt = `Using this Instagram Insights data, write a short, insightful summary. Required:

1. Lead with what actually went well for their account this period — be specific (e.g. "Profile visits up 44% and Reels drove nearly half of all interactions"). Always say "your account", not the client name.
2. Name the best-performing content type (Reels vs Posts vs Stories) and what we should do with that (e.g. "Reels are carrying engagement — worth leaning into more short-form this month").
3. One standout number or win (e.g. a top post's reach, follower growth) and what it means.
4. If something dropped or is worth watching, mention it in a friendly way in the middle of the summary — never end on a negative. Always close with a positive or neutral line (e.g. a win, what’s working, or the standout takeaway). Do not add a recommendation or next step at the end.

Avoid: generic analyst language, filler like "indicating" or "underscores the importance", and em dashes (—). Do not end with a call to action or "we should try X next". Do not end on a down note. Be concrete and useful; stop at the insight.

Date range: ${dateRange || 'Not specified'}
${clientName ? `Account / client name (for clarity only, e.g. "Your account (${clientName})"): ${clientName}` : ''}

Metrics (JSON):
${metricsJson}`;

    const body = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400,
      temperature: 0.4
    };

    let data;
    if (openRouterKey) {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`
        },
        body: JSON.stringify({ ...body, model: OPENROUTER_VISION_MODEL })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new HttpsError('internal', err.error?.message || 'Summary generation failed');
      }
      data = await response.json();
    } else {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          ...body,
          model: 'gpt-4o-mini'
        })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new HttpsError('internal', err.error?.message || 'Summary generation failed');
      }
      data = await response.json();
    }

    const summary = data.choices?.[0]?.message?.content?.trim() || '';
    if (!summary) {
      throw new HttpsError('internal', 'No summary returned from AI');
    }

    await logApiUsage(userId, userEmail, 'openai_report_summary', {
      tokensUsed: data.usage?.total_tokens || 0
    });

    return { success: true, summary };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error('generateReportSummary error:', err);
    throw new HttpsError('internal', err.message || 'Summary generation failed');
  }
});

/**
 * Generate social media captions with hashtags for luxury real estate content.
 * Returns platform-specific captions optimized for engagement.
 */
exports.generateCaption = onCall({
  cors: true,
  maxInstances: 10,
  secrets: ['OPENROUTER_API_KEY', 'OPENAI_API_KEY'],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email || 'unknown';
  const rateLimit = await checkRateLimit(userId, 'openai');
  if (!rateLimit.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      rateLimit.reason === 'cooldown'
        ? `Please wait ${RATE_LIMITS.openai.cooldownMinutes} minutes.`
        : 'Rate limit exceeded. Try again later.'
    );
  }

  const { description, platform = 'instagram', tone = 'luxury' } = request.data || {};
  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    throw new HttpsError('invalid-argument', 'Description is required (at least 3 characters)');
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openRouterKey && !openAIKey) {
    throw new HttpsError('internal', 'No AI provider key configured');
  }

  console.log(`✍️ Generating ${platform} caption for ${userEmail}`);

  const platformGuidelines = {
    instagram: 'Instagram: 2200 char max, use line breaks for readability, up to 30 hashtags (include 15-20 relevant ones), use occasional emojis',
    facebook: 'Facebook: Conversational tone, 1-3 hashtags only, can be longer form, no excessive emojis',
    linkedin: 'LinkedIn: Professional tone, no hashtags or only 3-5 industry ones, focus on value and insights, no emojis',
    twitter: 'Twitter/X: Under 280 characters total including hashtags, punchy and engaging, 2-3 hashtags max',
    youtube: 'YouTube: Title-style or description format, include relevant keywords, 3-5 hashtags',
  };

  const systemPrompt = `You are an expert social media copywriter for luxury real estate. Write captions that are aspirational, sophisticated, and engaging. Your tone should be ${tone === 'luxury' ? 'elegant and premium' : tone}.`;

  const userPrompt = `Write a ${platform} caption for this luxury real estate content:

"${description.substring(0, 1000)}"

Platform requirements: ${platformGuidelines[platform] || platformGuidelines.instagram}

Return ONLY valid JSON in this format:
{
  "caption": "The full caption text with line breaks as \\n",
  "hashtags": ["hashtag1", "hashtag2", "..."]
}

Do not include # symbols in the hashtags array. Do not include any markdown or explanation outside the JSON.`;

  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 800,
    temperature: 0.7
  };

  let data;
  let provider;

  try {
    if (openRouterKey) {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`
        },
        body: JSON.stringify({ ...body, model: 'openai/gpt-4o-mini' })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'OpenRouter request failed');
      }
      data = await response.json();
      provider = 'openrouter';
    } else {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({ ...body, model: 'gpt-4o-mini' })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'OpenAI request failed');
      }
      data = await response.json();
      provider = 'openai';
    }

    let content = data.choices?.[0]?.message?.content?.trim() || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const result = JSON.parse(content);

    if (!result.caption) {
      throw new Error('No caption in response');
    }

    await logApiUsage(userId, userEmail, 'generate_caption', {
      platform,
      descriptionLength: description.length,
      tokensUsed: data.usage?.total_tokens || 0,
      provider
    });

    console.log(`✅ Caption generated for ${platform} (${provider})`);

    return {
      success: true,
      caption: result.caption,
      hashtags: result.hashtags || [],
      platform,
      rateLimitRemaining: rateLimit.remaining
    };
  } catch (error) {
    console.error('❌ Caption generation failed:', error);
    await logApiUsage(userId, userEmail, 'generate_caption', {
      platform,
      error: error.message
    });
    throw new HttpsError('internal', `Caption generation failed: ${error.message}`);
  }
});

/**
 * Canvas/workspace AI assist: summarize, expand, or change tone
 * Uses server-side OpenAI/OpenRouter so the API key is never exposed.
 */
exports.canvasAssist = onCall({
  cors: true,
  maxInstances: 10,
  secrets: ['OPENROUTER_API_KEY', 'OPENAI_API_KEY'],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email || 'unknown';
  const rateLimit = await checkRateLimit(userId, 'openai');
  if (!rateLimit.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      rateLimit.reason === 'cooldown'
        ? `Please wait ${RATE_LIMITS.openai.cooldownMinutes} minutes.`
        : 'Rate limit exceeded. Try again later.'
    );
  }

  const { action, blockText } = request.data || {};
  const validActions = ['summarize', 'expand', 'professional', 'casual'];
  if (!validActions.includes(action) || typeof blockText !== 'string') {
    throw new HttpsError('invalid-argument', 'action (summarize|expand|professional|casual) and blockText are required');
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openRouterKey && !openAIKey) {
    throw new HttpsError('internal', 'No AI provider key configured');
  }

  const systemBase = 'You are a human real estate marketing professional writing copy. Sound like a real person: warm, direct, and professional. No AI-speak, no filler like "I\'m here to assist" or "I\'d be happy to help." No over-politeness or robotic phrases. Write as a skilled agent or marketer would in an email or listing. Output only the requested text, no preamble or explanation.';
  const prompts = {
    summarize: 'Summarize the following in 1-3 short sentences. Keep only the key points. Sound like a human wrote it.',
    expand: 'Expand this into a longer version. Add useful detail a real estate marketer would include. Same tone—conversational and professional. No generic fluff.',
    professional: 'Rewrite in a clear, professional real estate tone. Same meaning and roughly same length. How a serious agent would phrase it.',
    casual: 'Rewrite in a friendly, casual but still professional tone. Same meaning. How you\'d text a client or colleague.',
  };
  const systemPrompt = `${systemBase}\n\nTask: ${prompts[action] || prompts.summarize}`;
  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: (blockText || '(no content)').substring(0, 15000) },
    ],
    max_tokens: 2000,
    temperature: 0.5,
  };

  try {
    let data;
    let provider;
    if (openRouterKey) {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openRouterKey}` },
        body: JSON.stringify({ ...body, model: 'openai/gpt-4o-mini' }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'OpenRouter request failed');
      }
      data = await response.json();
      provider = 'openrouter';
    } else {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey}` },
        body: JSON.stringify({ ...body, model: 'gpt-4o-mini' }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'OpenAI request failed');
      }
      data = await response.json();
      provider = 'openai';
    }

    const text = data.choices?.[0]?.message?.content?.trim() || '';
    await logApiUsage(userId, userEmail, 'canvas_assist', {
      action,
      tokensUsed: data.usage?.total_tokens || 0,
      provider,
    });
    return { text };
  } catch (error) {
    console.error('❌ Canvas assist failed:', error);
    throw new HttpsError('internal', error.message || 'AI assist failed');
  }
});

/**
 * Compute deterministic health score 0-100 (100 = doing exceptionally well).
 * - Insights (80%): growth/decay from report history (views, followers, engagement).
 * - Deliverables (20%): meeting monthly deliverables (0 remaining = full points).
 */
function computeHealthScore(reportHistory, clientData) {
  const reports = Array.isArray(reportHistory) ? reportHistory : [];
  let insightsScore = 50; // neutral when no or little data
  if (reports.length >= 2) {
    const latest = reports[0]?.metrics || {};
    const oldest = reports[reports.length - 1]?.metrics || {};
    const growthRates = [];
    if (latest.followers != null && oldest.followers != null && oldest.followers > 0) {
      growthRates.push((latest.followers - oldest.followers) / oldest.followers * 100);
    }
    if (latest.views != null && oldest.views != null && oldest.views > 0) {
      growthRates.push((latest.views - oldest.views) / oldest.views * 100);
    }
    const engagement = latest.interactions != null ? latest.interactions : latest.likes;
    const oldEngagement = oldest.interactions != null ? oldest.interactions : oldest.likes;
    if (engagement != null && oldEngagement != null && oldEngagement > 0) {
      growthRates.push((engagement - oldEngagement) / oldEngagement * 100);
    }
    if (growthRates.length > 0) {
      const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      // Map avgGrowth (e.g. -30 to +30) to 0-100: 20%+ => 100, -20% => 0
      insightsScore = Math.round(50 + Math.min(50, Math.max(-50, avgGrowth * 2.5)));
    }
  } else if (reports.length === 1 && (reports[0].metrics?.followers != null || reports[0].metrics?.views != null)) {
    insightsScore = 55; // single report = slight positive
  }

  let deliverablesScore = 50; // neutral if no package
  const packageSize = Number(clientData.packageSize) || 0;
  const postsRemaining = Number(clientData.postsRemaining) ?? 0;
  if (packageSize > 0) {
    if (postsRemaining <= 0) {
      deliverablesScore = 100;
    } else {
      const used = packageSize - postsRemaining;
      deliverablesScore = Math.round(100 * Math.max(0, used) / packageSize);
    }
  }

  const score = Math.round(0.8 * insightsScore + 0.2 * deliverablesScore);
  return Math.min(100, Math.max(0, score));
}

/**
 * Core health prediction logic (shared by onCall and bulk/scheduled run).
 * Returns { status, churnRisk, reason, action, tokensUsed, healthScore }.
 */
async function computeHealthPrediction(clientData, reportHistory) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openRouterKey && !openAIKey) {
    throw new Error('No AI provider key configured');
  }

  const clientName = clientData.clientName || 'Unknown';

  let reportTrendSection = '';
  if (reportHistory && Array.isArray(reportHistory) && reportHistory.length > 0) {
    // Extract key metrics from each report
    const reportSummaries = reportHistory.slice(0, 6).map((report, idx) => {
      const metrics = report.metrics || {};
      return `Report ${idx + 1} (${report.dateRange || report.startDate || 'unknown date'}):
  - Followers: ${metrics.followers ?? 'N/A'}
  - Views: ${metrics.views ?? 'N/A'}
  - Interactions: ${metrics.interactions ?? 'N/A'}
  - Accounts Reached: ${metrics.accountsReached ?? 'N/A'}
  - Likes: ${metrics.likes ?? 'N/A'}
  - Shares: ${metrics.shares ?? 'N/A'}`;
    }).join('\n');

    // Calculate trends if we have at least 2 reports
    let trendAnalysis = '';
    if (reportHistory.length >= 2) {
      const latest = reportHistory[0]?.metrics || {};
      const oldest = reportHistory[reportHistory.length - 1]?.metrics || {};

      if (latest.followers && oldest.followers) {
        const followerGrowth = ((latest.followers - oldest.followers) / oldest.followers * 100).toFixed(1);
        trendAnalysis += `\nFollower Growth (${reportHistory.length} months): ${followerGrowth}% (${oldest.followers} → ${latest.followers})`;
        if (parseFloat(followerGrowth) < 0) {
          trendAnalysis += ' ⚠️ LOSING FOLLOWERS';
        } else if (parseFloat(followerGrowth) < 2 * reportHistory.length) {
          trendAnalysis += ' ⚠️ STAGNANT GROWTH (<2%/month)';
        }
      }

      if (latest.interactions && oldest.interactions) {
        const interactionChange = ((latest.interactions - oldest.interactions) / oldest.interactions * 100).toFixed(1);
        trendAnalysis += `\nInteraction Trend: ${interactionChange}% change`;
        if (parseFloat(interactionChange) < -20) {
          trendAnalysis += ' ⚠️ SIGNIFICANT ENGAGEMENT DECLINE';
        }
      }

      if (latest.views && oldest.views) {
        const viewsChange = ((latest.views - oldest.views) / oldest.views * 100).toFixed(1);
        trendAnalysis += `\nViews Trend: ${viewsChange}% change`;
        if (parseFloat(viewsChange) < -20) {
          trendAnalysis += ' ⚠️ VIEWS DECLINING';
        }
      }
    }

    reportTrendSection = `

=== INSTAGRAM PERFORMANCE DATA (Last ${reportHistory.length} reports) ===
${reportSummaries}
${trendAnalysis}

CRITICAL CHURN SIGNALS TO WATCH:
- Losing followers month-over-month = VERY HIGH RISK
- Follower growth <2%/month for 3+ months = HIGH RISK (stagnation)
- Engagement (interactions/views) declining >20% = HIGH RISK
- Accounts reached declining = WARNING`;
  }

  const systemPrompt = `You are a client success analyst for a luxury real estate social media agency. Analyze client health data and Instagram performance trends to predict churn risk.

CRITICAL: Clients leave primarily because:
1. Their page isn't growing (especially losing followers or <2% growth over months)
2. Engagement is declining (fewer interactions, views, reach)
3. Deliverables aren't being met (posts scheduled vs delivered)
4. Content feels repetitive (hard to measure, but declining engagement can indicate this)

Weight Instagram performance trends HEAVILY in your analysis. A client with good package utilization but declining followers is still at HIGH risk.`;

  const userPrompt = `Analyze this client's health and predict churn risk:

=== CLIENT DATA ===
Client: ${clientName}
Posts remaining: ${clientData.postsRemaining ?? 'unknown'} of ${clientData.packageSize ?? 'unknown'}
Posts used: ${clientData.postsUsed ?? 'unknown'}
Payment status: ${clientData.paymentStatus || 'unknown'}
Package type: ${clientData.packageType || 'unknown'}
Days since last contact: ${clientData.daysSinceContact ?? 'unknown'}
Contract renewal in days: ${clientData.daysUntilRenewal ?? 'unknown'}
Account created: ${clientData.createdAt || 'unknown'}
Last post date: ${clientData.lastPostDate || 'unknown'}
Client notes: ${clientData.notes || 'none'}${reportTrendSection}

Based on ALL this data (especially Instagram trends if available), provide a health assessment.

Return ONLY valid JSON:
{
  "status": "good" | "warning" | "critical",
  "churnRisk": 0-100,
  "reason": "Brief explanation of the primary concern or positive indicator",
  "action": "Specific recommended next step"
}

Guidelines:
- "critical" = high churn risk (losing followers, major engagement drop, or overdue payment)
- "warning" = concerning trends (stagnant growth, declining engagement, low posts)
- "good" = healthy (growing followers, stable/growing engagement, on track with deliverables)
- LOSING FOLLOWERS = automatic critical status
- <2% follower growth over 3+ months = at least warning status`;

  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 300,
    temperature: 0.3
  };

  let data;
  let provider;

  try {
    if (openRouterKey) {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`
        },
        body: JSON.stringify({ ...body, model: 'openai/gpt-4o-mini' })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'OpenRouter request failed');
      }
      data = await response.json();
      provider = 'openrouter';
    } else {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({ ...body, model: 'gpt-4o-mini' })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'OpenAI request failed');
      }
      data = await response.json();
      provider = 'openai';
    }

    let content = data.choices?.[0]?.message?.content?.trim() || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const result = JSON.parse(content);

    // Validate response
    if (!['good', 'warning', 'critical'].includes(result.status)) {
      result.status = 'warning';
    }
    if (typeof result.churnRisk !== 'number' || result.churnRisk < 0 || result.churnRisk > 100) {
      result.churnRisk = 50;
    }

    await logApiUsage(userId, userEmail, 'predict_client_health', {
      clientName,
      status: result.status,
      churnRisk: result.churnRisk,
      tokensUsed: data.usage?.total_tokens || 0,
      provider
    });

    const healthScore = computeHealthScore(reportHistory, clientData);

    console.log(`✅ Health predicted for ${clientName}: ${result.status} (${result.churnRisk}% risk, score ${healthScore}/100)`);

    return {
      success: true,
      ...result,
      healthScore,
      rateLimitRemaining: rateLimit.remaining
    };
  } catch (error) {
    console.error('❌ Client health prediction failed:', error);
    await logApiUsage(userId, userEmail, 'predict_client_health', {
      clientName,
      error: error.message
    });
    throw new HttpsError('internal', `Health prediction failed: ${error.message}`);
  }
}

/**
 * Get current rate limit status for a user
 */
exports.getRateLimitStatus = onCall({
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const rateLimitRef = db.collection('rate_limits').doc(`${userId}_openai`);
  const doc = await rateLimitRef.get();
  const data = doc.exists ? doc.data() : { requests: [] };
  
  const recentRequests = (data.requests || []).filter(
    ts => new Date(ts) > dayAgo
  );
  const requestsLastHour = recentRequests.filter(ts => new Date(ts) > hourAgo).length;
  const requestsLastDay = recentRequests.length;
  
  return {
    hourly: {
      used: requestsLastHour,
      limit: RATE_LIMITS.openai.maxRequestsPerHour,
      remaining: Math.max(0, RATE_LIMITS.openai.maxRequestsPerHour - requestsLastHour)
    },
    daily: {
      used: requestsLastDay,
      limit: RATE_LIMITS.openai.maxRequestsPerDay,
      remaining: Math.max(0, RATE_LIMITS.openai.maxRequestsPerDay - requestsLastDay)
    },
    cooldownUntil: data.cooldownUntil || null,
    inCooldown: data.cooldownUntil && new Date(data.cooldownUntil) > now
  };
});

/**
 * Run bulk health prediction for all clients (writes to client_health_snapshots).
 * Admin only. Set ADMIN_EMAILS (comma-separated) in Firebase config or .env to add production admins.
 */
function getAdminEmails() {
  const env = process.env.ADMIN_EMAILS || '';
  const list = env ? env.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) : [];
  if (list.length) return list;
  return ['jrsschroeder@gmail.com', 'demo@luxurylistings.app'];
}

async function doBulkHealthPrediction() {
  const db = admin.firestore();
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openRouterKey && !openAIKey) {
    throw new Error('No AI provider key configured');
  }
  const clientsSnap = await db.collection('clients').get();
  const snapshotsCol = db.collection('client_health_snapshots');
  const instagramCol = db.collection('instagram_reports');
  let processed = 0;
  let failed = 0;
  const systemPrompt = `You are a client success analyst for a luxury real estate social media agency. Analyze client health data and Instagram performance trends to predict churn risk. Return ONLY valid JSON: { "status": "good"|"warning"|"critical", "churnRisk": 0-100, "reason": "brief explanation", "action": "recommended next step" }.`;
  for (const docSnap of clientsSnap.docs) {
    const client = { id: docSnap.id, ...docSnap.data() };
    const clientData = {
      clientName: client.clientName || client.name || 'Unknown',
      postsRemaining: client.postsRemaining ?? 0,
      packageSize: client.packageSize ?? 10,
      postsUsed: client.postsUsed ?? 0,
      paymentStatus: client.paymentStatus || 'unknown',
      packageType: client.packageType || 'unknown',
      daysSinceContact: null,
      daysUntilRenewal: null,
      createdAt: client.createdAt || null,
      lastPostDate: client.lastPostDate || null,
      notes: client.notes || ''
    };
    let reportHistory = [];
    try {
      const reportsSnap = await instagramCol.where('clientId', '==', client.id).limit(20).get();
      const sorted = reportsSnap.docs.sort((a, b) => (b.data().startDate || '').localeCompare(a.data().startDate || ''));
      reportHistory = sorted.slice(0, 6).map((d) => {
        const d_ = d.data();
        return { dateRange: d_.dateRange || `${d_.startDate || ''}-${d_.endDate || ''}`, startDate: d_.startDate, metrics: d_.metrics || {} };
      });
    } catch (e) {
      // ignore
    }
    const userPrompt = `Analyze health. Client: ${clientData.clientName}. Posts: ${clientData.postsRemaining}/${clientData.packageSize} remaining, used ${clientData.postsUsed}. Payment: ${clientData.paymentStatus}. ${reportHistory.length ? `Reports: ${reportHistory.length} periods.` : ''} Return ONLY valid JSON with status, churnRisk (0-100), reason, action.`;
    const body = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], max_tokens: 300, temperature: 0.3 };
    try {
      const response = openRouterKey
        ? await fetch(OPENROUTER_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openRouterKey}` }, body: JSON.stringify({ ...body, model: 'openai/gpt-4o-mini' }) })
        : await fetch(OPENAI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAIKey}` }, body: JSON.stringify({ ...body, model: 'gpt-4o-mini' }) });
      if (!response.ok) throw new Error('AI request failed');
      const data = await response.json();
      let content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);
      const status = ['good', 'warning', 'critical'].includes(result.status) ? result.status : 'warning';
      const churnRisk = typeof result.churnRisk === 'number' && result.churnRisk >= 0 && result.churnRisk <= 100 ? result.churnRisk : 50;
      const healthScore = computeHealthScore(reportHistory, clientData);
      await snapshotsCol.doc(client.id).set({
        clientName: clientData.clientName,
        assignedManager: client.assignedManager || null,
        status,
        churnRisk,
        healthScore,
        reason: result.reason || '',
        action: result.action || '',
        timestamp: new Date().toISOString()
      });
      processed++;
    } catch (err) {
      console.warn(`Health prediction failed for client ${client.id}:`, err.message);
      failed++;
    }
  }
  return { processed, failed, total: clientsSnap.size };
}

exports.runBulkHealthPrediction = onCall({
  cors: ALLOWED_ORIGINS,
  maxInstances: 1,
  secrets: ['OPENROUTER_API_KEY', 'OPENAI_API_KEY'],
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const email = (request.auth.token.email || '').toLowerCase();
    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(email)) {
      throw new HttpsError('permission-denied', 'Only admins can run bulk health prediction. Set ADMIN_EMAILS in Firebase config to add admins.');
    }
    const result = await doBulkHealthPrediction();
    return { success: true, ...result };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error('runBulkHealthPrediction error:', err);
    throw new HttpsError('internal', err.message || 'Bulk health prediction failed');
  }
});

/**
 * Extract text from an image using Google Cloud Vision
 * Much faster than browser-based Tesseract.js (~1-2 seconds vs 10-15 seconds per image)
 */
exports.extractTextFromImage = onCall({
  cors: true,
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const rateLimit = await checkRateLimit(userId, 'vision');
  if (!rateLimit.allowed) {
    const visionLimit = RATE_LIMITS.vision;
    throw new HttpsError(
      'resource-exhausted',
      rateLimit.reason === 'cooldown'
        ? `Please wait ${visionLimit.cooldownMinutes} minutes before trying again.`
        : rateLimit.reason === 'hourly_limit'
          ? `Maximum ${visionLimit.maxRequestsPerHour} image requests per hour.`
          : `Maximum ${visionLimit.maxRequestsPerDay} image requests per day.`
    );
  }

  const { imageUrl, imageBase64 } = request.data;

  if (!imageUrl && !imageBase64) {
    throw new HttpsError('invalid-argument', 'Either imageUrl or imageBase64 is required');
  }

  try {
    let result;

    if (imageBase64) {
      // Process base64 image directly
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      [result] = await visionClient.textDetection({
        image: { content: imageBuffer }
      });
    } else {
      // Process image from URL (Firebase Storage URL)
      [result] = await visionClient.textDetection(imageUrl);
    }

    const detections = result.textAnnotations;
    const fullText = detections && detections.length > 0 
      ? detections[0].description 
      : '';

    return {
      success: true,
      text: fullText,
      wordCount: detections ? detections.length - 1 : 0
    };
  } catch (error) {
    console.error('Vision API error:', error);
    throw new HttpsError('internal', `OCR failed: ${error.message}`);
  }
});

/**
 * Process multiple images in parallel
 * Returns extracted text and parsed Instagram metrics
 */
exports.processInstagramScreenshots = onCall({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 120,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const { images } = request.data;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new HttpsError('invalid-argument', 'images array is required');
  }

  const visionLimit = RATE_LIMITS.vision;
  if (images.length > visionLimit.maxImagesPerRequest) {
    throw new HttpsError(
      'invalid-argument',
      `Maximum ${visionLimit.maxImagesPerRequest} images per request`
    );
  }

  const rateLimit = await checkRateLimit(userId, 'vision');
  if (!rateLimit.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      rateLimit.reason === 'cooldown'
        ? `Please wait ${visionLimit.cooldownMinutes} minutes before trying again.`
        : rateLimit.reason === 'hourly_limit'
          ? `Maximum ${visionLimit.maxRequestsPerHour} Vision requests per hour.`
          : `Maximum ${visionLimit.maxRequestsPerDay} Vision requests per day.`
    );
  }

  console.log(`Processing ${images.length} screenshots for user ${userId}`);
  const startTime = Date.now();

  try {
    // Process all images in parallel for speed
    const textPromises = images.map(async (image, index) => {
      try {
        let result;
        
        if (image.base64) {
          const imageBuffer = Buffer.from(image.base64, 'base64');
          [result] = await visionClient.textDetection({
            image: { content: imageBuffer }
          });
        } else if (image.url) {
          [result] = await visionClient.textDetection(image.url);
        } else {
          return { index, text: '', error: 'No image data provided' };
        }

        const detections = result.textAnnotations;
        const fullText = detections && detections.length > 0 
          ? detections[0].description 
          : '';

        console.log(`Screenshot ${index + 1}: ${fullText.length} chars extracted`);
        return { index, text: fullText };
      } catch (error) {
        console.error(`Error processing screenshot ${index + 1}:`, error.message);
        return { index, text: '', error: error.message };
      }
    });

    const results = await Promise.all(textPromises);
    
    // Combine all text and parse metrics
    const allText = results
      .sort((a, b) => a.index - b.index)
      .map(r => r.text)
      .join('\n\n');

    const metrics = parseInstagramMetrics(allText);
    
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Completed in ${processingTime}s - Found ${Object.keys(metrics).length} metric types`);

    return {
      success: true,
      metrics,
      rawTexts: results.map(r => ({ index: r.index, text: r.text.substring(0, 500) })),
      processingTime: parseFloat(processingTime)
    };
  } catch (error) {
    console.error('Processing error:', error);
    throw new HttpsError('internal', `Processing failed: ${error.message}`);
  }
});

/**
 * Parse Instagram metrics from extracted text
 */
function parseInstagramMetrics(text) {
  const metrics = {};

  // === VIEWS ===
  const viewsMatch = text.match(/Views?\s*[\n\s]*([0-9,]+)/i) || 
                     text.match(/([0-9,]+)\s*Views?/i);
  if (viewsMatch) {
    metrics.views = parseNumber(viewsMatch[1]);
  }

  // === FOLLOWERS COUNT ===
  const followersCountMatch = text.match(/([0-9,]+)\s*Followers?(?!\s*%)/i) ||
                              text.match(/Followers?\s*[\n\s]*([0-9,]+)(?!\s*%)/i);
  if (followersCountMatch) {
    metrics.followers = parseNumber(followersCountMatch[1]);
  }

  // === FOLLOWER / NON-FOLLOWER % (context-aware: Views vs Interactions) ===
  const interactionsIdx = text.toLowerCase().indexOf('interactions');
  if (interactionsIdx >= 0) {
    const viewsBlock = text.slice(0, interactionsIdx);
    const interactionsBlock = text.slice(interactionsIdx);
    const viewsFollowerMatch = viewsBlock.match(/Followers?\s*[\n\s]*([0-9.]+)%/i);
    const viewsNonFollowerMatch = viewsBlock.match(/Non[- ]?followers?\s*[\n\s]*([0-9.]+)%/i);
    const interactionsFollowerMatch = interactionsBlock.match(/Followers?\s*[\n\s]*([0-9.]+)%/i);
    if (viewsFollowerMatch) metrics.viewsFollowerPercent = parseFloat(viewsFollowerMatch[1]);
    if (viewsNonFollowerMatch) metrics.nonFollowerPercent = parseFloat(viewsNonFollowerMatch[1]);
    if (interactionsFollowerMatch) metrics.interactionsFollowerPercent = parseFloat(interactionsFollowerMatch[1]);
  } else {
    const followerPercentMatch = text.match(/Followers?\s*[\n\s]*([0-9.]+)%/i);
    if (followerPercentMatch) metrics.viewsFollowerPercent = parseFloat(followerPercentMatch[1]);
    const nonFollowerMatch = text.match(/Non[- ]?followers?\s*[\n\s]*([0-9.]+)%/i);
    if (nonFollowerMatch) metrics.nonFollowerPercent = parseFloat(nonFollowerMatch[1]);
  }

  // === INTERACTIONS ===
  // Early: number immediately after "Interactions" (flexible whitespace; not part of % or date).
  const immediateInteractions = text.match(/(?:Total\s+)?Interacti[o0]ns\s*[\s\n]*([0-9,]{1,6})(?!\s*%)/i);
  if (immediateInteractions) {
    const n = parseNumber(immediateInteractions[1]);
    if (n >= 1 && n <= 99999 && n !== 1 && n !== 30 && n !== 31) {
      metrics.interactions = n;
    }
  }
  const low = text.toLowerCase();
  const interactionsSectionStart = Math.max(low.indexOf('interactions'), low.indexOf('interacti0ns'));
  if (metrics.interactions === undefined && interactionsSectionStart >= 0) {
    const growthIdx = low.indexOf('growth', interactionsSectionStart + 1);
    const endByGrowth = growthIdx > interactionsSectionStart ? growthIdx : text.length;
    const sectionEnd = Math.min(text.length, interactionsSectionStart + 900, endByGrowth);
    const section = text.slice(interactionsSectionStart, sectionEnd);
    const dateFragments = new Set([1, 30, 31]);
    const has30Days = /30\s*days?/i.test(section);

    const lines = section.split(/\r?\n/);
    for (const line of lines) {
      const standalone = line.match(/^\s*([0-9]{1,5})\s*$/);
      if (standalone) {
        const n = parseNumber(standalone[1]);
        if (n >= 1 && n <= 99999 && !dateFragments.has(n)) {
          metrics.interactions = n;
          break;
        }
      }
    }
    if (metrics.interactions === undefined) {
      for (const line of lines) {
        const endNum = line.match(/\s+([0-9,]{1,5})\s*$/);
        if (endNum) {
          const n = parseNumber(endNum[1]);
          if (n >= 1 && n <= 99999 && !dateFragments.has(n) && !(n === 30 && has30Days)) {
            metrics.interactions = n;
            break;
          }
        }
      }
    }
    if (metrics.interactions === undefined) {
      const numbersInOrder = [];
      const numRe = /\b([0-9,]+)\b/g;
      let numMatch;
      while ((numMatch = numRe.exec(section)) !== null) {
        const nextChar = section[numMatch.index + numMatch[0].length];
        if (nextChar === '.' || nextChar === ',' || nextChar === '%') continue;
        numbersInOrder.push(numMatch[1]);
      }
      for (const numStr of numbersInOrder) {
        const n = parseNumber(numStr);
        if (n < 1 || n > 99999) continue;
        if (n === 30 && has30Days) continue;
        if (dateFragments.has(n)) continue;
        metrics.interactions = n;
        break;
      }
    }
  }
  if (metrics.interactions === undefined && interactionsSectionStart >= 0) {
    const byContentIdx = low.indexOf('by content type', interactionsSectionStart + 1);
    const endAfterByContent = byContentIdx > interactionsSectionStart ? byContentIdx + 400 : text.length;
    const blockEnd = Math.min(endAfterByContent, text.length);
    const block = text.slice(interactionsSectionStart, blockEnd).slice(0, 1000);
    const numbersInBlock = [];
    const numRe = /\b([0-9,]+)\b/g;
    let numMatch;
    while ((numMatch = numRe.exec(block)) !== null) {
      const nextChar = block[numMatch.index + numMatch[0].length];
      if (nextChar === '.' || nextChar === ',' || nextChar === '%') continue;
      numbersInBlock.push(numMatch[1]);
    }
    if (numbersInBlock.length > 0) {
      const isDateFragment = (n) => n === 1 || n === 30 || n === 31;
      const has30Days = /30\s*days?/i.test(block);
      let parsed = 0;
      for (let i = numbersInBlock.length - 1; i >= 0; i--) {
        const n = parseNumber(numbersInBlock[i]);
        if (n < 1 || n > 999999) continue;
        if (n === 30 && has30Days) continue;
        if (isDateFragment(n)) continue;
        parsed = n;
        break;
      }
      if (parsed > 0) metrics.interactions = parsed;
    }
  }
  if (metrics.interactions === undefined) {
    const interactionsMatch = text.match(/Interactions?\s*[\n\s]*([0-9,]+)(?!\s*days?)/i) ||
                              text.match(/([0-9,]+)\s*Interactions?/i);
    if (interactionsMatch) {
      const fallbackNum = parseNumber(interactionsMatch[1]);
      if (fallbackNum !== 1 && fallbackNum !== 30 && fallbackNum !== 31) {
        metrics.interactions = fallbackNum;
      }
    }
  }

  // === ACCOUNTS REACHED ===
  const accountsReachedMatch = text.match(/Accounts?\s*reached\s*[\n\s]*([0-9,]+)/i) ||
                                text.match(/([0-9,]+)\s*[\n\s]*Accounts?\s*reached/i);
  if (accountsReachedMatch) {
    metrics.accountsReached = parseNumber(accountsReachedMatch[1]);
  }

  // === PROFILE VISITS ===
  const profileVisitsMatch = text.match(/Profile\s*visits?\s*[\n\s]*([0-9,]+)/i) ||
                             text.match(/([0-9,]+)\s*[\n\s]*Profile\s*visits?/i);
  if (profileVisitsMatch) {
    metrics.profileVisits = parseNumber(profileVisitsMatch[1]);
  }

  // === EXTERNAL LINK TAPS ===
  const linkTapsMatch = text.match(/External\s*link\s*taps?\s*[\n\s]*([0-9,]+)/i);
  if (linkTapsMatch) {
    metrics.externalLinkTaps = parseNumber(linkTapsMatch[1]);
  }

  // === SAVES ===
  const savesMatch = text.match(/Saves?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Saves?/i);
  if (savesMatch) metrics.saves = parseNumber(savesMatch[1]);

  // === SHARES ===
  const sharesMatch = text.match(/Shares?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Shares?/i);
  if (sharesMatch) metrics.shares = parseNumber(sharesMatch[1]);

  // === LIKES ===
  const likesMatch = text.match(/Likes?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Likes?/i);
  if (likesMatch) metrics.likes = parseNumber(likesMatch[1]);

  // === COMMENTS ===
  const commentsMatch = text.match(/Comments?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Comments?/i);
  if (commentsMatch) metrics.comments = parseNumber(commentsMatch[1]);

  // === REPOSTS ===
  const repostsMatch = text.match(/Reposts?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Reposts?/i);
  if (repostsMatch) metrics.reposts = parseNumber(repostsMatch[1]);

  // === PROFILE ACTIVITY (total, separate from profile visits) ===
  const profileActivityMatch = text.match(/Profile\s*activity[^0-9]*([0-9,]+)/i) ||
                               text.match(/([0-9,]+)\s*[\n\s]*Profile\s*activity/i);
  if (profileActivityMatch) metrics.profileActivity = parseNumber(profileActivityMatch[1]);

  // === EXTERNAL LINK TAPS CHANGE % ===
  const linkTapsChangeMatch = text.match(/External\s*link\s*taps?[^0-9]*([+-]?[0-9.]+%)/i) ||
                              text.match(/link\s*taps?[^0-9]*\d+[^0-9]*([+-][0-9.]+%)/i);
  if (linkTapsChangeMatch) metrics.externalLinkTapsChange = linkTapsChangeMatch[1];

  // === % FROM ADS (context-aware: Views vs Interactions) ===
  const viewsIdx = low.indexOf('views');
  if (viewsIdx >= 0 && interactionsIdx >= 0) {
    // Views section: from "views" to "interactions"
    const viewsSection = text.slice(viewsIdx, interactionsIdx);
    const viewsAdsMatch = viewsSection.match(/([0-9.]+)\s*%\s*from\s*ads/i);
    if (viewsAdsMatch) metrics.viewsFromAdsPercent = parseFloat(viewsAdsMatch[1]);
    
    // Interactions section: from "interactions" onwards
    const interactionsSection = text.slice(interactionsIdx);
    const interactionsAdsMatch = interactionsSection.match(/([0-9.]+)\s*%\s*from\s*ads/i);
    if (interactionsAdsMatch) metrics.interactionsFromAdsPercent = parseFloat(interactionsAdsMatch[1]);
  } else {
    // Fallback: just grab any "% from ads"
    const adsMatch = text.match(/([0-9.]+)\s*%\s*from\s*ads/i);
    if (adsMatch) metrics.fromAdsPercent = parseFloat(adsMatch[1]);
  }

  // === IMPRESSIONS ===
  const impressionsMatch = text.match(/Impressions?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Impressions?/i);
  if (impressionsMatch) metrics.impressions = parseNumber(impressionsMatch[1]);

  // === REACH ===
  const reachMatch = text.match(/Reach\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Reach/i);
  if (reachMatch) metrics.reach = parseNumber(reachMatch[1]);

  // === ACCOUNTS REACHED TREND % ===
  const accountsReachedChangeMatch = text.match(/Accounts?\s*reached[^0-9]*([+-]?[0-9.]+%)/i);
  if (accountsReachedChangeMatch) metrics.accountsReachedChange = accountsReachedChangeMatch[1];

  // === ENGAGEMENT RATE % ===
  const engagementRateMatch = text.match(/Engagement\s*(?:rate)?\s*[\n\s]*([0-9.]+)%/i) || text.match(/([0-9.]+)%\s*Engagement/i);
  if (engagementRateMatch) metrics.engagementRatePercent = parseFloat(engagementRateMatch[1]);

  // === CONTENT BREAKDOWN === (scope to "By content type" section; allow comma decimal)
  const contentBreakdown = [];
  const contentTypeIdx = text.toLowerCase().indexOf('by content type');
  const section = contentTypeIdx >= 0 ? text.slice(contentTypeIdx, contentTypeIdx + 600) : text;
  const tryContentType = (labelRegex, typeName) => {
    const m = section.match(labelRegex);
    if (m) {
      const pctStr = m[1].replace(/,/g, '.');
      const pct = parseFloat(pctStr);
      if (!isNaN(pct) && pct <= 100) contentBreakdown.push({ type: typeName, percentage: pct });
    }
  };
  tryContentType(/Stor(?:ies|ics|les)\s*[\n\s]*([0-9]+(?:[.,][0-9]+)?)\s*%/i, 'Stories');
  tryContentType(/Posts?\s*[\n\s]*([0-9]+(?:[.,][0-9]+)?)\s*%(?!\s*from)/i, 'Posts');
  tryContentType(/Reels?\s*[\n\s]*([0-9]+(?:[.,][0-9]+)?)\s*%/i, 'Reels');
  if (contentBreakdown.length > 0) {
    contentBreakdown.sort((a, b) => b.percentage - a.percentage);
    metrics.contentBreakdown = contentBreakdown;
  }

  // === TOP CITIES === (scope to locations section; comma decimal; fallback for any "Name %")
  const locationsSection = getLocationsSection(text);
  const cities = [];
  const citySeen = new Set();
  const cityPatterns = [
    'Los Angeles', 'San Francisco', 'New York', 'Quebec City',
    'Calgary', 'Vancouver', 'Toronto', 'Montreal', 'Edmonton', 'Ottawa',
    'Burnaby', 'Surrey', 'Richmond', 'Victoria', 'Winnipeg', 'Halifax',
    'Chicago', 'Houston', 'Miami', 'Seattle', 'Denver', 'Phoenix', 'Dallas', 'Austin',
    'London', 'Paris', 'Sydney', 'Melbourne', 'Dubai', 'Singapore',
    'Mississauga', 'Brampton', 'Hamilton', 'Laval', 'Nashville', 'Boston', 'Atlanta',
    'Las Vegas', 'San Diego', 'Philadelphia', 'Washington', 'Portland'
  ];
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const city of cityPatterns) {
    const escaped = escapeRegex(city);
    const regex = new RegExp(`(?:^|[\\s\\n])${escaped}[\\s\\n]+([0-9]+(?:[.,][0-9]+)?)\\s*%`, 'gi');
    let match;
    while ((match = regex.exec(locationsSection)) !== null) {
      const pct = parseFloat(match[1].replace(/,/g, '.'));
      const key = `${city.toLowerCase()}-${pct}`;
      if (!citySeen.has(key) && pct <= 100) {
        citySeen.add(key);
        cities.push({ name: city, percentage: pct });
      }
    }
  }
  const uiWords = new Set(['all', 'followers', 'non-followers', 'nonfollowers', 'posts', 'cities', 'countries', 'top', 'locations', 'stories', 'reels', 'by', 'content', 'type', 'where', 'your', 'are', 'from', 'indie', 'men', 'women']);
  const nonCitySubstrings = ['indie', 'reels', 'posts', 'stories', ' li'];
  const rejectName = (n, nLower) => {
    if (n.length < 2 || n.length > 35) return true;
    if (uiWords.has(nLower) || /\d/.test(n)) return true;
    if (nLower.endsWith(' -') || n.endsWith(' -')) return true;
    if (nonCitySubstrings.some(s => nLower.includes(s))) return true;
    return false;
  };
  const lineStartRe = /(?:^|\n)\s*([A-Za-z][A-Za-z\s\-']{1,40}?)\s+([0-9]+(?:[.,][0-9]+)?)\s*%/g;
  let genMatch;
  while ((genMatch = lineStartRe.exec(locationsSection)) !== null) {
    const name = genMatch[1].trim().replace(/\s+/g, ' ').replace(/\s*-\s*$/, '');
    const nameLower = name.toLowerCase();
    if (rejectName(name, nameLower)) continue;
    const pct = parseFloat(genMatch[2].replace(/,/g, '.'));
    if (pct <= 0 || pct > 100) continue;
    const key = `${nameLower}-${pct}`;
    if (!citySeen.has(key)) {
      citySeen.add(key);
      cities.push({ name, percentage: pct });
    }
  }
  const wordBoundRe = /\b([A-Za-z][A-Za-z\s\-']{1,40}?)\s+([0-9]+(?:[.,][0-9]+)?)\s*%/g;
  while ((genMatch = wordBoundRe.exec(locationsSection)) !== null) {
    const name = genMatch[1].trim().replace(/\s+/g, ' ').replace(/\s*-\s*$/, '');
    const nameLower = name.toLowerCase();
    if (rejectName(name, nameLower)) continue;
    const pct = parseFloat(genMatch[2].replace(/,/g, '.'));
    if (pct <= 0 || pct > 100) continue;
    const key = `${nameLower}-${pct}`;
    if (!citySeen.has(key)) {
      citySeen.add(key);
      cities.push({ name, percentage: pct });
    }
  }
  if (cities.length > 0) {
    cities.sort((a, b) => b.percentage - a.percentage);
    metrics.topCities = cities;
  }

  // === AGE RANGES === (flexible: en-dash, spacing, newlines)
  const ageRanges = [];
  const dashClass = '[\\-\\s\u2013\u2014]';
  const agePatterns = [
    { pattern: new RegExp(`13${dashClass}*17[\\s\\n]*([0-9]+(?:\\.[0-9]+)?)\\s*%`, 'i'), range: '13-17' },
    { pattern: new RegExp(`18${dashClass}*24[\\s\\n]*([0-9]+(?:\\.[0-9]+)?)\\s*%`, 'i'), range: '18-24' },
    { pattern: new RegExp(`25${dashClass}*34[\\s\\n]*([0-9]+(?:\\.[0-9]+)?)\\s*%`, 'i'), range: '25-34' },
    { pattern: new RegExp(`35${dashClass}*44[\\s\\n]*([0-9]+(?:\\.[0-9]+)?)\\s*%`, 'i'), range: '35-44' },
    { pattern: new RegExp(`45${dashClass}*54[\\s\\n]*([0-9]+(?:\\.[0-9]+)?)\\s*%`, 'i'), range: '45-54' },
    { pattern: new RegExp(`55${dashClass}*64[\\s\\n]*([0-9]+(?:\\.[0-9]+)?)\\s*%`, 'i'), range: '55-64' },
    { pattern: /65\s*\+\s*[\s\n]*([0-9]+(?:\.[0-9]+)?)\s*%/i, range: '65+' }
  ];
  for (const { pattern, range } of agePatterns) {
    const match = text.match(pattern);
    if (match) {
      const pct = parseFloat(match[1]);
      if (pct <= 100) ageRanges.push({ range, percentage: pct });
    }
  }
  if (ageRanges.length > 0) {
    ageRanges.sort((a, b) => b.percentage - a.percentage);
    metrics.ageRanges = ageRanges;
  }

  // === GENDER === (scope to audience section; allow Male/Female, comma decimal, OCR variants)
  const genderSection = getGenderSection(text);
  const pctNum = (str) => {
    if (!str) return null;
    const n = parseFloat(str.replace(/,/g, '.').replace(/\s/g, ''));
    return isNaN(n) || n < 0 || n > 100 ? null : n;
  };
  let menPct = null;
  let womenPct = null;
  const menMatch = genderSection.match(/\b(?:Men|Male|Man)\s*[\n\s]*([0-9]+[.,]?[0-9]*)\s*%/i);
  const womenMatch = genderSection.match(/\b(?:Women|Female|Wom[ae]n|Womcn)\s*[\n\s]*([0-9]+[.,]?[0-9]*)\s*%/i);
  if (menMatch) menPct = pctNum(menMatch[1]);
  if (womenMatch) womenPct = pctNum(womenMatch[1]);
  if (menPct != null || womenPct != null) {
    metrics.gender = {
      men: menPct ?? 0,
      women: womenPct ?? 0
    };
  }

  // === GROWTH METRICS ===
  const overallGrowthMatch = text.match(/Overall\s*[\n\s]*([+-]?[0-9,]+)/i);
  const followsMatch = text.match(/Follows?\s*[\n\s]*([0-9,]+)/i);
  const unfollowsMatch = text.match(/Unfollows?\s*[\n\s]*([0-9,]+)/i);
  if (overallGrowthMatch || followsMatch || unfollowsMatch) {
    metrics.growth = {};
    if (overallGrowthMatch) metrics.growth.overall = parseNumber(overallGrowthMatch[1]);
    if (followsMatch) metrics.growth.follows = parseNumber(followsMatch[1]);
    if (unfollowsMatch) metrics.growth.unfollows = parseNumber(unfollowsMatch[1]);
  }

  // === DATE RANGE (e.g. "Jan 1 - Jan 30" or "Last 30 days") ===
  const parsedDateRange = extractDateRange(text);
  if (parsedDateRange) {
    metrics.dateRange = parsedDateRange;
  }

  return metrics;
}

function extractDateRange(text) {
  const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const monthAbbrev = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
  const monthFull = 'January|February|March|April|May|June|July|August|September|October|November|December';
  const explicitRange = normalized.match(
    new RegExp(`\\b(${monthAbbrev}|${monthFull})[a-z]*\\s+\\d{1,2}\\s*[-–]\\s*(${monthAbbrev}|${monthFull})[a-z]*\\s+\\d{1,2}(?:\\s*,\\s*\\d{4})?`, 'i')
  );
  if (explicitRange) {
    return explicitRange[0].trim();
  }
  const lastDaysMatch = normalized.match(/\bLast\s+(\d+)\s+days?\b/i);
  if (lastDaysMatch) {
    const n = parseInt(lastDaysMatch[1], 10);
    if (n >= 1 && n <= 365) {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - n + 1);
      const fmt = (d) => {
        const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
        return `${m} ${d.getDate()}`;
      };
      const year = end.getFullYear();
      const sameYear = start.getFullYear() === year;
      return sameYear
        ? `${fmt(start)} - ${fmt(end)}, ${year}`
        : `${fmt(start)}, ${start.getFullYear()} - ${fmt(end)}, ${year}`;
    }
  }
  return null;
}

function getGenderSection(text) {
  const low = text.toLowerCase();
  const genderIdx = low.indexOf('gender');
  const audienceIdx = low.indexOf('audience');
  const start = genderIdx >= 0 ? (audienceIdx >= 0 ? Math.min(genderIdx, audienceIdx) : genderIdx)
    : audienceIdx >= 0 ? audienceIdx : 0;
  return text.slice(start, start + 500);
}

function getLocationsSection(text) {
  const low = text.toLowerCase();
  const candidates = [
    low.indexOf('top cities'),
    low.indexOf('top locations'),
    low.indexOf('cities'),
    low.indexOf('locations'),
    low.indexOf('where your followers')
  ].filter(i => i >= 0);
  if (candidates.length === 0) return text;
  const start = Math.min(...candidates);
  let chunk = text.slice(start, start + 1200);
  const endMarkers = ['age range', 'gender', 'by content type'];
  for (const marker of endMarkers) {
    const idx = chunk.toLowerCase().indexOf(marker);
    if (idx > 80) chunk = chunk.slice(0, idx);
  }
  return chunk;
}

function parseNumber(str) {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// ============================================================================
// ERROR REPORT EMAIL NOTIFICATION
// ============================================================================

/**
 * Send email notification when an error report is created
 * Triggers automatically when a new document is added to error_reports collection
 */
exports.sendErrorReportEmail = onDocumentCreated(
  {
    document: 'error_reports/{reportId}',
    region: 'us-central1',
    secrets: ['EMAIL_PASS'],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data in error report');
      return;
    }

    const report = snapshot.data();
    const reportId = event.params.reportId;

    console.log('📧 Sending error report email for:', reportId);

    // Create email transporter using Gmail
    // Note: You need to set these environment variables using:
    // firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-app-password"
    // Or use Firebase v2 secrets
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'jrsschroeder@gmail.com',
        pass: process.env.EMAIL_PASS || '', // App password required
      },
    });

    // Format console logs for email
    const consoleLogs = report.consoleLogsText || 'No console logs captured';
    
    // Build email content
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff3b30, #ff9500); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Error Report</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Luxury Listings Portal</p>
        </div>
        
        <div style="background: #f5f5f7; padding: 20px; border-radius: 0 0 12px 12px;">
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #ff3b30; margin: 0 0 10px 0;">Error Message</h3>
            <p style="color: #1d1d1f; margin: 0; font-family: monospace; background: #f5f5f7; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${report.errorMessage || 'Unknown error'}
            </p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">User Info</h3>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${report.userEmail || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${report.userName || 'Unknown'}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">System Info</h3>
            <p style="margin: 5px 0;"><strong>URL:</strong> ${report.url || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${report.errorTimestamp || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Browser:</strong> ${report.userAgent || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Screen:</strong> ${report.screenSize || 'Unknown'}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">Stack Trace</h3>
            <pre style="color: #86868b; margin: 0; font-size: 11px; background: #1d1d1f; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">
${report.errorStack || 'No stack trace'}
            </pre>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">Console Logs (Last 50)</h3>
            <pre style="color: #86868b; margin: 0; font-size: 10px; background: #1d1d1f; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto;">
${consoleLogs.substring(0, 5000)}
            </pre>
          </div>
          
          <p style="color: #86868b; font-size: 12px; text-align: center; margin-top: 20px;">
            Report ID: ${reportId}
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: '"Luxury Listings Portal" <jrsschroeder@gmail.com>',
      to: 'jrsschroeder@gmail.com',
      subject: `🚨 Error Report: ${(report.errorMessage || 'Unknown error').substring(0, 50)}`,
      html: emailHtml,
    };

    try {
      // Only send if email credentials are configured
      if (process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log('✅ Error report email sent successfully');
      } else {
        console.log('⚠️ Email not sent - EMAIL_PASS not configured');
        console.log('📋 Error report stored in Firestore:', reportId);
      }
    } catch (error) {
      console.error('❌ Failed to send error report email:', error);
      // Don't throw - we still want the report saved in Firestore
    }
  }
);

// ============================================================================
// FEEDBACK (BUG REPORTS & FEATURE REQUESTS) EMAIL NOTIFICATION
// ============================================================================

/**
 * Send email notification when feedback (bug report or feature request) is created
 * Triggers automatically when a new document is added to feedback collection
 */
exports.sendFeedbackEmail = onDocumentCreated(
  {
    document: 'feedback/{feedbackId}',
    region: 'us-central1',
    secrets: ['EMAIL_PASS'],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data in feedback');
      return;
    }

    const feedback = snapshot.data();
    const feedbackId = event.params.feedbackId;

    console.log(`📧 Sending ${feedback.type} email for:`, feedbackId);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'jrsschroeder@gmail.com',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    const isBug = feedback.type === 'bug';
    const headerColor = isBug ? '#ff3b30' : '#ff9500';
    const emoji = isBug ? '🐛' : '💡';
    const typeLabel = isBug ? 'Bug Report' : 'Feature Request';

    // Format console logs if available (bug reports only)
    const consoleLogs = feedback.consoleLogs 
      ? feedback.consoleLogs.slice(-50).map(log => `[${log.type}] ${log.message}`).join('\n')
      : 'N/A';

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${headerColor}; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${emoji} ${typeLabel}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Luxury Listings Portal</p>
        </div>
        
        <div style="background: #f5f5f7; padding: 20px; border-radius: 0 0 12px 12px;">
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: ${headerColor}; margin: 0 0 10px 0;">${feedback.title || 'No title'}</h3>
            <p style="color: #1d1d1f; margin: 0; white-space: pre-wrap;">${feedback.description || 'No description'}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">Submitted By</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${feedback.userName || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${feedback.userEmail || 'Unknown'}</p>
            ${isBug ? `<p style="margin: 5px 0;"><strong>Priority:</strong> ${feedback.priority || 'medium'}</p>` : ''}
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">Context</h3>
            <p style="margin: 5px 0;"><strong>URL:</strong> ${feedback.url || 'Unknown'}</p>
            ${feedback.selectedElement ? `<p style="margin: 5px 0;"><strong>Selected Element:</strong> &lt;${feedback.selectedElement.tagName?.toLowerCase()}&gt;</p>` : ''}
          </div>
          
          ${isBug && feedback.consoleLogs ? `
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">Console Logs (Last 50)</h3>
            <pre style="color: #86868b; margin: 0; font-size: 10px; background: #1d1d1f; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto;">${consoleLogs}</pre>
          </div>
          ` : ''}
          
          <p style="color: #86868b; font-size: 12px; text-align: center; margin-top: 20px;">
            ID: ${feedbackId} • <a href="https://smmluxurylistings.com/admin/feedback" style="color: #0071e3;">View in Admin</a>
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: '"Luxury Listings Portal" <jrsschroeder@gmail.com>',
      to: 'jrsschroeder@gmail.com',
      subject: `${emoji} ${typeLabel}: ${(feedback.title || 'No title').substring(0, 50)}`,
      html: emailHtml,
    };

    try {
      if (process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`✅ ${typeLabel} email sent successfully`);
      } else {
        console.log('⚠️ Email not sent - EMAIL_PASS not configured');
      }
    } catch (error) {
      console.error(`❌ Failed to send ${typeLabel} email:`, error);
    }
  }
);

// ============================================================================
// FEEDBACK CHAT EMAIL NOTIFICATION
// ============================================================================

/**
 * Send email notification when a new chat is started
 * Triggers automatically when a new document is added to feedback_chats collection
 */
exports.sendFeedbackChatEmail = onDocumentCreated(
  {
    document: 'feedback_chats/{chatId}',
    region: 'us-central1',
    secrets: ['EMAIL_PASS'],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data in chat');
      return;
    }

    const chat = snapshot.data();
    const chatId = event.params.chatId;

    console.log('📧 Sending new chat email for:', chatId);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'jrsschroeder@gmail.com',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    const firstMessage = chat.messages?.[0]?.message || chat.lastMessage || 'No message';

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0071e3, #5856d6); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Chat Started</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Luxury Listings Portal</p>
        </div>
        
        <div style="background: #f5f5f7; padding: 20px; border-radius: 0 0 12px 12px;">
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #0071e3; margin: 0 0 10px 0;">Message</h3>
            <p style="color: #1d1d1f; margin: 0; white-space: pre-wrap; font-size: 14px;">${firstMessage}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="color: #1d1d1f; margin: 0 0 10px 0;">From</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${chat.userName || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${chat.userEmail || 'Unknown'}</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://smmluxurylistings.com/admin/chats" 
               style="display: inline-block; background: #0071e3; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              Reply to Chat
            </a>
          </div>
          
          <p style="color: #86868b; font-size: 12px; text-align: center; margin-top: 20px;">
            Chat ID: ${chatId}
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: '"Luxury Listings Portal" <jrsschroeder@gmail.com>',
      to: 'jrsschroeder@gmail.com',
      subject: `💬 New Chat from ${chat.userName || chat.userEmail || 'User'}`,
      html: emailHtml,
    };

    try {
      if (process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log('✅ Chat notification email sent successfully');
      } else {
        console.log('⚠️ Email not sent - EMAIL_PASS not configured');
      }
    } catch (error) {
      console.error('❌ Failed to send chat notification email:', error);
    }
  }
);

// ============================================================================
// TIME OFF REQUEST EMAIL TO ADMINS
// ============================================================================

/**
 * Send email to all time off admins when a new leave request is submitted.
 * Triggers when a document is created in leave_requests (status pending).
 */
exports.sendTimeOffRequestEmail = onDocumentCreated(
  {
    document: 'leave_requests/{requestId}',
    region: 'us-central1',
    secrets: ['EMAIL_PASS'],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const request = snapshot.data();
    const requestId = event.params.requestId;

    if (request.status !== 'pending') return;

    const db = admin.firestore();
    // Only Michelle and Matthew get leave request emails (and in-app is filtered client-side)
    const LEAVE_REQUEST_EMAIL_TO = ['michelle@luxury-listings.com', 'matthew@luxury-listings.com'].map(e => e.toLowerCase());
    const adminEmails = LEAVE_REQUEST_EMAIL_TO;
    if (adminEmails.length === 0) {
      console.log('📧 No leave request email recipients configured');
      return;
    }

    const employeeName = request.employeeName || request.employeeEmail || 'An employee';
    const days = request.days != null ? request.days : '?';
    const leaveType = (request.type || 'time off').replace(/^\w/, c => c.toUpperCase());
    const startDate = request.startDate || '—';
    const endDate = request.endDate || '—';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'jrsschroeder@gmail.com',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0071e3, #0077ed); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📅 New Time Off Request</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Luxury Listings Portal</p>
        </div>
        <div style="background: #f5f5f7; padding: 20px; border-radius: 0 0 12px 12px;">
          <p style="color: #1d1d1f; margin: 0 0 12px 0;">${employeeName} submitted a time off request.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Type:</strong> ${leaveType}</p>
            <p style="margin: 5px 0;"><strong>Days:</strong> ${days}</p>
            <p style="margin: 5px 0;"><strong>Start:</strong> ${startDate}</p>
            <p style="margin: 5px 0;"><strong>End:</strong> ${endDate}</p>
          </div>
          <p style="margin: 0;"><a href="https://luxury-listings-portal.web.app/hr-calendar" style="color: #0071e3;">Open HR Calendar to approve or reject →</a></p>
        </div>
      </div>
    `;

    const subject = `📅 Time off request: ${employeeName} – ${leaveType} (${days} days)`;

    try {
      if (!process.env.EMAIL_PASS) {
        console.log('⚠️ Time off admin email not sent – EMAIL_PASS not configured');
        return;
      }
      await Promise.all(adminEmails.map(to =>
        transporter.sendMail({
          from: '"Luxury Listings Portal" <jrsschroeder@gmail.com>',
          to,
          subject,
          html: emailHtml,
        })
      ));
      console.log('✅ Time off request email sent to', adminEmails.length, 'admin(s)');
    } catch (error) {
      console.error('❌ Failed to send time off request email:', error);
    }
  }
);

/**
 * When an approved leave request is updated (admin edit), email the requester.
 */
const LEAVE_EDIT_FIELDS = ['startDate', 'endDate', 'days', 'type', 'reason', 'notes', 'managerNotes'];
exports.sendLeaveRequestEditedEmail = onDocumentUpdated(
  {
    document: 'leave_requests/{requestId}',
    region: 'us-central1',
    secrets: ['EMAIL_PASS'],
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const requestId = event.params.requestId;

    if (after.status !== 'approved') return;
    const changed = LEAVE_EDIT_FIELDS.some((f) => before[f] !== after[f]);
    if (!changed) return;

    const to = after.employeeEmail;
    if (!to) return;

    const employeeName = after.employeeName || to;
    const editedBy = (after.history && Array.isArray(after.history)) ? (after.history[after.history.length - 1]?.by || 'An administrator') : 'An administrator';
    const days = after.days != null ? after.days : '?';
    const leaveType = (after.type || 'time off').replace(/^\w/, (c) => c.toUpperCase());
    const startDate = after.startDate || '—';
    const endDate = after.endDate || '—';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'jrsschroeder@gmail.com',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff9500, #ff6b00); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 Leave Request Updated</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Luxury Listings Portal</p>
        </div>
        <div style="background: #f5f5f7; padding: 20px; border-radius: 0 0 12px 12px;">
          <p style="color: #1d1d1f; margin: 0 0 12px 0;">Your approved leave request was updated by ${editedBy}.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Type:</strong> ${leaveType}</p>
            <p style="margin: 5px 0;"><strong>Days:</strong> ${days}</p>
            <p style="margin: 5px 0;"><strong>Start:</strong> ${startDate}</p>
            <p style="margin: 5px 0;"><strong>End:</strong> ${endDate}</p>
          </div>
          <p style="margin: 0;"><a href="https://luxury-listings-portal.web.app/my-time-off" style="color: #0071e3;">View your time off →</a></p>
        </div>
      </div>
    `;

    const subject = `📝 Your leave request was updated – ${leaveType} (${days} days)`;
    try {
      if (!process.env.EMAIL_PASS) return;
      await transporter.sendMail({
        from: '"Luxury Listings Portal" <jrsschroeder@gmail.com>',
        to,
        subject,
        html: emailHtml,
      });
      console.log('✅ Leave request edited email sent to requester:', to);
    } catch (error) {
      console.error('❌ Failed to send leave request edited email:', error);
    }
  }
);

// ============================================================================
// SLACK API PROXY
// ============================================================================

/**
 * Proxy requests to Slack API to bypass CORS restrictions
 * Supports all Slack Web API methods
 * 
 * Usage: POST/GET to this function with:
 * - endpoint: The Slack API endpoint (e.g., 'conversations.list')
 * - token: Slack OAuth token (passed in Authorization header or body)
 * - body: Optional request body for POST requests
 */
exports.slackProxy = onRequest({
  cors: true,
  maxInstances: 10,
  secrets: ['SLACK_TOKEN'],
}, async (req, res) => {
  // Get Slack token from environment or request
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || 
                process.env.SLACK_TOKEN ||
                req.body?.token;

  if (!token) {
    res.status(401).json({ 
      ok: false, 
      error: 'Slack token not provided. Set SLACK_TOKEN secret or pass in Authorization header.' 
    });
    return;
  }

  // Get the Slack endpoint from the URL path or query
  // e.g., /slackProxy/conversations.list or ?endpoint=conversations.list
  const pathParts = req.path.split('/').filter(Boolean);
  const endpoint = pathParts[0] || req.query.endpoint || req.body?.endpoint;

  if (!endpoint) {
    res.status(400).json({ 
      ok: false, 
      error: 'No Slack API endpoint specified. Use path (e.g., /slackProxy/conversations.list) or ?endpoint=...' 
    });
    return;
  }

  const slackUrl = `https://slack.com/api/${endpoint}`;
  
  console.log(`🔄 Slack Proxy: ${req.method} ${endpoint}`);

  try {
    const fetchOptions = {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    };

    // For POST requests, forward the body (excluding our proxy-specific fields)
    if (req.method === 'POST' && req.body) {
      const { endpoint: _, token: __, ...slackBody } = req.body;
      if (Object.keys(slackBody).length > 0) {
        fetchOptions.body = JSON.stringify(slackBody);
      }
    }

    // For GET requests, forward query params (excluding our proxy-specific ones)
    let finalUrl = slackUrl;
    if (req.method === 'GET' && req.query) {
      const { endpoint: _, ...slackParams } = req.query;
      const queryString = new URLSearchParams(slackParams).toString();
      if (queryString) {
        finalUrl = `${slackUrl}?${queryString}`;
      }
    }

    const response = await fetch(finalUrl, fetchOptions);
    const data = await response.json();

    // Log success/failure
    if (data.ok) {
      console.log(`✅ Slack ${endpoint}: Success`);
    } else {
      console.log(`⚠️ Slack ${endpoint}: ${data.error}`);
    }

    res.json(data);
  } catch (error) {
    console.error(`❌ Slack proxy error for ${endpoint}:`, error);
    res.status(500).json({ 
      ok: false, 
      error: `Proxy error: ${error.message}` 
    });
  }
});

// ============================================================================
// SLACK OAUTH TOKEN EXCHANGE
// ============================================================================

/**
 * Exchange Slack OAuth authorization code for access token
 * This keeps the client_secret secure on the server side
 */
exports.slackOAuthExchange = onRequest({
  cors: true,
  maxInstances: 10,
  secrets: ['SLACK_CLIENT_SECRET'],
}, async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { code, redirect_uri } = req.body;
  const clientId = process.env.REACT_APP_SLACK_CLIENT_ID || req.body.client_id;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!code) {
    res.status(400).json({ ok: false, error: 'Authorization code is required' });
    return;
  }

  if (!clientSecret) {
    console.error('❌ SLACK_CLIENT_SECRET not configured');
    res.status(500).json({ ok: false, error: 'Server configuration error' });
    return;
  }

  console.log('🔄 Exchanging Slack OAuth code for token...');

  try {
    // Exchange code for token using Slack's OAuth endpoint
    const tokenUrl = 'https://slack.com/api/oauth.v2.access';
    
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirect_uri || ''
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Slack OAuth error:', data.error);
      res.status(400).json({ ok: false, error: data.error });
      return;
    }

    console.log('✅ Slack OAuth token obtained for team:', data.team?.name);

    // Return the token data (but not the refresh token if any)
    res.json({
      ok: true,
      authed_user: data.authed_user,
      team: data.team,
      enterprise: data.enterprise,
      is_enterprise_install: data.is_enterprise_install
    });

  } catch (error) {
    console.error('❌ Slack OAuth exchange error:', error);
    res.status(500).json({ 
      ok: false, 
      error: `OAuth exchange failed: ${error.message}` 
    });
  }
});

// ============================================================================
// CANVA TEMPLATE SYNC
// ============================================================================

/**
 * Receive template structure from Canva App and store in Firestore
 * Called by the LL Template Sync Canva app when designer clicks "Sync"
 */
exports.syncCanvaTemplate = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const db = admin.firestore();

  try {
    const {
      client_name,
      template_name,
      template_type,
      canva_design_id,
      elements,
      placeholders,
      synced_at,
    } = req.body;

    // Validate required fields
    if (!client_name || !template_name || !template_type) {
      res.status(400).json({
        error: 'Missing required fields: client_name, template_name, template_type',
      });
      return;
    }

    console.log(`📥 Syncing Canva template: ${template_name} for ${client_name}`);

    // Look up client by name
    let client_id = null;
    const clientsSnapshot = await db.collection('clients')
      .where('clientName', '==', client_name)
      .limit(1)
      .get();

    if (!clientsSnapshot.empty) {
      client_id = clientsSnapshot.docs[0].id;
      console.log(`✅ Found client: ${client_id}`);
    } else {
      console.log(`⚠️ Client not found: ${client_name}`);
    }

    // Determine dimensions based on template type
    const dimensionMap = {
      'instagram_feed': { width: 1080, height: 1080 },
      'instagram_story': { width: 1080, height: 1920 },
      'instagram_reel_cover': { width: 1080, height: 1920 },
      'facebook_post': { width: 1200, height: 630 },
      'facebook_cover': { width: 820, height: 312 },
      'linkedin_post': { width: 1200, height: 627 },
      'twitter_post': { width: 1600, height: 900 },
    };

    // Create template document
    const templateData = {
      client_id: client_id,
      client_name: client_name,
      template_name: template_name,
      template_type: template_type,
      canva_design_id: canva_design_id || null,
      dimensions: dimensionMap[template_type] || { width: 1080, height: 1080 },
      elements: elements || [],
      placeholders: placeholders || [],
      version: 1,
      is_active: true,
      synced_at: admin.firestore.Timestamp.fromDate(new Date(synced_at || Date.now())),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Check if template already exists for this client + type
    const existingQuery = await db.collection('client_templates')
      .where('client_name', '==', client_name)
      .where('template_type', '==', template_type)
      .limit(1)
      .get();

    let templateId;
    if (!existingQuery.empty) {
      // Update existing template
      templateId = existingQuery.docs[0].id;
      const existingData = existingQuery.docs[0].data();
      
      await db.collection('client_templates').doc(templateId).update({
        ...templateData,
        version: (existingData.version || 0) + 1,
        created_at: existingData.created_at, // Preserve original creation time
      });
      
      console.log(`✅ Updated existing template: ${templateId} (v${(existingData.version || 0) + 1})`);
    } else {
      // Create new template
      const docRef = await db.collection('client_templates').add(templateData);
      templateId = docRef.id;
      
      console.log(`✅ Created new template: ${templateId}`);
    }

    // Return success
    res.json({
      success: true,
      template_id: templateId,
      client_id: client_id,
      message: `Template "${template_name}" synced successfully`,
      placeholders_found: placeholders?.length || 0,
      elements_count: elements?.length || 0,
    });

  } catch (error) {
    console.error('❌ Canva template sync error:', error);
    res.status(500).json({
      error: `Sync failed: ${error.message}`,
    });
  }
});

// ============================================================================
// AUTH: email_lower CUSTOM CLAIM (for task_templates shared case-insensitive read)
// ============================================================================

/** Set email_lower custom claim so Firestore rules can match sharedWith (stored lowercase). */
async function setEmailLowerClaim(uid, email) {
  if (!email) return;
  const user = await admin.auth().getUser(uid);
  const next = { ...(user.customClaims || {}), email_lower: String(email).toLowerCase().trim() };
  await admin.auth().setCustomUserClaims(uid, next);
}

/** Callable: ensure current user has email_lower claim (for existing users). */
exports.ensureEmailLowerClaim = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
  await setEmailLowerClaim(request.auth.uid, request.auth.token.email);
  return { ok: true };
});

/** New users get email_lower claim on create. */
exports.setEmailLowerClaimOnCreate = authV1.user().onCreate(async (user) => {
  await setEmailLowerClaim(user.uid, user.email);
});

// ========== CONTENT CALENDAR POST-DUE REMINDERS ==========
/** Vancouver today as YYYY-MM-DD (for scheduledDate comparison). */
function getVancouverTodayDateString() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(now);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

// ============================================================================
// SERVER-SIDE PERMISSION ENFORCEMENT
// ============================================================================

/** Bootstrap admin email (Firestore rules also have this as fallback). */
const BOOTSTRAP_ADMIN_EMAIL = 'jrsschroeder@gmail.com';

/**
 * Helper: Check if a user is a system admin (reads system_config/admins).
 */
async function isServerAdmin(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (lower === BOOTSTRAP_ADMIN_EMAIL) return true;
  try {
    const adminDoc = await admin.firestore().doc('system_config/admins').get();
    if (adminDoc.exists) {
      const emails = adminDoc.data().emails || [];
      return emails.map(e => e.toLowerCase()).includes(lower);
    }
  } catch (_) { /* fall through */ }
  return false;
}

/**
 * Helper: Get user's role and permissions from approved_users.
 */
async function getUserPermissions(email) {
  if (!email) return null;
  const lower = email.toLowerCase().trim();
  const doc = await admin.firestore().doc(`approved_users/${lower}`).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    role: data.role || 'pending',
    roles: data.roles || [data.role || 'pending'],
    pagePermissions: data.pagePermissions || [],
    featurePermissions: data.featurePermissions || [],
    customPermissions: data.customPermissions || [],
    adminPermissions: !!data.adminPermissions,
    isApproved: !!data.isApproved,
  };
}

/**
 * Helper: Write an audit log entry.
 */
async function writeAuditLog({ action, actorEmail, targetEmail, details, collection: collectionName }) {
  try {
    await admin.firestore().collection('audit_log').add({
      action,
      actorEmail: actorEmail || 'system',
      targetEmail: targetEmail || null,
      collection: collectionName || null,
      details: details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Audit log write failed:', error.message);
  }
}

/**
 * Callable: Validate permission server-side before a sensitive write.
 * Used by the client as a pre-check before Firestore direct writes.
 *
 * Params: { action: string, targetCollection: string, targetId?: string }
 * Returns: { allowed: boolean, reason?: string }
 */
exports.validatePermission = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const email = request.auth.token.email;
  const { action, targetCollection } = request.data || {};

  if (!action || !targetCollection) {
    throw new HttpsError('invalid-argument', 'action and targetCollection are required');
  }

  // Admin bypass
  if (await isServerAdmin(email)) {
    return { allowed: true, role: 'admin' };
  }

  const perms = await getUserPermissions(email);
  if (!perms || !perms.isApproved) {
    return { allowed: false, reason: 'User is not approved' };
  }

  // Permission matrix: collection → required roles/features
  const WRITE_RULES = {
    clients: {
      roles: ['admin', 'director', 'content_director', 'social_media_manager', 'sales_manager'],
      features: ['manage_clients'],
    },
    client_contracts: {
      roles: ['admin', 'director', 'content_director', 'social_media_manager', 'sales_manager'],
      features: ['manage_clients'],
    },
    pending_clients: {
      roles: ['admin', 'director', 'content_director', 'social_media_manager', 'sales_manager'],
      features: ['manage_clients'],
    },
    leave_requests: {
      roles: ['admin', 'hr_manager'],
      features: ['approve_time_off'],
      // Note: users can create their own, but approve/update-others requires these
      allowOwnCreate: true,
    },
    approved_users: {
      roles: ['admin'],
      features: ['manage_users'],
    },
  };

  const rules = WRITE_RULES[targetCollection];
  if (!rules) {
    // No specific rules - allow if authenticated and approved
    return { allowed: true };
  }

  // Check role
  if (rules.roles && rules.roles.includes(perms.role)) {
    return { allowed: true };
  }

  // Check feature permissions
  if (rules.features) {
    const hasFeature = rules.features.some(f =>
      perms.featurePermissions.includes(f) ||
      perms.customPermissions.includes(f)
    );
    if (hasFeature) return { allowed: true };
  }

  // Check adminPermissions flag
  if (perms.adminPermissions) {
    const adminFeatures = ['approve_time_off', 'view_analytics', 'manage_clients', 'assign_client_managers', 'edit_client_packages'];
    if (rules.features && rules.features.some(f => adminFeatures.includes(f))) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: `Role '${perms.role}' does not have write access to '${targetCollection}'` };
});

/**
 * Callable: Update user permissions (admin-only).
 * Server-side enforcement ensures only admins can change permissions.
 *
 * Params: { targetEmail: string, pages?: string[], features?: string[], adminPermissions?: boolean, role?: string }
 */
exports.updateUserPermissions = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const actorEmail = request.auth.token.email;
  if (!(await isServerAdmin(actorEmail))) {
    throw new HttpsError('permission-denied', 'Only system administrators can modify permissions');
  }

  const { targetEmail, pages, features, adminPermissions, role } = request.data || {};
  if (!targetEmail) {
    throw new HttpsError('invalid-argument', 'targetEmail is required');
  }

  const db = admin.firestore();
  const normalizedEmail = targetEmail.toLowerCase().trim();
  const userRef = db.doc(`approved_users/${normalizedEmail}`);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError('not-found', `User ${normalizedEmail} not found`);
  }

  const previousData = userSnap.data();
  const updates = { permissionsUpdatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (pages !== undefined) updates.pagePermissions = pages;
  if (features !== undefined) updates.featurePermissions = features;
  if (adminPermissions !== undefined) updates.adminPermissions = !!adminPermissions;
  if (role !== undefined) {
    updates.role = role;
    updates.primaryRole = role;
    updates.roles = [role];
  }

  await userRef.update(updates);

  // Audit log
  await writeAuditLog({
    action: 'permissions_updated',
    actorEmail,
    targetEmail: normalizedEmail,
    collection: 'approved_users',
    details: {
      previousRole: previousData.role,
      previousPages: previousData.pagePermissions || [],
      previousFeatures: previousData.featurePermissions || [],
      newRole: updates.role || previousData.role,
      newPages: updates.pagePermissions || previousData.pagePermissions || [],
      newFeatures: updates.featurePermissions || previousData.featurePermissions || [],
      adminPermissions: updates.adminPermissions !== undefined ? updates.adminPermissions : previousData.adminPermissions,
    },
  });

  return { ok: true, email: normalizedEmail };
});

// ============================================================================
// AUDIT LOG TRIGGERS
// ============================================================================

/**
 * Trigger: Log when a user is added to approved_users.
 */
exports.auditUserApproved = onDocumentCreated('approved_users/{userEmail}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await writeAuditLog({
    action: 'user_approved',
    actorEmail: data.approvedBy || 'system',
    targetEmail: event.params.userEmail,
    collection: 'approved_users',
    details: { role: data.role, roles: data.roles },
  });
});

/**
 * Trigger: Log when a client is created.
 */
exports.auditClientCreated = onDocumentCreated('clients/{clientId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  await writeAuditLog({
    action: 'client_created',
    actorEmail: data.createdBy || data.assignedManager || 'unknown',
    collection: 'clients',
    details: { clientName: data.clientName || data.name, clientId: event.params.clientId },
  });
});

/**
 * Trigger: Log when a leave request status changes (approval/rejection).
 */
exports.auditLeaveRequestUpdated = onDocumentUpdated('leave_requests/{requestId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;

  // Only log status changes
  if (before.status !== after.status) {
    await writeAuditLog({
      action: 'leave_request_status_changed',
      actorEmail: after.approvedBy || after.updatedBy || 'unknown',
      targetEmail: after.userEmail,
      collection: 'leave_requests',
      details: {
        requestId: event.params.requestId,
        previousStatus: before.status,
        newStatus: after.status,
        reason: after.rejectionReason || null,
      },
    });
  }
});

/**
 * Trigger: Log when user permissions change in approved_users.
 */
exports.auditPermissionsChanged = onDocumentUpdated('approved_users/{userEmail}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;

  // Check if any permission-related fields changed
  const permFields = ['role', 'roles', 'primaryRole', 'pagePermissions', 'featurePermissions', 'adminPermissions', 'customPermissions'];
  const changed = permFields.some(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]));

  if (changed) {
    await writeAuditLog({
      action: 'user_permissions_changed',
      actorEmail: 'permissions_manager', // Will be overridden by updateUserPermissions if called via Cloud Function
      targetEmail: event.params.userEmail,
      collection: 'approved_users',
      details: {
        changedFields: permFields.filter(f => JSON.stringify(before[f]) !== JSON.stringify(after[f])),
        before: Object.fromEntries(permFields.map(f => [f, before[f]])),
        after: Object.fromEntries(permFields.map(f => [f, after[f]])),
      },
    });
  }
});

// ============================================================================
// CONTENT APPROVAL WORKFLOW
// ============================================================================

/**
 * Content status workflow:
 *   draft → internal_review → client_review → approved → scheduled → published
 *
 * Trigger: When a content_item status changes, create notifications for approvers.
 */
exports.contentApprovalNotification = onDocumentUpdated('content_items/{itemId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  if (before.status === after.status) return; // No status change

  const db = admin.firestore();
  const itemId = event.params.itemId;
  const title = (after.title || 'Content item').slice(0, 50);

  // Status transition notifications
  const notifications = [];

  if (after.status === 'internal_review') {
    // Notify content directors and admins for internal review
    const approvers = await db.collection('approved_users')
      .where('role', 'in', ['admin', 'content_director', 'director'])
      .get();
    approvers.docs.forEach(doc => {
      const approverEmail = doc.data().email || doc.id;
      if (approverEmail !== after.userEmail) { // Don't notify the creator
        notifications.push({
          userEmail: approverEmail,
          type: 'content_review',
          title: 'Content needs review',
          message: `"${title}" has been submitted for internal review.`,
          link: `/content-calendar`,
          contentItemId: itemId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });
  }

  if (after.status === 'approved') {
    // Notify the creator that content was approved
    notifications.push({
      userEmail: after.userEmail,
      type: 'content_approved',
      title: 'Content approved',
      message: `"${title}" has been approved and is ready to schedule.`,
      link: `/content-calendar`,
      contentItemId: itemId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  if (after.status === 'rejected') {
    // Notify the creator that content was rejected
    notifications.push({
      userEmail: after.userEmail,
      type: 'content_rejected',
      title: 'Content needs revision',
      message: `"${title}" needs changes: ${after.reviewNotes || 'See notes.'}`,
      link: `/content-calendar`,
      contentItemId: itemId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Write all notifications in batch
  if (notifications.length > 0) {
    const batch = db.batch();
    notifications.forEach(n => {
      batch.set(db.collection('notifications').doc(), n);
    });
    await batch.commit();
    console.log(`Content approval: sent ${notifications.length} notification(s) for item ${itemId}`);
  }

  // Audit log the status change
  await writeAuditLog({
    action: 'content_status_changed',
    actorEmail: after.reviewedBy || after.userEmail || 'unknown',
    collection: 'content_items',
    details: {
      itemId,
      title,
      previousStatus: before.status,
      newStatus: after.status,
      reviewNotes: after.reviewNotes || null,
    },
  });
});

// ============================================================================
// CONTENT CALENDAR POST-DUE REMINDERS
// ============================================================================

/** Every 15 minutes: find content_items due today (Vancouver), create notification, mark reminderSent. */
exports.contentCalendarPostDueReminders = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'America/Vancouver' },
  async () => {
    const db = admin.firestore();
    const todayStr = getVancouverTodayDateString();
    const snapshot = await db.collection('content_items')
      .where('scheduledDate', '==', todayStr)
      .where('status', '==', 'scheduled')
      .get();
    let sent = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.reminderSent === true) continue;
      const userEmail = data.userEmail;
      if (!userEmail) continue;
      const title = (data.title || 'Post').slice(0, 50);
      await db.collection('notifications').add({
        userEmail,
        type: 'post_due',
        title: 'Post due today',
        message: `"${title}" is scheduled for today. Open the app to copy the caption and post.`,
        link: `/content-calendar/post-due/${doc.id}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await doc.ref.update({
        reminderSent: true,
        reminderSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
      sent++;
    }
    if (sent > 0) {
      console.log('Content calendar: sent', sent, 'post-due reminder(s) for', todayStr);
    }
  }
);
