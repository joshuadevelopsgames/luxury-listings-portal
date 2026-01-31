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
