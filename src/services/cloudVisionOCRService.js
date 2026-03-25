/**
 * Cloud Vision OCR Service
 * Uses Supabase Edge Function (extract-instagram-metrics) for fast OCR
 * Replaces Firebase Cloud Function + Google Cloud Vision API
 */

import { invokeEdgeFunction } from './edgeFunctionService';

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
      // Convert images to the format expected by the Edge Function
      const imageData = await Promise.all(
        images.map(async (img, index) => {
          if (img.localFile || img instanceof File || img instanceof Blob) {
            const file = img.localFile || img;
            const base64 = await this.fileToBase64(file, true);
            return { base64, index };
          } else if (typeof img === 'string' || img.url) {
            return { url: img.url || img, index };
          }
          return { url: img, index };
        })
      );

      if (onProgress) {
        onProgress(0, images.length, 'Processing with AI Vision...');
      }

      // Call Supabase Edge Function
      const result = await invokeEdgeFunction('extract-instagram-metrics', { images: imageData });

      if (onProgress) {
        onProgress(images.length, images.length, 'Complete!');
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ AI OCR complete in ${totalTime}s`);
      console.log(`📊 Found metrics:`, Object.keys(result.metrics || {}).length, 'fields');

      return result.metrics || {};
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
