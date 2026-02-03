/**
 * Firebase Cloud Functions for Instagram OCR and Slack Integration
 * Uses Google Cloud Vision API for fast, accurate text extraction
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');
const nodemailer = require('nodemailer');

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
