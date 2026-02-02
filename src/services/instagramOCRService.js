/**
 * Instagram OCR Service
 * Extracts analytics data from Instagram Insights screenshots using Tesseract.js
 * Optimized for speed with parallel processing and image compression
 */

import Tesseract from 'tesseract.js';

class InstagramOCRService {
  constructor() {
    this.workers = [];
    this.isInitialized = false;
    this.workerCount = 2; // 2 workers = less main-thread contention, still parallel
  }

  /**
   * Initialize Tesseract workers for parallel processing
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log(`🔍 Initializing ${this.workerCount} OCR workers...`);
    const startTime = Date.now();
    
    // Create workers in parallel
    const workerPromises = [];
    for (let i = 0; i < this.workerCount; i++) {
      workerPromises.push(Tesseract.createWorker('eng'));
    }
    
    this.workers = await Promise.all(workerPromises);
    this.isInitialized = true;
    
    console.log(`✅ OCR workers initialized in ${Date.now() - startTime}ms`);
  }

  /**
   * Terminate all workers when done
   */
  async terminate() {
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
    this.isInitialized = false;
    console.log('🧹 OCR workers terminated');
  }

  /**
   * Compress image for faster OCR processing (smaller = much faster Tesseract)
   * @param {File|Blob} imageFile - Original image file
   * @param {number} maxWidth - Maximum width (720px keeps labels readable, 2-3x faster OCR)
   * @returns {Promise<Blob>} Compressed image blob
   */
  async compressImage(imageFile, maxWidth = 720) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`📦 Compressed: ${(imageFile.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB`);
              resolve(blob);
            } else {
              resolve(imageFile); // Fallback to original
            }
          },
          'image/jpeg',
          0.7 // 70% quality is enough for OCR, smaller file = faster
        );
      };
      
      img.onerror = () => resolve(imageFile); // Fallback to original on error
      
      // Create object URL from file
      if (imageFile instanceof File || imageFile instanceof Blob) {
        img.src = URL.createObjectURL(imageFile);
      } else if (typeof imageFile === 'string') {
        img.src = imageFile;
      } else {
        resolve(imageFile);
      }
    });
  }

  /**
   * Extract text from an image using a specific worker
   * @param {string|File|Blob} image - Image URL, File, or Blob
   * @param {number} workerIndex - Which worker to use
   * @returns {Promise<string>} Extracted text
   */
  async extractTextWithWorker(image, workerIndex) {
    await this.initialize();
    
    const worker = this.workers[workerIndex % this.workers.length];
    // PSM 6 = single block (faster for dashboard screens); OEM 0 = legacy engine (faster than LSTM)
    const result = await worker.recognize(image, {
      tessedit_pageseg_mode: 6,
      tessedit_ocr_engine_mode: 0
    });
    
    return result.data.text;
  }

  /**
   * Parse Instagram metrics from extracted text
   * @param {string} text - Raw OCR text
   * @returns {Object} Parsed metrics object
   */
  parseInstagramMetrics(text) {
    const metrics = {};
    
    // Normalize text - replace newlines with spaces, multiple spaces with single
    const normalizedText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // === VIEWS ===
    const viewsMatch = text.match(/Views?\s*[\n\s]*([0-9,]+)/i) || 
                       text.match(/([0-9,]+)\s*Views?/i);
    if (viewsMatch) {
      metrics.views = this.parseNumber(viewsMatch[1]);
    }

    // === FOLLOWERS COUNT ===
    const followersCountMatch = text.match(/([0-9,]+)\s*Followers?(?!\s*%)/i) ||
                                text.match(/Followers?\s*[\n\s]*([0-9,]+)(?!\s*%)/i);
    if (followersCountMatch) {
      metrics.followers = this.parseNumber(followersCountMatch[1]);
    }

    // === FOLLOWER / NON-FOLLOWER % (context-aware: Views vs Interactions) ===
    // So we don't mix "94% from Interactions" with "47.1% from Views"
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
      const n = this.parseNumber(immediateInteractions[1]);
      if (n >= 1 && n <= 99999 && n !== 1 && n !== 30 && n !== 31) {
        metrics.interactions = n;
      }
    }
    // Primary: Interactions section = from "Interactions" to growth/end; find big number (standalone line or first valid number).
    const lowForInteractions = text.toLowerCase();
    const interactionsSectionStart = Math.max(lowForInteractions.indexOf('interactions'), lowForInteractions.indexOf('interacti0ns'));
    if (metrics.interactions === undefined && interactionsSectionStart >= 0) {
      const growthIdx = lowForInteractions.indexOf('growth', interactionsSectionStart + 1);
      const endByGrowth = growthIdx > interactionsSectionStart ? growthIdx : text.length;
      const sectionEnd = Math.min(text.length, interactionsSectionStart + 900, endByGrowth);
      const section = text.slice(interactionsSectionStart, sectionEnd);
      const dateFragments = new Set([1, 30, 31]);
      const has30Days = /30\s*days?/i.test(section);

      // 1) Standalone line: line that is only digits (OCR often puts the big number on its own line)
      const lines = section.split(/\r?\n/);
      for (const line of lines) {
        const standalone = line.match(/^\s*([0-9]{1,5})\s*$/);
        if (standalone) {
          const n = this.parseNumber(standalone[1]);
          if (n >= 1 && n <= 99999 && !dateFragments.has(n)) {
            metrics.interactions = n;
            break;
          }
        }
      }

      // 2) Number at end of line (e.g. "Interactions\n25" or "Something 25")
      if (metrics.interactions === undefined) {
        for (const line of lines) {
          const endNum = line.match(/\s+([0-9,]{1,5})\s*$/);
          if (endNum) {
            const n = this.parseNumber(endNum[1]);
            if (n >= 1 && n <= 99999 && !dateFragments.has(n) && !(n === 30 && has30Days)) {
              metrics.interactions = n;
              break;
            }
          }
        }
      }

      // 3) No newlines / one long line: take FIRST number in section that isn't date or % (big number usually after "Interactions" and date)
      if (metrics.interactions === undefined) {
        const numbersInOrder = [];
        const numRe = /\b([0-9,]+)\b/g;
        let m;
        while ((m = numRe.exec(section)) !== null) {
          const nextChar = section[m.index + m[0].length];
          if (nextChar === '.' || nextChar === ',' || nextChar === '%') continue;
          numbersInOrder.push(m[1]);
        }
        for (const numStr of numbersInOrder) {
          const n = this.parseNumber(numStr);
          if (n < 1 || n > 99999) continue;
          if (n === 30 && has30Days) continue;
          if (dateFragments.has(n)) continue;
          metrics.interactions = n;
          break;
        }
      }
    }
    // Fallback: block heuristic (exclude numbers that are part of percentages) — walk backward
    if (metrics.interactions === undefined && interactionsSectionStart >= 0) {
      const byContentIdx = lowForInteractions.indexOf('by content type', interactionsSectionStart + 1);
      const endAfterByContent = byContentIdx > interactionsSectionStart ? byContentIdx + 400 : text.length;
      const blockEnd = Math.min(endAfterByContent, text.length);
      const block = text.slice(interactionsSectionStart, blockEnd).slice(0, 1000);
      const numbersInBlock = [];
      const numRe = /\b([0-9,]+)\b/g;
      let m;
      while ((m = numRe.exec(block)) !== null) {
        const nextChar = block[m.index + m[0].length];
        if (nextChar === '.' || nextChar === ',' || nextChar === '%') continue;
        numbersInBlock.push(m[1]);
      }
      if (numbersInBlock.length > 0) {
        const isDateFragment = (n) => n === 1 || n === 30 || n === 31;
        const has30Days = /30\s*days?/i.test(block);
        let parsed = 0;
        for (let i = numbersInBlock.length - 1; i >= 0; i--) {
          const n = this.parseNumber(numbersInBlock[i]);
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
        const fallbackNum = this.parseNumber(interactionsMatch[1]);
        if (fallbackNum !== 1 && fallbackNum !== 30 && fallbackNum !== 31) {
          metrics.interactions = fallbackNum;
        }
      }
    }

    // === ACCOUNTS REACHED ===
    const accountsReachedMatch = text.match(/Accounts?\s*reached\s*[\n\s]*([0-9,]+)/i) ||
                                  text.match(/([0-9,]+)\s*[\n\s]*Accounts?\s*reached/i);
    if (accountsReachedMatch) {
      metrics.accountsReached = this.parseNumber(accountsReachedMatch[1]);
    }

    // === PROFILE VISITS ===
    const profileVisitsMatch = text.match(/Profile\s*visits?\s*[\n\s]*([0-9,]+)/i) ||
                               text.match(/([0-9,]+)\s*[\n\s]*Profile\s*visits?/i);
    if (profileVisitsMatch) {
      metrics.profileVisits = this.parseNumber(profileVisitsMatch[1]);
    }

    // === PROFILE VISITS CHANGE ===
    const profileVisitsChangeMatch = text.match(/Profile\s*visits?[^0-9]*([+-]?[0-9.]+%)/i) ||
                                     text.match(/([+-][0-9.]+%)\s*.*Profile/i);
    if (profileVisitsChangeMatch) {
      metrics.profileVisitsChange = profileVisitsChangeMatch[1];
    }

    // === EXTERNAL LINK TAPS ===
    const linkTapsMatch = text.match(/External\s*link\s*taps?\s*[\n\s]*([0-9,]+)/i);
    if (linkTapsMatch) {
      metrics.externalLinkTaps = this.parseNumber(linkTapsMatch[1]);
    }

    // === SAVES ===
    const savesMatch = text.match(/Saves?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Saves?/i);
    if (savesMatch) {
      metrics.saves = this.parseNumber(savesMatch[1]);
    }

    // === SHARES ===
    const sharesMatch = text.match(/Shares?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Shares?/i);
    if (sharesMatch) {
      metrics.shares = this.parseNumber(sharesMatch[1]);
    }

    // === IMPRESSIONS (total times content was seen) ===
    const impressionsMatch = text.match(/Impressions?\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Impressions?/i);
    if (impressionsMatch) {
      metrics.impressions = this.parseNumber(impressionsMatch[1]);
    }

    // === REACH (unique accounts - sometimes labeled separately) ===
    const reachMatch = text.match(/Reach\s*[\n\s]*([0-9,]+)/i) || text.match(/([0-9,]+)\s*Reach/i);
    if (reachMatch) {
      metrics.reach = this.parseNumber(reachMatch[1]);
    }

    // === ACCOUNTS REACHED TREND % ===
    const accountsReachedChangeMatch = text.match(/Accounts?\s*reached[^0-9]*([+-]?[0-9.]+%)/i) ||
                                        text.match(/([+-][0-9.]+%)\s*.*Accounts?\s*reached/i);
    if (accountsReachedChangeMatch) {
      metrics.accountsReachedChange = accountsReachedChangeMatch[1];
    }

    // === ENGAGEMENT RATE (if shown on screen) ===
    const engagementRateMatch = text.match(/Engagement\s*(?:rate)?\s*[\n\s]*([0-9.]+)%/i) ||
                                text.match(/([0-9.]+)%\s*Engagement/i);
    if (engagementRateMatch) {
      metrics.engagementRatePercent = parseFloat(engagementRateMatch[1]);
    }

    // === CONTENT BREAKDOWN (Posts, Stories, Reels) ===
    // Only parse from the "By content type" section so we don't grab "Posts" from "Featured posts" or other UI.
    // Allow flexible percentages: 74.5%, 74,5%, 74 5% (OCR spacing)
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

    // === TOP CITIES ===
    const topCities = this.extractCities(text);
    if (topCities.length > 0) {
      metrics.topCities = topCities;
    }

    // === AGE RANGES ===
    const ageRanges = this.extractAgeRanges(text);
    if (ageRanges.length > 0) {
      metrics.ageRanges = ageRanges;
    }

    // === GENDER === (scope to audience section; allow Male/Female, comma decimal, OCR variants)
    const genderSection = this.getGenderSection(text);
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
    const overallGrowthMatch = text.match(/Overall\s*[\n\s]*([+-]?[0-9,]+)/i) ||
                               text.match(/Growth\s*[\n\s]*Overall\s*[\n\s]*([+-]?[0-9,]+)/i);
    const followsMatch = text.match(/Follows?\s*[\n\s]*([0-9,]+)/i);
    const unfollowsMatch = text.match(/Unfollows?\s*[\n\s]*([0-9,]+)/i);
    
    if (overallGrowthMatch || followsMatch || unfollowsMatch) {
      metrics.growth = {};
      if (overallGrowthMatch) {
        metrics.growth.overall = this.parseNumber(overallGrowthMatch[1]);
      }
      if (followsMatch) {
        metrics.growth.follows = this.parseNumber(followsMatch[1]);
      }
      if (unfollowsMatch) {
        metrics.growth.unfollows = this.parseNumber(unfollowsMatch[1]);
      }
    }

    // === FOLLOWER CHANGE PERCENTAGE ===
    const followerChangeMatch = text.match(/Followers?\s*[^0-9]*([+-]?[0-9.]+)%\s*vs/i) ||
                                text.match(/([+-][0-9.]+%)\s*vs/i);
    if (followerChangeMatch) {
      metrics.followerChangePercent = parseFloat(followerChangeMatch[1]);
    }

    // === DATE RANGE (e.g. "Jan 1 - Jan 30" or "Last 30 days" on Insights screens) ===
    const parsedDateRange = this.extractDateRange(text);
    if (parsedDateRange) {
      metrics.dateRange = parsedDateRange;
    }

    return metrics;
  }

  /**
   * Extract report date range from OCR text (Instagram Insights: "Jan 1 - Jan 30", "Last 30 days", etc.)
   * @param {string} text - Raw OCR text
   * @returns {string|null} Display string for the date range, or null
   */
  extractDateRange(text) {
    const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    // Explicit range: "Jan 1 - Jan 30" or "Jan 1 - Jan 30, 2025" or "January 1 - January 30, 2025"
    const monthAbbrev = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
    const monthFull = 'January|February|March|April|May|June|July|August|September|October|November|December';
    const explicitRange = normalized.match(
      new RegExp(`\\b(${monthAbbrev}|${monthFull})[a-z]*\\s+\\d{1,2}\\s*[-–]\\s*(${monthAbbrev}|${monthFull})[a-z]*\\s+\\d{1,2}(?:\\s*,\\s*\\d{4})?`, 'i')
    );
    if (explicitRange) {
      return explicitRange[0].trim();
    }
    // "Last N days" → compute range from today for display
    const lastDaysMatch = normalized.match(/\bLast\s+(\d+)\s+days?\b/i);
    if (lastDaysMatch) {
      const n = parseInt(lastDaysMatch[1], 10);
      if (n >= 1 && n <= 365) {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - n + 1);
        const fmt = (d) => {
          const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
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

  /**
   * Get the section of text that likely contains gender breakdown (Men/Women %)
   * so we don't match "Men" from other UI (e.g. "Top locations").
   */
  getGenderSection(text) {
    const low = text.toLowerCase();
    const genderIdx = low.indexOf('gender');
    const audienceIdx = low.indexOf('audience');
    const start = genderIdx >= 0 ? (audienceIdx >= 0 ? Math.min(genderIdx, audienceIdx) : genderIdx)
      : audienceIdx >= 0 ? audienceIdx : 0;
    return text.slice(start, start + 500);
  }

  /**
   * Escape special regex characters in a string
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get the section of text that contains "Top locations" / "Cities" so we only match there.
   */
  getLocationsSection(text) {
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
    // End section at "Age range" or "Gender" so we don't pull in Reels/Posts/age data
    const endMarkers = ['age range', 'gender', 'by content type'];
    for (const marker of endMarkers) {
      const idx = chunk.toLowerCase().indexOf(marker);
      if (idx > 80) chunk = chunk.slice(0, idx);
    }
    return chunk;
  }

  /**
   * Extract city data from text (scope to locations section; allow comma decimal; fallback for any "Name %").
   */
  extractCities(text) {
    const section = this.getLocationsSection(text);
    const cities = [];
    const seen = new Set();

    // Known city names (longer names first so "New York" matches before "York")
    const cityPatterns = [
      'Los Angeles', 'San Francisco', 'New York', 'Quebec City',
      'Calgary', 'Vancouver', 'Toronto', 'Montreal', 'Edmonton', 'Ottawa',
      'Burnaby', 'Surrey', 'Richmond', 'Victoria', 'Winnipeg', 'Halifax',
      'Chicago', 'Houston', 'Miami', 'Seattle', 'Denver', 'Phoenix', 'Dallas', 'Austin',
      'London', 'Paris', 'Sydney', 'Melbourne', 'Dubai', 'Singapore',
      'Mississauga', 'Brampton', 'Hamilton', 'Laval', 'Nashville', 'Boston', 'Atlanta',
      'Las Vegas', 'San Diego', 'Philadelphia', 'Washington', 'Portland'
    ];

    const pctRegex = /([0-9]+(?:[.,][0-9]+)?)\s*%/;
    for (const city of cityPatterns) {
      const escaped = this.escapeRegex(city);
      const regex = new RegExp(`(?:^|[\\s\\n])${escaped}[\\s\\n]+([0-9]+(?:[.,][0-9]+)?)\\s*%`, 'gi');
      let match;
      while ((match = regex.exec(section)) !== null) {
        const pct = parseFloat(match[1].replace(/,/g, '.'));
        const key = `${city.toLowerCase()}-${pct}`;
        if (!seen.has(key) && pct <= 100) {
          seen.add(key);
          cities.push({ name: city, percentage: pct });
        }
      }
    }

    // Fallback: in locations section, any "Name(s) number%" (line-start or word-boundary so OCR without newlines still matches)
    const uiWords = new Set(['all', 'followers', 'non-followers', 'nonfollowers', 'posts', 'cities', 'countries', 'top', 'locations', 'stories', 'reels', 'by', 'content', 'type', 'where', 'your', 'are', 'from', 'indie', 'men', 'women']);
    const nonCitySubstrings = ['indie', 'reels', 'posts', 'stories', ' li']; // names containing these are not cities
    const lineStartRe = /(?:^|\n)\s*([A-Za-z][A-Za-z\s\-']{1,40}?)\s+([0-9]+(?:[.,][0-9]+)?)\s*%/g;
    let genMatch;
    const rejectName = (n, nLower) => {
      if (n.length < 2 || n.length > 35) return true;
      if (uiWords.has(nLower) || /\d/.test(n)) return true;
      if (nLower.endsWith(' -') || n.endsWith(' -')) return true;
      if (nonCitySubstrings.some(s => nLower.includes(s))) return true;
      return false;
    };
    while ((genMatch = lineStartRe.exec(section)) !== null) {
      const name = genMatch[1].trim().replace(/\s+/g, ' ').replace(/\s*-\s*$/, '');
      const nameLower = name.toLowerCase();
      if (rejectName(name, nameLower)) continue;
      const pct = parseFloat(genMatch[2].replace(/,/g, '.'));
      if (pct <= 0 || pct > 100) continue;
      const key = `${nameLower}-${pct}`;
      if (!seen.has(key)) {
        seen.add(key);
        cities.push({ name, percentage: pct });
      }
    }
    // Also match "Name number%" with word boundary (catches "Toronto 15.2% Vancouver 12.1%" on one line)
    const wordBoundRe = /\b([A-Za-z][A-Za-z\s\-']{1,40}?)\s+([0-9]+(?:[.,][0-9]+)?)\s*%/g;
    while ((genMatch = wordBoundRe.exec(section)) !== null) {
      const name = genMatch[1].trim().replace(/\s+/g, ' ').replace(/\s*-\s*$/, '');
      const nameLower = name.toLowerCase();
      if (rejectName(name, nameLower)) continue;
      const pct = parseFloat(genMatch[2].replace(/,/g, '.'));
      if (pct <= 0 || pct > 100) continue;
      const key = `${nameLower}-${pct}`;
      if (!seen.has(key)) {
        seen.add(key);
        cities.push({ name, percentage: pct });
      }
    }

    cities.sort((a, b) => b.percentage - a.percentage);
    return cities;
  }

  /**
   * Extract age range data from text (flexible for OCR: en-dash, spacing, newlines)
   */
  extractAgeRanges(text) {
    const ageRanges = [];
    // Hyphen, en-dash, em-dash, or space between numbers; allow newlines before %
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

    ageRanges.sort((a, b) => b.percentage - a.percentage);
    return ageRanges;
  }

  /**
   * Parse a number string (handles commas)
   */
  parseNumber(str) {
    if (!str) return 0;
    // Remove commas and parse
    const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Process multiple screenshots in parallel with compression
   * @param {Array} images - Array of image Files, Blobs, or URLs
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Merged metrics from all screenshots
   */
  async processScreenshots(images, onProgress = null) {
    const startTime = Date.now();
    console.log(`🚀 Starting OCR for ${images.length} images with parallel processing...`);
    
    // Initialize workers first
    if (onProgress) {
      onProgress(0, images.length, 'Initializing OCR engine...');
    }
    await this.initialize();
    
    // Compress images first (in parallel)
    if (onProgress) {
      onProgress(0, images.length, 'Optimizing images...');
    }
    
    const compressedImages = await Promise.all(
      images.map(async (img) => {
        if (img instanceof File || img instanceof Blob) {
          return this.compressImage(img);
        }
        return img; // URLs can't be compressed client-side easily
      })
    );
    
    const allMetrics = {};
    let completed = 0;
    
    // Process images in batches using available workers
    const processImage = async (image, index) => {
      try {
        const text = await this.extractTextWithWorker(image, index);
        console.log(`📄 Screenshot ${index + 1} processed (${text.length} chars)`);
        
        const metrics = this.parseInstagramMetrics(text);
        console.log(`📊 Screenshot ${index + 1} metrics:`, Object.keys(metrics).length, 'fields found');
        
        return metrics;
      } catch (error) {
        console.error(`Error processing screenshot ${index + 1}:`, error);
        return {};
      }
    };

    // Process in parallel batches
    const batchSize = this.workerCount;
    for (let i = 0; i < compressedImages.length; i += batchSize) {
      const batch = compressedImages.slice(i, i + batchSize);
      const batchPromises = batch.map((img, batchIndex) => 
        processImage(img, i + batchIndex)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Merge results from this batch
      for (const metrics of batchResults) {
        this.mergeMetrics(allMetrics, metrics);
        completed++;
        if (onProgress) {
          onProgress(completed, images.length, `Processed ${completed} of ${images.length} screenshots...`);
        }
      }
    }
    
    // Clean up arrays (remove duplicates, sort)
    if (allMetrics.topCities) {
      allMetrics.topCities = this.deduplicateByName(allMetrics.topCities);
    }
    if (allMetrics.ageRanges) {
      allMetrics.ageRanges = this.deduplicateByRange(allMetrics.ageRanges);
    }
    if (allMetrics.contentBreakdown) {
      allMetrics.contentBreakdown = this.deduplicateByType(allMetrics.contentBreakdown);
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ OCR complete in ${totalTime}s - Found ${Object.keys(allMetrics).length} metric types`);
    
    return allMetrics;
  }

  /**
   * Merge metrics from multiple screenshots
   */
  mergeMetrics(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        // Concatenate arrays
        target[key] = [...(target[key] || []), ...value];
      } else if (typeof value === 'object' && value !== null) {
        // Merge objects
        target[key] = { ...(target[key] || {}), ...value };
      } else {
        // Override single values (keep the value if it seems more complete)
        if (target[key] === undefined || value > target[key]) {
          target[key] = value;
        }
      }
    }
  }

  deduplicateByName(arr) {
    const seen = new Map();
    for (const item of arr) {
      if (!seen.has(item.name) || item.percentage > seen.get(item.name).percentage) {
        seen.set(item.name, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.percentage - a.percentage);
  }

  deduplicateByRange(arr) {
    const seen = new Map();
    for (const item of arr) {
      if (!seen.has(item.range) || item.percentage > seen.get(item.range).percentage) {
        seen.set(item.range, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.percentage - a.percentage);
  }

  deduplicateByType(arr) {
    const seen = new Map();
    for (const item of arr) {
      if (!seen.has(item.type) || item.percentage > seen.get(item.type).percentage) {
        seen.set(item.type, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.percentage - a.percentage);
  }
}

// Export singleton instance
export const instagramOCRService = new InstagramOCRService();
export default instagramOCRService;
