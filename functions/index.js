/**
 * Firebase Cloud Functions for Instagram OCR
 * Uses Google Cloud Vision API for fast, accurate text extraction
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Vision client
const visionClient = new vision.ImageAnnotatorClient();

/**
 * Extract text from an image using Google Cloud Vision
 * Much faster than browser-based Tesseract.js (~1-2 seconds vs 10-15 seconds per image)
 */
exports.extractTextFromImage = onCall({
  cors: true,
  maxInstances: 10,
}, async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
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
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { images } = request.data;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new HttpsError('invalid-argument', 'images array is required');
  }

  console.log(`Processing ${images.length} screenshots for user ${request.auth.uid}`);
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

  // === FOLLOWER PERCENTAGE ===
  const followerPercentMatch = text.match(/Followers?\s*[\n\s]*([0-9.]+)%/i);
  if (followerPercentMatch) {
    metrics.viewsFollowerPercent = parseFloat(followerPercentMatch[1]);
  }

  // === NON-FOLLOWERS PERCENTAGE ===
  const nonFollowerMatch = text.match(/Non[- ]?followers?\s*[\n\s]*([0-9.]+)%/i);
  if (nonFollowerMatch) {
    metrics.nonFollowerPercent = parseFloat(nonFollowerMatch[1]);
  }

  // === INTERACTIONS ===
  const interactionsMatch = text.match(/Interactions?\s*[\n\s]*([0-9,]+)/i) ||
                            text.match(/([0-9,]+)\s*Interactions?/i);
  if (interactionsMatch) {
    metrics.interactions = parseNumber(interactionsMatch[1]);
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

  // === CONTENT BREAKDOWN ===
  const contentBreakdown = [];
  const postsMatch = text.match(/Posts?\s*[\n\s]*([0-9.]+)%/i);
  if (postsMatch) contentBreakdown.push({ type: 'Posts', percentage: parseFloat(postsMatch[1]) });
  const storiesMatch = text.match(/Stories?\s*[\n\s]*([0-9.]+)%/i);
  if (storiesMatch) contentBreakdown.push({ type: 'Stories', percentage: parseFloat(storiesMatch[1]) });
  const reelsMatch = text.match(/Reels?\s*[\n\s]*([0-9.]+)%/i);
  if (reelsMatch) contentBreakdown.push({ type: 'Reels', percentage: parseFloat(reelsMatch[1]) });
  if (contentBreakdown.length > 0) {
    contentBreakdown.sort((a, b) => b.percentage - a.percentage);
    metrics.contentBreakdown = contentBreakdown;
  }

  // === TOP CITIES ===
  const cities = [];
  const cityPatterns = [
    'Calgary', 'Vancouver', 'Toronto', 'Montreal', 'Edmonton', 'Ottawa',
    'Burnaby', 'Surrey', 'Richmond', 'Victoria', 'Winnipeg', 'Halifax',
    'Los Angeles', 'New York', 'San Francisco', 'Chicago', 'Houston',
    'Miami', 'Seattle', 'Denver', 'Phoenix', 'Dallas', 'Austin',
    'London', 'Paris', 'Sydney', 'Melbourne', 'Dubai', 'Singapore'
  ];
  for (const city of cityPatterns) {
    const regex = new RegExp(`${city}\\s*[\\n\\s]*([0-9.]+)%`, 'i');
    const match = text.match(regex);
    if (match) cities.push({ name: city, percentage: parseFloat(match[1]) });
  }
  if (cities.length > 0) {
    cities.sort((a, b) => b.percentage - a.percentage);
    metrics.topCities = cities;
  }

  // === AGE RANGES ===
  const ageRanges = [];
  const agePatterns = [
    { pattern: /13[- ]?17\s*[\n\s]*([0-9.]+)%/i, range: '13-17' },
    { pattern: /18[- ]?24\s*[\n\s]*([0-9.]+)%/i, range: '18-24' },
    { pattern: /25[- ]?34\s*[\n\s]*([0-9.]+)%/i, range: '25-34' },
    { pattern: /35[- ]?44\s*[\n\s]*([0-9.]+)%/i, range: '35-44' },
    { pattern: /45[- ]?54\s*[\n\s]*([0-9.]+)%/i, range: '45-54' },
    { pattern: /55[- ]?64\s*[\n\s]*([0-9.]+)%/i, range: '55-64' },
    { pattern: /65\+\s*[\n\s]*([0-9.]+)%/i, range: '65+' }
  ];
  for (const { pattern, range } of agePatterns) {
    const match = text.match(pattern);
    if (match) ageRanges.push({ range, percentage: parseFloat(match[1]) });
  }
  if (ageRanges.length > 0) {
    ageRanges.sort((a, b) => b.percentage - a.percentage);
    metrics.ageRanges = ageRanges;
  }

  // === GENDER ===
  const menMatch = text.match(/Men\s*[\n\s]*([0-9.]+)%/i);
  const womenMatch = text.match(/Women\s*[\n\s]*([0-9.]+)%/i);
  if (menMatch || womenMatch) {
    metrics.gender = {
      men: menMatch ? parseFloat(menMatch[1]) : 0,
      women: womenMatch ? parseFloat(womenMatch[1]) : 0
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

  return metrics;
}

function parseNumber(str) {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}
