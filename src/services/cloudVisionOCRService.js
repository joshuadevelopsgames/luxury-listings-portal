/**
 * Cloud Vision OCR Service
 * Uses Firebase Cloud Function + Google Cloud Vision API for fast OCR
 * Much faster than browser-based Tesseract.js (~5-10 seconds total vs 90+ seconds)
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';

class CloudVisionOCRService {
  constructor() {
    this.functions = null;
    this.processScreenshotsFunction = null;
  }

  /**
   * Initialize Firebase Functions
   */
  initialize() {
    if (!this.functions) {
      this.functions = getFunctions(app);
      this.processScreenshotsFunction = httpsCallable(
        this.functions, 
        'processInstagramScreenshots',
        { timeout: 120000 } // 2 minute timeout
      );
    }
  }

  /**
   * Convert a File/Blob to base64 string
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Process screenshots using Cloud Vision API
   * @param {Array} images - Array of { localFile, url } objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Extracted metrics
   */
  async processScreenshots(images, onProgress = null) {
    this.initialize();

    const startTime = Date.now();
    console.log(`🚀 Starting Cloud Vision OCR for ${images.length} images...`);

    if (onProgress) {
      onProgress(0, images.length, 'Preparing images...');
    }

    try {
      // Convert images to the format expected by the Cloud Function
      const imageData = await Promise.all(
        images.map(async (img, index) => {
          if (img.localFile || img instanceof File || img instanceof Blob) {
            // Convert local file to base64 for upload
            const file = img.localFile || img;
            const base64 = await this.fileToBase64(file);
            return { base64, index };
          } else if (typeof img === 'string' || img.url) {
            // Use URL directly (for existing reports)
            return { url: img.url || img, index };
          }
          return { url: img, index };
        })
      );

      if (onProgress) {
        onProgress(0, images.length, 'Processing with Cloud Vision...');
      }

      // Call Cloud Function
      const result = await this.processScreenshotsFunction({ images: imageData });

      if (onProgress) {
        onProgress(images.length, images.length, 'Complete!');
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Cloud Vision OCR complete in ${totalTime}s`);
      console.log(`📊 Found metrics:`, Object.keys(result.data.metrics || {}).length, 'fields');

      return result.data.metrics || {};
    } catch (error) {
      console.error('Cloud Vision OCR error:', error);
      
      // If Cloud Function fails, fall back to providing empty metrics
      // User can still enter manually
      throw new Error(`OCR processing failed: ${error.message}. You can still enter metrics manually.`);
    }
  }

  /**
   * No cleanup needed for Cloud Functions
   */
  async terminate() {
    // No-op - Cloud Functions don't need client-side cleanup
  }
}

export const cloudVisionOCRService = new CloudVisionOCRService();
export default cloudVisionOCRService;
