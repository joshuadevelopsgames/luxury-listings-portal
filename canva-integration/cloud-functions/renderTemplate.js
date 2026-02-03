/**
 * Cloud Function: Render Template
 * 
 * Generates a social media image by filling a template with property data.
 * Uses Puppeteer to render HTML/CSS templates to PNG.
 * 
 * NOTE: Puppeteer requires additional setup for Firebase Functions.
 * See: https://firebase.google.com/docs/functions/puppeteer
 * 
 * You may need to:
 * 1. Use firebase-functions gen 2
 * 2. Increase memory allocation (1GB+)
 * 3. Increase timeout (60s+)
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Note: Puppeteer import - uncomment when ready to deploy
// const puppeteer = require('puppeteer');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Render Template to Image
 * 
 * Input:
 * {
 *   template_id: string,          // Firestore template document ID
 *   property_data: {              // Data to fill placeholders
 *     address: string,
 *     price: string,
 *     beds: string,
 *     baths: string,
 *     sqft: string,
 *     heroImage: string,          // URL
 *     logoUrl: string,            // URL
 *     ...
 *   },
 *   output_format?: 'png' | 'jpg', // Default: 'png'
 * }
 * 
 * Output:
 * {
 *   success: boolean,
 *   image_url: string,            // Firebase Storage URL
 *   generated_design_id: string,  // Firestore record ID
 * }
 */
const renderTemplateHandler = onCall({
  cors: true,
  maxInstances: 5,
  timeoutSeconds: 120,
  memory: '1GiB',
}, async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { template_id, property_data, output_format = 'png' } = request.data;

  if (!template_id) {
    throw new HttpsError('invalid-argument', 'template_id is required');
  }

  if (!property_data) {
    throw new HttpsError('invalid-argument', 'property_data is required');
  }

  try {
    console.log(`🎨 Rendering template: ${template_id}`);

    // 1. Load template from Firestore
    const templateDoc = await db.collection('client_templates').doc(template_id).get();
    
    if (!templateDoc.exists) {
      throw new HttpsError('not-found', `Template ${template_id} not found`);
    }

    const template = templateDoc.data();
    console.log(`📄 Template loaded: ${template.template_name}`);

    // 2. Generate HTML from template
    const html = generateTemplateHTML(template, property_data);

    // 3. Render to image using Puppeteer
    const imageBuffer = await renderHTMLToImage(
      html, 
      template.dimensions, 
      output_format
    );

    // 4. Upload to Firebase Storage
    const fileName = `generated/${template_id}_${Date.now()}.${output_format}`;
    const bucket = storage.bucket();
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: {
        contentType: output_format === 'jpg' ? 'image/jpeg' : 'image/png',
      },
    });

    // Make file publicly accessible
    await file.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // 5. Save record of generated design
    const generatedDoc = await db.collection('generated_designs').add({
      template_id: template_id,
      client_id: template.client_id,
      property_data: property_data,
      output_url: imageUrl,
      output_format: output_format,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: request.auth.token.email,
    });

    console.log(`✅ Design generated: ${generatedDoc.id}`);

    return {
      success: true,
      image_url: imageUrl,
      generated_design_id: generatedDoc.id,
    };

  } catch (error) {
    console.error('❌ Render error:', error);
    throw new HttpsError('internal', `Render failed: ${error.message}`);
  }
});

/**
 * Generate HTML from template structure
 */
function generateTemplateHTML(template, propertyData) {
  const { dimensions, elements } = template;

  // Build CSS for each element
  let elementsHTML = '';
  
  for (const element of elements || []) {
    let content = '';
    let styles = `
      position: absolute;
      left: ${element.position?.x || 0}px;
      top: ${element.position?.y || 0}px;
      width: ${element.size?.width || 100}px;
      height: ${element.size?.height || 100}px;
    `;

    if (element.type === 'TEXT') {
      // Replace placeholder with actual data
      content = element.content || '';
      if (element.placeholder && propertyData[element.placeholder]) {
        content = propertyData[element.placeholder];
      }
      // Also replace inline {{placeholders}}
      content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return propertyData[key] || match;
      });

      if (element.font) {
        styles += `
          font-family: '${element.font.family}', sans-serif;
          font-size: ${element.font.size}px;
          font-weight: ${element.font.weight};
        `;
      }
      if (element.color) {
        styles += `color: ${element.color};`;
      }

      elementsHTML += `<div style="${styles}">${content}</div>`;
    }
    
    else if (element.type === 'IMAGE') {
      let src = element.src || '';
      if (element.placeholder && propertyData[element.placeholder]) {
        src = propertyData[element.placeholder];
      }

      styles += `object-fit: ${element.fit || 'cover'};`;
      elementsHTML += `<img src="${src}" style="${styles}" />`;
    }
    
    else if (element.type === 'SHAPE') {
      if (element.fill) {
        styles += `background: ${element.fill};`;
      }
      if (element.borderRadius) {
        styles += `border-radius: ${element.borderRadius}px;`;
      }
      elementsHTML += `<div style="${styles}"></div>`;
    }
  }

  // Build full HTML document
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${dimensions?.width || 1080}px;
      height: ${dimensions?.height || 1080}px;
      position: relative;
      overflow: hidden;
      background: #ffffff;
    }
    img {
      display: block;
    }
  </style>
</head>
<body>
  ${elementsHTML}
</body>
</html>
  `.trim();
}

/**
 * Render HTML to image using Puppeteer
 */
async function renderHTMLToImage(html, dimensions, format) {
  // IMPORTANT: Puppeteer requires special setup for Firebase Functions
  // For local development, you can test with a simpler approach
  
  // Uncomment this when Puppeteer is properly configured:
  /*
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: dimensions?.width || 1080,
      height: dimensions?.height || 1080,
    });

    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000,
    });

    // Wait for fonts and images to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 500));

    const imageBuffer = await page.screenshot({
      type: format === 'jpg' ? 'jpeg' : 'png',
      quality: format === 'jpg' ? 90 : undefined,
    });

    return imageBuffer;
  } finally {
    await browser.close();
  }
  */

  // Placeholder for development - returns a simple buffer
  // Remove this when Puppeteer is configured
  throw new Error(
    'Puppeteer not configured. See docs/SETUP.md for instructions.'
  );
}

// Export for Firebase Functions
module.exports = { renderTemplate: renderTemplateHandler };
