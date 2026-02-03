/**
 * Cloud Function: Sync Canva Template
 * 
 * Receives template structure from the Canva App and stores it in Firestore.
 * This function should be added to your main functions/index.js file.
 * 
 * Usage:
 *   Copy the export at the bottom of this file to functions/index.js
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Sync Canva Template
 * 
 * Receives design structure from Canva App and stores in Firestore.
 * 
 * Expected payload:
 * {
 *   client_name: string,
 *   template_name: string,
 *   template_type: string,
 *   canva_design_id: string,
 *   elements: DesignElement[],
 *   placeholders: string[],
 *   synced_at: string (ISO timestamp)
 * }
 */
const syncCanvaTemplateHandler = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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

    console.log(`📥 Syncing template: ${template_name} for ${client_name}`);

    // Look up client by name (or create a reference)
    let client_id = null;
    const clientsSnapshot = await db.collection('clients')
      .where('clientName', '==', client_name)
      .limit(1)
      .get();

    if (!clientsSnapshot.empty) {
      client_id = clientsSnapshot.docs[0].id;
    } else {
      // Try lowercase match
      const clientsSnapshot2 = await db.collection('clients')
        .where('clientName', '>=', client_name.toLowerCase())
        .where('clientName', '<=', client_name.toLowerCase() + '\uf8ff')
        .limit(1)
        .get();
      
      if (!clientsSnapshot2.empty) {
        client_id = clientsSnapshot2.docs[0].id;
      }
    }

    // Determine dimensions based on template type
    const dimensions = getDimensionsForType(template_type);

    // Create template document
    const templateData = {
      client_id: client_id,
      client_name: client_name,
      template_name: template_name,
      template_type: template_type,
      canva_design_id: canva_design_id || null,
      dimensions: dimensions,
      elements: elements || [],
      placeholders: placeholders || [],
      version: 1,
      is_active: true,
      synced_at: admin.firestore.Timestamp.fromDate(new Date(synced_at)),
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
      
      console.log(`✅ Updated existing template: ${templateId}`);
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
    console.error('❌ Sync error:', error);
    res.status(500).json({
      error: `Sync failed: ${error.message}`,
    });
  }
});

/**
 * Get standard dimensions for template type
 */
function getDimensionsForType(templateType) {
  const dimensionMap = {
    'instagram_feed': { width: 1080, height: 1080 },
    'instagram_story': { width: 1080, height: 1920 },
    'instagram_reel_cover': { width: 1080, height: 1920 },
    'facebook_post': { width: 1200, height: 630 },
    'facebook_cover': { width: 820, height: 312 },
    'linkedin_post': { width: 1200, height: 627 },
    'twitter_post': { width: 1600, height: 900 },
  };
  
  return dimensionMap[templateType] || { width: 1080, height: 1080 };
}

// Export for Firebase Functions
module.exports = { syncCanvaTemplate: syncCanvaTemplateHandler };

// =============================================================================
// COPY THIS TO YOUR functions/index.js:
// =============================================================================
/*

// At the top of functions/index.js, add:
const { syncCanvaTemplate } = require('./syncCanvaTemplate');

// Or inline the handler:
exports.syncCanvaTemplate = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  // ... paste handler code here
});

*/
