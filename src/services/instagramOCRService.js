/**
 * Instagram OCR Service
 * Extracts analytics data from Instagram Insights screenshots using Tesseract.js
 */

import Tesseract from 'tesseract.js';

class InstagramOCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the Tesseract worker
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔍 Initializing OCR worker...');
    this.worker = await Tesseract.createWorker('eng');
    this.isInitialized = true;
    console.log('✅ OCR worker initialized');
  }

  /**
   * Terminate the worker when done
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Extract text from an image
   * @param {string|File|Blob} image - Image URL, File, or Blob
   * @returns {Promise<string>} Extracted text
   */
  async extractText(image) {
    await this.initialize();
    
    console.log('🔍 Extracting text from image...');
    const result = await this.worker.recognize(image);
    console.log('✅ Text extraction complete');
    
    return result.data.text;
  }

  /**
   * Extract text from multiple images
   * @param {Array} images - Array of image URLs, Files, or Blobs
   * @param {Function} onProgress - Progress callback (index, total)
   * @returns {Promise<string[]>} Array of extracted texts
   */
  async extractTextFromMultiple(images, onProgress = null) {
    const texts = [];
    
    for (let i = 0; i < images.length; i++) {
      const text = await this.extractText(images[i]);
      texts.push(text);
      
      if (onProgress) {
        onProgress(i + 1, images.length);
      }
    }
    
    return texts;
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

    // === FOLLOWER PERCENTAGE (from views/interactions) ===
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
      metrics.interactions = this.parseNumber(interactionsMatch[1]);
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

    // === CONTENT BREAKDOWN (Posts, Stories, Reels) ===
    const contentBreakdown = [];
    
    const postsMatch = text.match(/Posts?\s*[\n\s]*([0-9.]+)%/i);
    if (postsMatch) {
      contentBreakdown.push({ type: 'Posts', percentage: parseFloat(postsMatch[1]) });
    }
    
    const storiesMatch = text.match(/Stories?\s*[\n\s]*([0-9.]+)%/i);
    if (storiesMatch) {
      contentBreakdown.push({ type: 'Stories', percentage: parseFloat(storiesMatch[1]) });
    }
    
    const reelsMatch = text.match(/Reels?\s*[\n\s]*([0-9.]+)%/i);
    if (reelsMatch) {
      contentBreakdown.push({ type: 'Reels', percentage: parseFloat(reelsMatch[1]) });
    }
    
    if (contentBreakdown.length > 0) {
      // Sort by percentage descending
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

    return metrics;
  }

  /**
   * Extract city data from text
   */
  extractCities(text) {
    const cities = [];
    
    // Common city names that might appear in Instagram analytics
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
      if (match) {
        cities.push({
          name: city,
          percentage: parseFloat(match[1])
        });
      }
    }
    
    // Sort by percentage descending
    cities.sort((a, b) => b.percentage - a.percentage);
    
    return cities;
  }

  /**
   * Extract age range data from text
   */
  extractAgeRanges(text) {
    const ageRanges = [];
    
    // Common age range patterns
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
      if (match) {
        ageRanges.push({
          range,
          percentage: parseFloat(match[1])
        });
      }
    }
    
    // Sort by percentage descending
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
   * Process multiple screenshots and merge the extracted data
   * @param {Array} imageUrls - Array of image URLs
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Merged metrics from all screenshots
   */
  async processScreenshots(imageUrls, onProgress = null) {
    const allMetrics = {};
    
    for (let i = 0; i < imageUrls.length; i++) {
      if (onProgress) {
        onProgress(i + 1, imageUrls.length, 'Extracting text...');
      }
      
      try {
        const text = await this.extractText(imageUrls[i]);
        console.log(`📄 Screenshot ${i + 1} raw text:`, text.substring(0, 500) + '...');
        
        const metrics = this.parseInstagramMetrics(text);
        console.log(`📊 Screenshot ${i + 1} parsed metrics:`, metrics);
        
        // Merge metrics (later values override earlier ones for single values)
        // Arrays are concatenated and deduplicated
        this.mergeMetrics(allMetrics, metrics);
      } catch (error) {
        console.error(`Error processing screenshot ${i + 1}:`, error);
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
